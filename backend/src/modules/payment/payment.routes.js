// src/modules/payment/payment.routes.js
const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const paymentConfigController = require('./payment.config.controller');
const { protect } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validation.middleware');
const { rateLimiter } = require('../../middleware/rateLimiter');
const { createOrderSchema, verifyStatusSchema, cancelOrderSchema } = require('./payment.validation');

// Public routes
router.get('/config', paymentConfigController.getPaymentConfig);

// PhonePe Webhook (Public, SHA authenticated)
router.post('/phonepe/webhook', paymentController.phonepeWebhook);
router.post('/phonepe/webhook04', paymentController.phonepeWebhook); // Alias for dashboard typo

// PhonePe Browser Redirect (Public)
router.get('/phonepe/callback', paymentController.phonepeCallback);

// In payment.routes.js, AFTER the POST webhook routes:
router.get('/phonepe/webhook', (req, res) => {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: 'Use POST' });
});

// Protected routes
router.use(protect);
router.post('/create-order', rateLimiter({ windowMs: 60 * 1000, max: 10 }), validate(createOrderSchema), paymentController.createOrder);
router.post('/cancel-order', rateLimiter({ windowMs: 60 * 1000, max: 20 }), validate(cancelOrderSchema), paymentController.cancelOrder);
router.post('/verify-status', rateLimiter({ windowMs: 60 * 1000, max: 10 }), validate(verifyStatusSchema), paymentController.verifyStatus);
router.get('/orders', paymentController.getOrders);
router.get('/orders/:id', paymentController.getOrder);

module.exports = router;