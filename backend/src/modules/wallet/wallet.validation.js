// modules/wallet/wallet.validation.js
// Currently no validation needed for create/read endpoints
// This file will hold future validation for add-money, send-money, etc.

const { body } = require('express-validator');

// ============================================
// ADD MONEY VALIDATION (future use)
// ============================================
const addMoneySchema = [
    body('amount')
        .notEmpty().withMessage('Amount is required')
        .isFloat({ min: 1 }).withMessage('Amount must be at least 1')
        .isFloat({ max: 100000 }).withMessage('Amount cannot exceed 100000')
];

// ============================================
// SEND MONEY VALIDATION (future use)
// ============================================
const sendMoneySchema = [
    body('recipientEmail')
        .trim()
        .notEmpty().withMessage('Recipient email is required')
        .isEmail().withMessage('Please provide a valid email'),
    
    body('amount')
        .notEmpty().withMessage('Amount is required')
        .isFloat({ min: 1 }).withMessage('Amount must be at least 1')
];

module.exports = {
    addMoneySchema,
    sendMoneySchema
};