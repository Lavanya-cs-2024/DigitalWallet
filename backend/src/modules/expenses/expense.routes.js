// ============================================
// EXPENSE ROUTES
// ============================================
const express = require('express');
const router = express.Router({ mergeParams: true }); // important to access :groupId

const expenseController = require('./expense.controller');
const { protect } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validation.middleware');
const { rateLimiter } = require('../../middleware/rateLimiter');
const { createExpenseSchema, groupIdParamSchema } = require('./expense.validation');

router.use(protect);

// Routes are mounted at /api/groups/:groupId/expenses

router.post(
    '/',
    rateLimiter({ windowMs: 60 * 1000, max: 20 }),
    validate(groupIdParamSchema),
    validate(createExpenseSchema),
    expenseController.createExpense
);

router.get(
    '/',
    rateLimiter({ windowMs: 60 * 1000, max: 60 }),
    validate(groupIdParamSchema),
    expenseController.listExpenses
);

router.delete(
    '/:expenseId',
    rateLimiter({ windowMs: 60 * 1000, max: 20 }),
    validate(groupIdParamSchema),
    expenseController.deleteExpense
);

module.exports = router;