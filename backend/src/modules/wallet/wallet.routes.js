// ============================================
// WALLET ROUTES
// ============================================
const express = require('express');
const router = express.Router();

const walletController = require('./wallet.controller');
const { protect } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validation.middleware');
const { rateLimiter } = require('../../middleware/rateLimiter');

const {
    createWalletSchema,
    updateAliasSchema
} = require('./wallet.validation');

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================
/**
 * @route   GET /api/wallet/check-alias/:alias
 * @desc    Check if alias is available
 *          Also used by group-creation to search users
 * @access  Public
 */
router.get(
    '/check-alias/:alias',
    // rate limit
    rateLimiter({ windowMs: 60 * 1000, max: 30 }),
    walletController.checkAlias
);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================
// everything below requires a valid JWT
router.use(protect);

/**
 * @route   GET /api/wallet
 * @desc    Get user's wallet or { hasWallet: false }
 * @access  Private
 */
router.get('/', walletController.getWallet);

/**
 * @route   POST /api/wallet
 * @desc    Create wallet for authenticated user
 * @access  Private
 */
router.post(
    '/',
    // rate limit
    rateLimiter({ windowMs: 15 * 60 * 1000, max: 50 }),
    validate(createWalletSchema),
    walletController.createWallet
);

/**
 * @route   GET /api/wallet/balance
 * @desc    Get wallet balance only
 * @access  Private
 */
router.get('/balance', walletController.getBalance);

/**
 * @route   GET /api/wallet/summary
 * @desc    Get wallet summary for dashboard
 * @access  Private
 */
router.get('/summary', walletController.getSummary);

/**
 * @route   GET /api/wallet/transactions
 * @desc    List wallet transactions (paginated)
 * @access  Private
 */
router.get('/transactions', walletController.getTransactions);

/**
 * @route   GET /api/wallet/transactions/:id
 * @desc    Get single transaction
 * @access  Private
 */
router.get('/transactions/:id', walletController.getTransaction);

/**
 * @route   PATCH /api/wallet/alias
 * @desc    Update wallet alias
 * @access  Private
 */
router.patch(
    '/alias',
    // rate limit
    rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }),
    validate(updateAliasSchema),
    walletController.updateAlias
);

module.exports = router;