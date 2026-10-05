// ============================================
// PAYMENT ROUTES (Paytm)
// ============================================
// TTD alignment:
//   §4  — JWT auth for all /api/payment/* except /config, /paytm/*
//   §5  — POST /create-order (protected)
//   §8  — POST /cancel-order (protected)
//   §9  — POST /paytm/callback + /paytm/webhook (public, checksum auth)
//   §16 — GET /orders (protected)
//   §17 — GET /orders/:id (protected)
//
//   §7 (capture) is intentionally not registered — N/A for Paytm.
// ============================================
const express = require('express');
const router = express.Router();

const paymentController = require('./payment.controller');
const paymentConfigController = require('./payment.config.controller');

const { protect } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validation.middleware');
const { rateLimiter } = require('../../middleware/rateLimiter');

const {
    createOrderSchema,
    verifyStatusSchema,
    cancelOrderSchema
} = require('./payment.validation');

// ============================================
// PUBLIC ROUTES (no JWT)
// ============================================

/**
 * @route   GET /api/payment/config
 * @desc    Public payment config (provider, mid, bounds)
 * @access  Public
 */
router.get('/config', paymentConfigController.getPaymentConfig);

/**
 * @route   POST /api/payment/paytm/callback
 * @desc    Paytm browser redirect target — user lands here after payment
 * @access  Public (verified by checksum)
 */
router.post('/paytm/callback', paymentController.paytmCallback);

/**
 * @route   POST /api/payment/paytm/webhook
 * @desc    Paytm server-to-server notification (checksum-authenticated)
 * @access  Public
 */
router.post('/paytm/webhook', paymentController.paytmWebhook);

// ============================================
// PROTECTED ROUTES (JWT required)
// ============================================
router.use(protect);

/**
 * @route   POST /api/payment/create-order
 * @desc    Create a Paytm payment order; returns form params for redirect
 * @access  Private
 */
router.post(
    '/create-order',
    rateLimiter({ windowMs: 60 * 1000, max: 10 }),
    validate(createOrderSchema),
    paymentController.createOrder
);

/**
 * @route   POST /api/payment/cancel-order
 * @access  Private
 */
router.post(
    '/cancel-order',
    rateLimiter({ windowMs: 60 * 1000, max: 20 }),
    validate(cancelOrderSchema),
    paymentController.cancelOrder
);

/**
 * @route   POST /api/payment/verify-status
 * @access  Private
 */
router.post(
    '/verify-status',
    rateLimiter({ windowMs: 60 * 1000, max: 10 }),
    validate(verifyStatusSchema),
    paymentController.verifyStatus
);

/**
 * @route   GET /api/payment/orders
 * @access  Private
 */
router.get('/orders', paymentController.getOrders);

/**
 * @route   GET /api/payment/orders/:id
 * @access  Private
 */
router.get('/orders/:id', paymentController.getOrder);

module.exports = router;