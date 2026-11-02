const { body, param } = require('express-validator');

const groupIdParamSchema = [
    param('groupId').isInt({ min: 1 }).withMessage('Invalid group ID'),
];

const createExpenseSchema = [
    body('description').trim().notEmpty().withMessage('Description is required').isLength({ min: 2, max: 255 }),
    body('totalAmount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('paidBy').isInt({ min: 1 }).withMessage('Payer ID is required'),
    body('category').optional().isIn(['FOOD', 'TRAVEL', 'SHOPPING', 'ENTERTAINMENT', 'OTHER']),
    body('splitMethod').optional().isIn(['EQUAL', 'PERCENT', 'EXACT', 'SHARES']),
    
    body('participants').isArray({ min: 1 }).withMessage('At least one participant is required'),
    body('participants.*.userId').isInt({ min: 1 }),
    
];

module.exports = { groupIdParamSchema, createExpenseSchema };