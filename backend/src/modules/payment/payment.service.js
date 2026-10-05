// ============================================
// PAYMENT SERVICE — Business Logic (Paytm)
// ============================================
// TTD alignment:
//   §12 — settlePayment() is the ONLY money-mover
//   §13 — REVIEW_REQUIRED written OUTSIDE rollback tx
//   §14 — ledger invariant preserved
//   §20 — idempotency per user, same key+body → replay
//   §21 — all global invariants preserved (except §6, §7, §10 which are N/A for Paytm)
//   §22 — atomic wallet update; unique constraints enforced by schema
//
//   D20 — verified provider success wins over CANCELLED/EXPIRED/FAILED
//   D21 — PAID is terminal
//   D22 — create timeout: N/A (no create API call — form is built locally)
//   D23 — no capture step; PENDING_VERIFICATION reserved for "callback arrived,
//          awaiting webhook confirmation"
//   D24 — no Bearer token on webhook; checksum is auth
//   D25 — WebhookEvent inserted inside settlement tx
//   D26 — REVIEW_REQUIRED outside rollback tx
// ============================================
const prisma = require('../../config/prisma');
const paytm  = require('../../config/paytm');
const { logSecurityEvent } = require('../../utils/audit');

const paymentService = {

    // ============================================
    // CREATE ORDER (TTD §5)
    // ============================================
    async createOrder(userId, { amount }, idempotencyKey, req = {}) {

        // ---------- amount range check ----------
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum < paytm.MIN_INR) {
            const error = new Error(`Amount must be at least ₹${paytm.MIN_INR}.`);
            error.code = 'AMOUNT_OUT_OF_RANGE';
            throw error;
        }
        if (amountNum > paytm.MAX_INR) {
            const error = new Error(`Amount must be at most ₹${paytm.MAX_INR}.`);
            error.code = 'AMOUNT_OUT_OF_RANGE';
            throw error;
        }

        // ---------- idempotency replay (TTD §20) ----------
        const existing = await prisma.paymentOrder.findUnique({
            where: { userId_idempotencyKey: { userId, idempotencyKey } }
        });
        if (existing) {
            if (parseFloat(existing.amount) === amountNum) {
                // same key + same body → replay (regenerate Paytm form so
                // the user can re-submit if they closed the tab)
                const form = await paymentService._buildPaytmForm(existing, userId);
                return { replayed: true, order: existing, form };
            }
            const error = new Error('Idempotency key reused with different request.');
            error.code = 'IDEMPOTENCY_KEY_MISMATCH';
            throw error;
        }

        // ---------- wallet must exist (TTD §5 CO-15) ----------
        const wallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!wallet) {
            const error = new Error('Wallet not found.');
            error.code = 'WALLET_NOT_FOUND';
            throw error;
        }

        // ---------- create local PaymentOrder ----------
        // paytmOrderId is NOT NULL in schema, so we generate it inline.
        // We compute it here so we can create the row with the real value
        // in one write — no temporary placeholder.
        const tempId = `pending_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const localOrder = await prisma.paymentOrder.create({
            data: {
                userId,
                walletId: wallet.id,
                amount,
                currency: 'INR',
                idempotencyKey,
                paytmOrderId: tempId,
                status: 'INITIATED'
            }
        });

        // now that we have the DB id, generate the real paytmOrderId
        const paytmOrderId = paytm.generatePaytmOrderId(localOrder.id);

        const updated = await prisma.paymentOrder.update({
            where: { id: localOrder.id },
            data: {
                paytmOrderId,
                status: 'CREATED'
            }
        });

        const form = await paymentService._buildPaytmForm(updated, userId);

        await logSecurityEvent(
            userId,
            'PAYMENT_ORDER_CREATED',
            `Paytm order po_${updated.id} created for ₹${amount}`,
            req.ip || 'unknown',
            req.headers?.['user-agent'] || 'unknown'
        );

        return { replayed: false, order: updated, form };
    },

    // ============================================
    // BUILD PAYTM FORM (params + checksum)
    // ============================================
    async _buildPaytmForm(order, userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, mobile: true }
        });

        const params = paytm.buildPaymentParams({
            orderId: order.paytmOrderId,
            amount:  order.amount,
            custId:  userId,
            email:   user?.email,
            mobile:  user?.mobile
        });

        const checksum = await paytm.generateChecksum(params);

        return {
            action: `${paytm.PAYTM_HOST}/theia/processTransaction`,
            params,
            checksum
        };
    },

    // ============================================
    // SETTLE PAYMENT — Only money mover (TTD §12)
    // ============================================
    // Called from BOTH /paytm/callback and /paytm/webhook.
    // Idempotent — safe to call multiple times for the same order.
    //
    // D20: succeeds even if local status is CANCELLED / EXPIRED / FAILED
    // D21: PAID is terminal — early-exit if already PAID
    // D26: REVIEW_REQUIRED written OUTSIDE rollback
    // ============================================
    async settlePayment(orderId, paytmResponse, webhookEventId = null) {

        // ---------- minimal sanity ----------
        if (!paytmResponse.TXNID) {
            const error = new Error('Missing TXNID from Paytm.');
            error.code = 'PAYMENT_VERIFICATION_FAILED';
            throw error;
        }

        try {
            return await prisma.$transaction(async (tx) => {

                // conditional update — settle only if not already PAID (D21)
                const updated = await tx.paymentOrder.updateMany({
                    where: { id: orderId, status: { not: 'PAID' } },
                    data: {
                        status: 'PAID',
                        paidAt: new Date(),
                        providerPaidAt: new Date(),
                        paytmTxnId: paytmResponse.TXNID,
                        paytmBankTxnId: paytmResponse.BANKTXNID || null,
                        paytmResponseCode: paytmResponse.RESPCODE || null,
                        paytmResponseMsg: paytmResponse.RESPMSG || null
                    }
                });

                // already settled (concurrent callback/webhook, TTD ST-05..07)
                if (updated.count === 0) {
                    const existing = await tx.paymentOrder.findUnique({
                        where: { id: orderId }
                    });
                    return { alreadySettled: true, order: existing };
                }

                const order = await tx.paymentOrder.findUnique({
                    where: { id: orderId }
                });

                // ---------- verify amount matches stored (TTD §6 CV-07) ----------
                const storedAmount   = parseFloat(order.amount);
                const providerAmount = parseFloat(paytmResponse.TXNAMOUNT);

                if (!isNaN(providerAmount) && providerAmount !== storedAmount) {
                    throw Object.assign(new Error('Amount mismatch.'), {
                        code: 'PAYMENT_VERIFICATION_FAILED',
                        mismatch: true
                    });
                }

                // ---------- insert PaymentTransaction (TTD §12) ----------
                await tx.paymentTransaction.create({
                    data: {
                        paymentOrderId: order.id,
                        paytmTxnId: paytmResponse.TXNID,
                        paytmBankTxnId: paytmResponse.BANKTXNID || null,
                        paytmBankName: paytmResponse.BANKNAME || null,
                        paytmPaymentMode: paytmResponse.PAYMENTMODE || null,
                        checksum: paytmResponse.CHECKSUMHASH || null,
                        status: 'SUCCESS',
                        paidAt: new Date()
                    }
                });

                // ---------- atomic wallet credit (TTD §22) ----------
                await tx.wallet.update({
                    where: { id: order.walletId },
                    data: { balance: { increment: order.amount } }
                });

                // ---------- insert WalletTransaction (TTD §12) ----------
                await tx.walletTransaction.create({
                    data: {
                        walletId: order.walletId,
                        type: 'CREDIT',
                        amount: order.amount,
                        description: `Wallet top-up via Paytm (${paytmResponse.TXNID})`,
                        referenceType: 'PAYMENT',
                        referenceId: order.id
                    }
                });

                // ---------- insert WebhookEvent INSIDE tx (TTD §11) ----------
                if (webhookEventId) {
                    const existingEvent = await tx.webhookEvent.findUnique({
                        where: {
                            provider_eventId: {
                                provider: 'paytm',
                                eventId: webhookEventId
                            }
                        }
                    });
                    if (!existingEvent) {
                        await tx.webhookEvent.create({
                            data: {
                                provider: 'paytm',
                                eventId: webhookEventId,
                                eventType: 'PAYMENT_SUCCESS',
                                payload: paytmResponse
                            }
                        });
                    }
                }

                return { settled: true, order };
            });
        } catch (err) {
            // TTD §13: REVIEW_REQUIRED outside rollback tx
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
    async markFailed(orderId, paytmResponse) {
        const result = await prisma.paymentOrder.updateMany({
            where: { id: orderId, status: { not: 'PAID' } },
            data: {
                status: 'FAILED',
                paytmResponseCode: paytmResponse.RESPCODE || null,
                paytmResponseMsg: paytmResponse.RESPMSG || null
            }
        });
        return result.count > 0;
    },

    // ============================================
    // VERIFY STATUS (TTD §5, used by frontend polling)
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

        return { order: paymentService._formatOrder(order) };
    },

    // ============================================
    // CANCEL ORDER (TTD §8)
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
        // CN-03: already cancelled → idempotent
        if (order.status === 'CANCELLED') {
            return { order: paymentService._formatOrder(order) };
        }
        // CN-01, CN-02: only INITIATED / CREATED can be cancelled
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
    // LIST ORDERS (TTD §16)
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
    // GET SINGLE ORDER (TTD §17)
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

    // TTD §18, §19 — fixed shape, adapted for Paytm
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

    // TTD §18
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