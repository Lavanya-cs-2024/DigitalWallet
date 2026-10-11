// ============================================
// WALLET VALIDATION — Input Rules
// ============================================
const { body } = require('express-validator');

// create wallet validation
const createWalletSchema = [
    body('state')
        .trim()
        .notEmpty().withMessage('State is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('State must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('State can only contain letters and spaces'),

    body('alias')
        .trim()
        .notEmpty().withMessage('Alias is required')
        .isLength({ min: 6, max: 30 })
        .withMessage('Alias must be between 6 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Alias can only contain letters, numbers, and underscores'),

    // Mobile is optional at the validator level.
    // It is required only when the user has no mobile on record
    // (e.g. Google OAuth users). The service enforces that rule.
    body('mobile')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .matches(/^[6-9]\d{9}$/)
        .withMessage('Mobile must be a valid 10-digit Indian number')
];

// update alias validation
const updateAliasSchema = [
    body('alias')
        .trim()
        .notEmpty().withMessage('Alias is required')
        .isLength({ min: 3, max: 30 })
        .withMessage('Alias must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Alias can only contain letters, numbers, and underscores')
];

module.exports = {
    createWalletSchema,
    updateAliasSchema
};