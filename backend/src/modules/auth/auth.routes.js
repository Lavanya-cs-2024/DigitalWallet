// modules/auth/auth.routes.js
const express = require('express');
const router = express.Router();

// Controllers
const authController = require('./auth.controller');

// Middleware
const { protect } = require('../../middleware/auth.middleware');
const { rateLimiter } = require('../../middleware/rateLimiter');
const { validate } = require('../../middleware/validation.middleware');

// Validation schemas
const {
    registerSchema,
    verifyEmailSchema,
    resendOTPSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
    refreshTokenSchema
} = require('./auth.validation');

// Rate limit configurations
const { RATE_LIMITS } = require('../../config/constants');

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
    '/register',
    rateLimiter(RATE_LIMITS.REGISTER),
    validate(registerSchema),
    authController.register
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with OTP
 * @access  Public
 */
router.post(
    '/verify-email',
    rateLimiter(RATE_LIMITS.VERIFY_OTP),
    validate(verifyEmailSchema),
    authController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP to email
 * @access  Public
 */
router.post(
    '/resend-otp',
    rateLimiter(RATE_LIMITS.RESEND_OTP),
    validate(resendOTPSchema),
    authController.resendOTP
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
    '/login',
    rateLimiter(RATE_LIMITS.LOGIN),
    validate(loginSchema),
    authController.login
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
    '/forgot-password',
    rateLimiter(RATE_LIMITS.FORGOT_PASSWORD),
    validate(forgotPasswordSchema),
    authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with OTP
 * @access  Public
 */
router.post(
    '/reset-password',
    rateLimiter(RATE_LIMITS.RESET_PASSWORD),
    validate(resetPasswordSchema),
    authController.resetPassword
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
    '/refresh-token',
    validate(refreshTokenSchema),
    authController.refreshToken
);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
    '/me',
    protect,
    authController.getCurrentUser
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
    '/logout',
    protect,
    authController.logout
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.post(
    '/change-password',
    protect,
    validate(changePasswordSchema),
    authController.changePassword
);

module.exports = router;