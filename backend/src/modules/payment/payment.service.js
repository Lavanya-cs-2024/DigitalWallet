// src/modules/payment/payment.service.js
// ============================================
// PAYMENT SERVICE — Business Logic (PhonePe)
// ============================================
const prisma = require('../../config/prisma');
const phonepe = require('../../config/phonepe');
const { StandardCheckoutPayRequest, MetaInfo } = require('@phonepe-pg/pg-sdk-node');
const { logSecurityEvent } = require('../../utils/audit');

const MIN_INR = 10.00;
const MAX_INR = 50000.00;

const paymentService = {

    // ============================================
    // CREATE ORDER
    // ============================================
    async createOrder(userId, { amount }, idempotencyKey, req = {}) {
        // 1. Amount validation
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum < MIN_INR || amountNum > MAX_INR) {
            const error = new Error(`Amount must be between ₹${MIN_INR} and ₹${MAX_INR}.`);
            error.code = 'AMOUNT_OUT_OF_RANGE';
            throw error;
        }

        // 2. Idempotency check
        const existing = await prisma.paymentOrder.findUnique({
            where: { userId_idempotencyKey: { userId, idempotencyKey } }
        });
        if (existing) {
            if (parseFloat(existing.amount) === amountNum) {
                return { replayed: true, order: existing, redirectUrl: null };
            }
            const error = new Error('Idempotency key reused with different request.');
            error.code = 'IDEMPOTENCY_KEY_MISMATCH';
            throw error;
        }

        // 3. Wallet existence check
        const wallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!wallet) {
            const error = new Error('Wallet not found.');
            error.code = 'WALLET_NOT_FOUND';
            throw error;
        }

        // 4. Create local order record (INITIATED)
        const localOrder = await prisma.paymentOrder.create({
            data: {
                userId,
                walletId: wallet.id,
                amount: amount,
                currency: 'INR',
                idempotencyKey,
                paytmOrderId: `pending_${Date.now()}`,
                status: 'INITIATED'
            }
        });

        // 5. Generate PhonePe merchantOrderId and update local order
        const merchantOrderId = phonepe.generateMerchantOrderId(localOrder.id);
        const updatedOrder = await prisma.paymentOrder.update({
            where: { id: localOrder.id },
            data: { paytmOrderId: merchantOrderId, status: 'CREATED' }
        });

        // 6. Build PhonePe payment request (amount in paisa)
        const payRequest = StandardCheckoutPayRequest.builder()
            .merchantOrderId(merchantOrderId)
            .amount(Math.round(amountNum * 100))
            .redirectUrl(phonepe.redirectUrl)
            .metaInfo(MetaInfo.builder().udf1(userId.toString()).build())
            .build();

        // 7. Call PhonePe → get checkout URL
        let response;
        try {
            response = await phonepe.client.pay(payRequest);
        } catch (err) {
            await prisma.paymentOrder.update({
                where: { id: localOrder.id },
                data: { status: 'FAILED' }
            });
            const error = new Error('PhonePe rejected payment creation.');
            error.code = 'PAYMENT_PROVIDER_ERROR';
            throw error;
        }

        if (!response || response.state !== 'PENDING') {
            await prisma.paymentOrder.update({
                where: { id: localOrder.id },
                data: { status: 'FAILED' }
            });
            const error = new Error('PhonePe did not return a valid redirect URL.');
            error.code = 'PAYMENT_PROVIDER_ERROR';
            throw error;
        }

        // 8. Log + return
        await logSecurityEvent(
            userId,
            'PAYMENT_ORDER_CREATED',
            `PhonePe order ${merchantOrderId} created for ₹${amount}`,
            req.ip || 'unknown',
            req.headers?.['user-agent'] || 'unknown'
        );

        return {
            replayed: false,
            order: updatedOrder,
            redirectUrl: response.redirectUrl
        };
    },

    // ============================================
    // SETTLE PAYMENT — Only money mover
    // ============================================
    async settlePayment(orderId, phonepePayload, webhookEventId = null) {
        const {
            orderId: phonepeOrderId,
            state,
            amount: amountInPaisa,
            transactionId
        } = phonepePayload;

        if (!phonepeOrderId || state !== 'COMPLETED') {
            const error = new Error('Payment verification failed: not completed.');
            error.code = 'PAYMENT_VERIFICATION_FAILED';
            throw error;
        }

        try {
            return await prisma.$transaction(async (tx) => {
                // Conditional update — only settle if not already PAID
                const updated = await tx.paymentOrder.updateMany({
                    where: { id: orderId, status: { not: 'PAID' } },
                    data: {
                        status: 'PAID',
                        paidAt: new Date(),
                        providerPaidAt: new Date(),
                        paytmTxnId: phonepeOrderId,
                        paytmBankTxnId: transactionId || null
                    }
                });

                if (updated.count === 0) {
                    const existing = await tx.paymentOrder.findUnique({ where: { id: orderId } });
                    return { alreadySettled: true, order: existing };
                }

                const order = await tx.paymentOrder.findUnique({ where: { id: orderId } });

                // Amount check (PhonePe amount is in paisa)
                const storedAmount = parseFloat(order.amount);
                const providerAmount = parseFloat(amountInPaisa) / 100;

                if (providerAmount !== storedAmount) {
                    throw Object.assign(new Error('Amount mismatch.'), {
                        code: 'PAYMENT_VERIFICATION_FAILED',
                        mismatch: true
                    });
                }

                // Insert PaymentTransaction
                await tx.paymentTransaction.create({
                    data: {
                        paymentOrderId: order.id,
                        paytmTxnId: phonepeOrderId,
                        paytmBankTxnId: transactionId || null,
                        status: 'SUCCESS',
                        paidAt: new Date()
                    }
                });

                // Atomic wallet credit
                await tx.wallet.update({
                    where: { id: order.walletId },
                    data: { balance: { increment: order.amount } }
                });

                // Insert WalletTransaction
                await tx.walletTransaction.create({
                    data: {
                        walletId: order.walletId,
                        type: 'CREDIT',
                        amount: order.amount,
                        description: `Wallet top-up via PhonePe (${phonepeOrderId})`,
                        referenceType: 'PAYMENT',
                        referenceId: order.id
                    }
                });

                // Insert WebhookEvent inside tx
                if (webhookEventId) {
                    const existingEvent = await tx.webhookEvent.findUnique({
                        where: { provider_eventId: { provider: 'phonepe', eventId: webhookEventId } }
                    });
                    if (!existingEvent) {
                        await tx.webhookEvent.create({
                            data: {
                                provider: 'phonepe',
                                eventId: webhookEventId,
                                eventType: 'PG_ORDER_COMPLETED',
                                payload: phonepePayload
                            }
                        });
                    }
                }

                return { settled: true, order };
            });
        } catch (err) {
            if (err.mismatch) {
                await prisma.paymentOrder.update({
                    where: { id: orderId },
                    data: { status: 'REVIEW_REQUIRED' }
                });
            }
            throw err;
        }
    },

    // ============================================
    // MARK FAILED
    // ============================================
    async markFailed(orderId, phonepePayload) {
        const result = await prisma.paymentOrder.updateMany({
            where: { id: orderId, status: { not: 'PAID' } },
            data: {
                status: 'FAILED',
                paytmResponseCode: phonepePayload.errorCode || 'PAYMENT_FAILED',
                paytmResponseMsg: phonepePayload.detailedErrorCode || 'Payment failed'
            }
        });
        return result.count > 0;
    },

    // ============================================
    // VERIFY STATUS — Queries PhonePe for real status
    // ============================================
    async verifyStatus(userId, orderId) {
        const localId = paymentService._extractLocalId(orderId);
        if (isNaN(localId)) {
            const error = new Error('Invalid order ID.');
            error.code = 'VALIDATION_ERROR';
            throw error;
        }

        const order = await prisma.paymentOrder.findFirst({
            where: { id: localId, userId }
        });

        if (!order) {
            const error = new Error('Payment not found.');
            error.code = 'PAYMENT_NOT_FOUND';
            throw error;
        }

        // Already settled → return as-is
        if (order.status === 'PAID') {
            return { order: paymentService._formatOrder(order) };
        }

        // Query PhonePe for latest status
        try {
            console.log('🔍 [verifyStatus] Querying PhonePe for:', order.paytmOrderId);

            // The SDK exposes order status via `client.getOrderStatus(merchantOrderId)`
            const statusResponse = await phonepe.client.getOrderStatus(order.paytmOrderId);

            console.log('📥 [verifyStatus] PhonePe raw response:', JSON.stringify(statusResponse));

            // PhonePe may return { state, orderId, amount, transactionId, ... }
            // or { data: { state, ... } } depending on SDK version
            const data = statusResponse?.data || statusResponse;
            const state = data?.state;
            const paymentDetails = data?.paymentDetails || [];
            const latestPayment = paymentDetails[0] || data;

            if (state === 'COMPLETED') {
                const settlePayload = {
                    orderId: order.paytmOrderId,
                    state: 'COMPLETED',
                    amount: latestPayment?.amount || Math.round(parseFloat(order.amount) * 100),
                    transactionId: latestPayment?.transactionId || data?.transactionId || `PS_${Date.now()}`
                };

                console.log('💰 [verifyStatus] Settling order with:', JSON.stringify(settlePayload));

                await paymentService.settlePayment(order.id, settlePayload, null);

                const refreshed = await prisma.paymentOrder.findUnique({
                    where: { id: order.id }
                });
                return { order: paymentService._formatOrder(refreshed) };
            }

            if (state === 'FAILED') {
                await paymentService.markFailed(order.id, data);
            }

        } catch (err) {
            console.warn('⚠️ [verifyStatus] PhonePe query failed:', err.message);
        }

        // Return the (unchanged) order
        const refreshed = await prisma.paymentOrder.findUnique({ where: { id: order.id } });
        return { order: paymentService._formatOrder(refreshed) };
    },

    // ============================================
    // CANCEL ORDER
    // ============================================
    async cancelOrder(userId, orderId) {
        const localId = paymentService._extractLocalId(orderId);
        const order = await prisma.paymentOrder.findFirst({
            where: { id: localId, userId }
        });
        if (!order) {
            const error = new Error('Payment not found.');
            error.code = 'PAYMENT_NOT_FOUND';
            throw error;
        }
        if (order.status === 'CANCELLED') {
            return { order: paymentService._formatOrder(order) };
        }
        if (!['INITIATED', 'CREATED'].includes(order.status)) {
            const error = new Error(`Cannot cancel order in state ${order.status}.`);
            error.code = 'INVALID_PAYMENT_STATE';
            throw error;
        }

        const updated = await prisma.paymentOrder.update({
            where: { id: order.id },
            data: { status: 'CANCELLED' }
        });
        return { order: paymentService._formatOrder(updated) };
    },

    // ============================================
    // LIST ORDERS
    // ============================================
    async getOrders(userId, { page = 1, limit = 10 } = {}) {
        if (!Number.isInteger(page) || page < 1) {
            const error = new Error('Page must be a positive integer.');
            error.code = 'VALIDATION_ERROR';
            throw error;
        }
        if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
            const error = new Error('Limit must be between 1 and 50.');
            error.code = 'VALIDATION_ERROR';
            throw error;
        }

        const [total, orders] = await Promise.all([
            prisma.paymentOrder.count({ where: { userId } }),
            prisma.paymentOrder.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            })
        ]);

        return {
            page,
            limit,
            total,
            orders: orders.map(o => paymentService._formatOrder(o))
        };
    },

    // ============================================
    // GET SINGLE ORDER
    // ============================================
    async getOrder(userId, orderId) {
        const localId = paymentService._extractLocalId(orderId);
        if (isNaN(localId)) {
            const error = new Error('Invalid order ID.');
            error.code = 'VALIDATION_ERROR';
            throw error;
        }
        const order = await prisma.paymentOrder.findFirst({
            where: { id: localId, userId }
        });
        if (!order) {
            const error = new Error('Payment not found.');
            error.code = 'PAYMENT_NOT_FOUND';
            throw error;
        }
        return paymentService._formatOrder(order);
    },

    // ============================================
    // INTERNAL HELPERS
    // ============================================
    _extractLocalId(orderId) {
        if (typeof orderId !== 'string') return NaN;
        const match = orderId.match(/^po_(\d+)/);
        return match ? parseInt(match[1], 10) : NaN;
    },

    _formatOrder(o) {
        return {
            orderId: `po_${o.id}`,
            status: paymentService._mapStatus(o.status),
            walletAmount: parseFloat(o.amount).toFixed(2),
            walletCurrency: o.currency || 'INR',
            paytmOrderId: o.paytmOrderId,
            paytmTxnId: o.paytmTxnId || null,
            paytmResponseCode: o.paytmResponseCode || null,
            paytmResponseMsg: o.paytmResponseMsg || null,
            createdAt: o.createdAt,
            paidAt: o.providerPaidAt
        };
    },

    _mapStatus(dbStatus) {
        const map = {
            INITIATED: 'PROCESSING',
            CREATED: 'READY',
            PENDING_VERIFICATION: 'PROCESSING',
            PAID: 'PAID',
            FAILED: 'FAILED',
            CANCELLED: 'CANCELLED',
            EXPIRED: 'EXPIRED',
            REVIEW_REQUIRED: 'UNDER_REVIEW'
        };
        return map[dbStatus] || dbStatus;
    }
};

module.exports = paymentService;