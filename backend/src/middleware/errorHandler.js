// ============================================
// middleware/errorHandler.js
// ============================================
// Purpose: Global error handler for Express app
// Responsibilities:
//   1. Catch all errors thrown from controllers/services
//   2. Format errors into consistent JSON responses
//   3. Send appropriate HTTP status codes
//   4. Include error codes for frontend handling
// Used by: app.js (as the last middleware)
// ============================================

const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
// Catches all errors passed via next(error) from controllers
// Returns consistent error response format:
//   { success: false, message: string, code: string }
// ============================================
const errorHandler = (err, req, res, next) => {

    // ============================================
    // LOG THE ERROR (for debugging)
    // ============================================
    console.error('❌ Error:', {
        message: err.message,
        code: err.code,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
    });

    // ============================================
    // HANDLE: PENDING_VERIFICATION (Email not verified)
    // ============================================
    // When user tries to login but email is not verified
    // Frontend uses this code to redirect to verify.html
    // Status: 403 Forbidden
    // ============================================
    if (err.code === 'PENDING_VERIFICATION') {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
            success: false,
            message: 'Please complete your email verification.',
            code: 'PENDING_VERIFICATION'
        });
    }

    // ============================================
    // HANDLE: INVALID_CREDENTIALS (Wrong email/password)
    // ============================================
    // When login credentials don't match
    // Status: 401 Unauthorized
    // ============================================
    if (err.message === 'Invalid email or password.') {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: 'Invalid email or password.',
            code: 'INVALID_CREDENTIALS'
        });
    }

    // ============================================
    // HANDLE: PRISMA P2002 (Duplicate entry)
    // ============================================
    // When trying to create a record with duplicate unique field
    // Example: email or mobile already exists
    // Status: 409 Conflict
    // ============================================
    if (err.code === 'P2002') {
        return res.status(HTTP_STATUS.CONFLICT).json({
            success: false,
            message: `${err.meta?.target?.[0] || 'Field'} already exists. Please use different credentials.`,
            code: 'DUPLICATE_ENTRY'
        });
    }

    // ============================================
    // HANDLE: PRISMA P2025 (Record not found)
    // ============================================
    // When trying to update/delete a record that doesn't exist
    // Status: 404 Not Found
    // ============================================
    if (err.code === 'P2025') {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
            success: false,
            message: 'Record not found.',
            code: 'NOT_FOUND'
        });
    }

    // ============================================
    // HANDLE: JWT INVALID TOKEN
    // ============================================
    // When JWT token is malformed or tampered
    // Status: 401 Unauthorized
    // ============================================
    if (err.name === 'JsonWebTokenError') {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: 'Invalid token. Please login again.',
            code: ERROR_CODES.TOKEN_INVALID
        });
    }

    // ============================================
    // HANDLE: JWT EXPIRED TOKEN
    // ============================================
    // When JWT token has expired
    // Status: 401 Unauthorized
    // ============================================
    if (err.name === 'TokenExpiredError') {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: 'Token expired. Please login again.',
            code: ERROR_CODES.TOKEN_EXPIRED
        });
    }

    // ============================================
    // HANDLE: CUSTOM ERRORS (with statusCode)
    // ============================================
    // Any error with a statusCode property
    // Example: new Error with .statusCode = 400
    // ============================================
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code || 'CUSTOM_ERROR'
        });
    }

    // ============================================
    // DEFAULT: INTERNAL SERVER ERROR (500)
    // ============================================
    // Fallback for any unhandled errors
    // Includes stack trace in development mode
    // ============================================
    const statusCode = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = err.message || 'Internal server error';

    res.status(statusCode).json({
        success: false,
        message,
        code: err.code || 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

// ============================================
// 404 NOT FOUND HANDLER
// ============================================
// Purpose: Handle requests to non-existent routes
// Used by: app.js (as the last route handler)
// ============================================
const notFound = (req, res) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: `Route ${req.method} ${req.url} not found`,
        code: 'ROUTE_NOT_FOUND'
    });
};

// ============================================
// EXPORTS
// ============================================
module.exports = { errorHandler, notFound };