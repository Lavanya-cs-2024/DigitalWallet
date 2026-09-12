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
        // ============================================
        // ✅ ADD THIS HANDLER
        // ============================================
        handler: (req, res) => {
            const retryAfterSeconds = Math.ceil(windowMs / 1000);
            const retryAfterMinutes = Math.ceil(retryAfterSeconds / 60);
            
            // Log the rate limit event
            console.warn('🚫 Rate limit exceeded:', {
                ip: req.ip,
                path: req.path,
                email: req.body?.email,
                timestamp: new Date().toISOString()
            });

            res.status(429).json({
                success: false,
                message: `Too many attempts. Please try again in ${retryAfterMinutes} minute${retryAfterMinutes > 1 ? 's' : ''}.`,
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: retryAfterSeconds,
                retryAfterMinutes: retryAfterMinutes
            });
        }
    });
};

module.exports = { rateLimiter };

       