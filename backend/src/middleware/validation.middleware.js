// middleware/validation.middleware.js
const { validationResult } = require('express-validator');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Validate request using express-validator
 * Usage: router.post('/register', validate(registerSchema), controller.register)
 */
const validate = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map(validation => validation.run(req)));

        // Check for errors
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        // Format errors
        const formattedErrors = errors.array().map(err => ({
            field: err.path,
            message: err.msg,
            value: err.value
        }));

        res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: 'Validation failed',
            errors: formattedErrors
        });
    };
};

module.exports = { validate };