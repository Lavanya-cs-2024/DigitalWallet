// ============================================
// PAYMENT CONTROLLER — HTTP Handling (PhonePe)
// ============================================
const paymentService = require('./payment.service');
const paymentWebhook = require('./payment.webhook');
const { HTTP_STATUS } = require('../../config/constants');
const phonepe = require('../../config/phonepe');
const prisma = require('../../config/prisma');

const paymentController = {

    // ============================================
    // CREATE ORDER
    // ============================================
    createOrder: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { amount } = req.body;
            const idempotencyKey = req.headers['idempotency-key'];

            const result = await paymentService.createOrder(
                userId, { amount }, idempotencyKey, req
            );

            const body = {
                success: true,
                data: {
                    order: paymentService._formatOrder(result.order),
                    redirectUrl: result.redirectUrl
                }
            };

            if (result.replayed) {
                return res.status(HTTP_STATUS.OK)
                    .set('Idempotent-Replayed', 'true')
                    .json(body);
            }
            res.status(HTTP_STATUS.CREATED).json(body);
        } catch (error) {
            if (error.code === 'IDEMPOTENCY_KEY_MISMATCH') {
                return res.status(422).json({ error: error.code, message: error.message });
            }
            if (error.code === 'AMOUNT_OUT_OF_RANGE') {
                return res.status(400).json({ error: error.code, message: error.message });
            }
            if (error.code === 'WALLET_NOT_FOUND') {
                return res.status(404).json({ error: error.code, message: error.message });
            }
            if (error.code === 'PAYMENT_PROVIDER_ERROR') {
                return res.status(502).json({ error: error.code, message: error.message });
            }
            next(error);
        }
    },

    // ============================================
    // PHONEPE CALLBACK — user's browser redirects here
    // ============================================
    phonepeCallback: async (req, res) => {
        const frontendBase = 'https://www.digitalwallet.dpdns.org';

        console.log('🔔 [phonepeCallback] GET hit');
        console.log('   query:', JSON.stringify(req.query));
        console.log('   headers:', JSON.stringify({
            referer: req.headers.referer,
            'user-agent': req.headers['user-agent']
        }));

        let targetUrl;

        try {
            const merchantOrderId =
                req.query.merchantOrderId ||
                req.query.orderId ||
                null;

            let order = null;

            if (merchantOrderId) {
                order = await prisma.paymentOrder.findUnique({
                    where: { paytmOrderId: merchantOrderId }
                });

                if (order) {
                    console.log('   matched by merchantOrderId:', `po_${order.id}`);
                }
            }

            // Fallback: newest order in the last 10 minutes
            if (!order) {
                order = await prisma.paymentOrder.findFirst({
                    where: {
                        status: { in: ['CREATED', 'PAID'] },
                        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }
                    },
                    orderBy: { createdAt: 'desc' }
                });
                console.log('   fallback lookup:', order ? `po_${order.id}` : 'none');
            }

            if (order) {
                targetUrl = `${frontendBase}/payment/verify-payment.html?orderId=po_${order.id}&status=pending`;
            } else {
                targetUrl = `${frontendBase}/payment/verify-payment.html?status=notfound`;
            }

            console.log('   ✅ redirecting to:', targetUrl);
            return res.redirect(targetUrl);

        } catch (err) {
            console.error('❌ [phonepeCallback] Error:', err);
            return res.redirect(
                `${frontendBase}/payment/verify-payment.html?status=error`
            );
        }
    },

    // ============================================
    // PHONEPE WEBHOOK — server-to-server notification
    // ============================================
    phonepeWebhook: async (req, res) => {
        return paymentWebhook.handleWebhook(req, res);
    },

    // ============================================
    // CANCEL ORDER
    // ============================================
    cancelOrder: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { orderId } = req.body;
            const result = await paymentService.cancelOrder(userId, orderId);
            res.status(HTTP_STATUS.OK).json({ success: true, data: result.order });
        } catch (error) {
            if (error.code === 'PAYMENT_NOT_FOUND') {
                return res.status(404).json({ error: error.code, message: error.message });
            }
            if (error.code === 'INVALID_PAYMENT_STATE') {
                return res.status(409).json({ error: error.code, message: error.message });
            }
            next(error);
        }
    },

    // ============================================
    // VERIFY STATUS
    // ============================================
    verifyStatus: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { orderId } = req.body;
            const result = await paymentService.verifyStatus(userId, orderId);
            res.status(HTTP_STATUS.OK).json({ success: true, data: result.order });
        } catch (error) {
            if (error.code === 'PAYMENT_NOT_FOUND') {
                return res.status(404).json({ error: error.code, message: error.message });
            }
            if (error.code === 'VALIDATION_ERROR') {
                return res.status(400).json({ error: error.code, message: error.message });
            }
            next(error);
        }
    },

    // ============================================
    // LIST ORDERS
    // ============================================
    getOrders: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const page = req.query.page !== undefined ? parseInt(req.query.page) : 1;
            const limit = req.query.limit !== undefined ? parseInt(req.query.limit) : 10;

            const result = await paymentService.getOrders(userId, { page, limit });
            res.status(HTTP_STATUS.OK).json({ success: true, data: result });
        } catch (error) {
            if (error.code === 'VALIDATION_ERROR') {
                return res.status(400).json({ error: error.code, message: error.message });
            }
            next(error);
        }
    },

    // ============================================
    // GET SINGLE ORDER
    // ============================================
    getOrder: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { id } = req.params;
            const result = await paymentService.getOrder(userId, id);
            res.status(HTTP_STATUS.OK).json({ success: true, data: result });
        } catch (error) {
            if (error.code === 'VALIDATION_ERROR') {
                return res.status(400).json({ error: error.code, message: error.message });
            }
            if (error.code === 'PAYMENT_NOT_FOUND') {
                return res.status(404).json({ error: error.code, message: error.message });
            }
            next(error);
        }
    }
};

module.exports = paymentController;