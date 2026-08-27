// middleware/errorHandler.js
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
    });

    // Handle Prisma errors
    if (err.code === 'P2002') {
        return res.status(HTTP_STATUS.CONFLICT).json({
            success: false,
            message: `${err.meta?.target?.[0] || 'Field'} already exists. Please use different credentials.`,
            code: 'DUPLICATE_ENTRY'
        });
    }

    if (err.code === 'P2025') {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
            success: false,
            message: 'Record not found.',
            code: 'NOT_FOUND'
        });
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: 'Invalid token. Please login again.',
            code: ERROR_CODES.TOKEN_INVALID
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: 'Token expired. Please login again.',
            code: ERROR_CODES.TOKEN_EXPIRED
        });
    }

    // Handle custom errors
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code || 'CUSTOM_ERROR'
        });
    }

    // Default error
    const statusCode = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = err.message || 'Internal server error';

    res.status(statusCode).json({
        success: false,
        message,
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: `Route ${req.method} ${req.url} not found`,
        code: 'ROUTE_NOT_FOUND'
    });
};

module.exports = { errorHandler, notFound };