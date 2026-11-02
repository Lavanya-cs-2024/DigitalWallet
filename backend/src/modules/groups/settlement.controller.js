const balanceService = require('./balance.service');
const settlementService = require('./settlement.service');
const { HTTP_STATUS } = require('../../config/constants');

const settlementController = {
    getBalances: async (req, res, next) => {
        try {
            const groupId = parseInt(req.params.groupId);
            const balances = await balanceService.getGroupBalances(groupId);
            const suggestions = balanceService.getSettlementSuggestions(balances);
            
            res.status(HTTP_STATUS.OK).json({
                success: true,
                data: { balances, suggestions }
            });
        } catch (error) { next(error); }
    },

        getExpenseSettlements: async (req, res, next) => {
        try {
            const expenseId = parseInt(req.params.expenseId);
            const prisma = require('../../config/prisma');
            
            const expense = await prisma.expense.findUnique({
                where: { id: expenseId },
                include: { 
                    payer: true,
                    splits: { include: { user: true } },
                    settlements: true
                }
            });

            if (!expense) throw new Error('Expense not found');

            const payerId = expense.paidBy;
            
            // Build the list of people who owe money
            const debtors = expense.splits.map(split => {
                if (split.userId === payerId) return null; // Payer doesn't owe themselves

                // Find if they paid
                const settlement = expense.settlements.find(s => s.fromUserId === split.userId);
                const paidAmount = settlement ? parseFloat(settlement.paidAmount) : 0;
                const owedAmount = parseFloat(split.amount);
                
                return {
                    userId: split.userId,
                    userName: split.user.name,
                    owedAmount: owedAmount,
                    paidAmount: paidAmount,
                    remaining: owedAmount - paidAmount,
                    status: paidAmount >= owedAmount ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID')
                };
            }).filter(Boolean);

            res.status(200).json({ 
                success: true, 
                data: {
                    expense: {
                        id: expense.id,
                        description: expense.description,
                        totalAmount: expense.totalAmount,
                        paidBy: expense.paidBy,
                        payerName: expense.payer.name
                    },
                    debtors: debtors // Sending the list of debtors
                }
            });
        } catch (error) { 
            next(error); 
        }
    },

    settleUp: async (req, res, next) => {
        try {
            const payerId = req.user.userId;
            const groupId = parseInt(req.params.groupId);
            const { toUserId, amount } = req.body;

            const result = await settlementService.settleUp(payerId, groupId, { toUserId, amount });
            
            res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Payment settled successfully',
                data: result
            });
        } catch (error) {
            if (error.code === 'INSUFFICIENT_BALANCE') return res.status(400).json({ success: false, message: error.message });
            if (['INVALID_AMOUNT', 'INVALID_PAYEE', 'NOT_GROUP_MEMBER'].includes(error.code)) return res.status(400).json({ success: false, message: error.message });
            next(error);
        }
    },
    settleExpense: async (req, res, next) => {
        try {
            const payerId = req.user.userId;
            const expenseId = parseInt(req.params.expenseId);
            const { amount } = req.body;
            const result = await settlementService.settleExpense(payerId, expenseId, { amount });
            res.status(200).json({ success: true, message: 'Payment successful', data: result });
        } catch (error) {
            if (['Insufficient wallet balance', 'Amount exceeds your share', 'You cannot pay yourself'].includes(error.message)) {
                return res.status(400).json({ success: false, message: error.message });
            }
            next(error);
        }
    }
};
module.exports = settlementController;