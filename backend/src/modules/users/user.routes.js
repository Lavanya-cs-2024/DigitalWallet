// ============================================
// USER ROUTES
// ============================================
const express = require('express');
const router = express.Router();

const userController = require('./user.controller');
const { protect } = require('../../middleware/auth.middleware');
const { rateLimiter } = require('../../middleware/rateLimiter');

// All user routes require auth
router.use(protect);

/**
 * @route   GET /api/users/search?q=...&excludeGroupId=...
 * @desc    Search users by name, email, or alias
 * @access  Private
 */
router.get(
    '/search',
    rateLimiter({ windowMs: 60 * 1000, max: 30 }),
    userController.searchUsers
);

module.exports = router;