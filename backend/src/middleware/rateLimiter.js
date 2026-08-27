// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

/**
 * Rate limiter configuration
 * Usage: router.post('/register', rateLimiter({ windowMs: 15*60*1000, max: 5 }), controller.register)
 */
const rateLimiter = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes default
        max = 100, // 100 requests default
        message = 'Too many requests, please try again later.',
        keyPrefix = 'rate-limit'
    } = options;

    return rateLimit({
        windowMs,
        max,
        message: {
            success: false,
            message,
            code: ERROR_CODES.RATE_LIMIT_EXCEEDED
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => {
            // Use IP + user ID (if logged in) as key
            const userId = req.user?.id || 'anonymous';
            return `${userId}-${req.ip}`;
        },
        skip: (req) => {
            // Skip rate limiting for health check
            return req.path === '/health';
        }
    });
};

module.exports = { rateLimiter };