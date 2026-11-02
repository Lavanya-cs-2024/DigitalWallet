const prisma = require('../../config/prisma');

const settlementService = {
    // Calculate who owes what for a SPECIFIC expense
    async getExpenseSettlements(expenseId) {
        const expense = await prisma.expense.findUnique({
            where: { id: expenseId },
            include: {
                payer: true,
                splits: { include: { user: true } },
                settlements: true,
            }
        });

        if (!expense) throw new Error('Expense not found');

        const payerId = expense.paidBy;

        return expense.splits.map(split => {
            // The payer doesn't owe themselves
            if (split.userId === payerId) return null; 

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
        }).filter(Boolean); // Remove the payer from the list
    },

    // Process a payment for a specific expense
    async settleExpense(payerId, expenseId, { amount }) {
        const amtFloat = parseFloat(amount);
        const amtCents = Math.round(amtFloat * 100);

        const expense = await prisma.expense.findUnique({
            where: { id: expenseId },
            include: { payer: true, splits: { include: { user: true } }, settlements: true }
        });

        if (!expense) throw new Error('Expense not found');
        if (payerId === expense.paidBy) throw new Error('You cannot pay yourself');

        const mySplit = expense.splits.find(s => s.userId === payerId);
        if (!mySplit) throw new Error('You are not part of this expense');

        // Find existing settlement or create a new one
        let settlement = expense.settlements.find(s => s.fromUserId === payerId);
        let currentPaid = settlement ? parseFloat(settlement.paidAmount) : 0;
        const owedAmount = parseFloat(mySplit.amount);
        
        if (currentPaid + amtFloat > owedAmount) throw new Error('Amount exceeds your share');

        // Check Wallets
        const payerWallet = await prisma.wallet.findUnique({ where: { userId: payerId } });
        const receiverWallet = await prisma.wallet.findUnique({ where: { userId: expense.paidBy } });

        if (parseFloat(payerWallet.balance) < amtFloat) throw new Error('Insufficient wallet balance');

        // Execute Atomic Transaction
        return await prisma.$transaction(async (tx) => {
            // 1. Wallets
            await tx.wallet.update({ where: { id: payerWallet.id }, data: { balance: { decrement: amtFloat } } });
            await tx.wallet.update({ where: { id: receiverWallet.id }, data: { balance: { increment: amtFloat } } });

            // 2. Transactions
            await tx.walletTransaction.create({ data: { walletId: payerWallet.id, type: 'DEBIT', amount: amtFloat, description: `Paid ${expense.payer.name} for "${expense.description}"`, referenceType: 'SETTLEMENT' } });
            await tx.walletTransaction.create({ data: { walletId: receiverWallet.id, type: 'CREDIT', amount: amtFloat, description: `Received from ${mySplit.user.name || 'user'} for "${expense.description}"`, referenceType: 'SETTLEMENT' } });

            // 3. Settlement Record
            if (settlement) {
                const newPaid = currentPaid + amtFloat;
                await tx.settlement.update({
                    where: { id: settlement.id },
                    data: { paidAmount: newPaid, status: newPaid >= owedAmount ? 'COMPLETED' : 'PARTIALLY_PAID' }
                });
            } else {
                await tx.settlement.create({
                    data: {
                        groupId: expense.groupId,
                        expenseId: expense.id,
                        fromUserId: payerId,
                        toUserId: expense.paidBy,
                        amount: owedAmount,
                        paidAmount: amtFloat,
                        status: amtFloat >= owedAmount ? 'COMPLETED' : 'PARTIALLY_PAID'
                    }
                });
            }

            return { success: true, newBalance: owedAmount - (currentPaid + amtFloat) };
        });
    }
};
module.exports = settlementService;