// ============================================
// EXPENSE CONTROLLER
// ============================================
const expenseService = require('./expense.service');
const { HTTP_STATUS } = require('../../config/constants');

const expenseController = {
    createExpense: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const groupId = parseInt(req.params.groupId);
            const result = await expenseService.createExpense(userId, groupId, req.body, req);
            res.status(HTTP_STATUS.CREATED).json({ success: true, message: 'Expense added.', data: result });
        } catch (error) {
            if (['NOT_GROUP_MEMBER', 'PAYER_NOT_MEMBER', 'INVALID_PARTICIPANTS', 'INVALID_PERCENTAGES', 'INVALID_AMOUNTS'].includes(error.code)) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message, code: error.code });
            }
            next(error);
        }
    },

    listExpenses: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const groupId = parseInt(req.params.groupId);
            const result = await expenseService.listExpenses(userId, groupId);
            res.status(HTTP_STATUS.OK).json({ success: true, data: { expenses: result } });
        } catch (error) {
            if (error.code === 'NOT_GROUP_MEMBER') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, message: error.message, code: error.code });
            }
            next(error);
        }
    },

    deleteExpense: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const groupId = parseInt(req.params.groupId);
            const expenseId = parseInt(req.params.expenseId);
            const result = await expenseService.deleteExpense(userId, groupId, expenseId, req);
            res.status(HTTP_STATUS.OK).json({ success: true, data: result });
        } catch (error) {
            if (error.code === 'NOT_AUTHORIZED_EXPENSE') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, message: error.message, code: error.code });
            }
            if (error.code === 'EXPENSE_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: error.message, code: error.code });
            }
            next(error);
        }
    }
};

module.exports = expenseController;