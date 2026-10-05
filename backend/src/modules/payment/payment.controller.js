// ============================================
// PAYMENT CONTROLLER — HTTP Handling (Paytm)
// ============================================
// TTD alignment:
//   §2  — error codes → HTTP statuses
//   §5  — create-order
//   §8  — cancel-order
//   §9  — callback (browser) + webhook (server-to-server)
//   §16 — list orders
//   §17 — get single order
//
//   §7 is N/A — Paytm has no capture step.
//   §10 is N/A — Paytm has no approval webhook.
// ============================================
const paymentService = require('./payment.service');
const paymentWebhook = require('./payment.webhook');
const { HTTP_STATUS } = require('../../config/constants');
const paytm = require('../../config/paytm');
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
                    paytmForm: result.form   // { action, params, checksum }
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
            next(error);
        }
    },

    // ============================================
    // PAYTM CALLBACK — browser redirect after payment
    // ============================================
    // Paytm POSTs the full transaction result to this endpoint, then
    // we redirect the user's browser to the frontend verify page.
    // ============================================
    paytmCallback: async (req, res) => {
        try {
            const body = req.body || {};
            const orderId = body.ORDERID;

            const frontendBase =
                process.env.FRONTEND_BASE_URL || 'http://localhost:5000';

            // verify checksum
            const isValid = await paytm.verifyChecksum(body);
            if (!isValid) {
                return res.redirect(
                    `${frontendBase}/payment/verify-payment.html?orderId=${orderId || ''}&status=failed`
                );
            }

            // find local order
            const order = await prisma.paymentOrder.findUnique({
                where: { paytmOrderId: orderId }
            });
            if (!order) {
                return res.redirect(
                    `${frontendBase}/payment/verify-payment.html?status=notfound`
                );
            }

            // final state
            if (body.STATUS === 'TXN_SUCCESS') {
                try {
                    await paymentService.settlePayment(order.id, body, null);
                } catch (err) {
                    console.error('Callback settlement error:', err.message);
                }
                return res.redirect(
                    `${frontendBase}/payment/verify-payment.html?orderId=po_${order.id}&status=paid`
                );
            }

            // failure
            await paymentService.markFailed(order.id, body);
            return res.redirect(
                `${frontendBase}/payment/verify-payment.html?orderId=po_${order.id}&status=failed`
            );
        } catch (err) {
            console.error('Paytm callback error:', err);
            return res.status(500).send('Callback processing error.');
        }
    },

    // ============================================
    // PAYTM WEBHOOK — server-to-server notification
    // ============================================
    // Thin wrapper that delegates to payment.webhook.js
    // ============================================
    paytmWebhook: async (req, res) => {
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
    // LIST ORDERS (TTD §16)
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
    // GET SINGLE ORDER (TTD §17)
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