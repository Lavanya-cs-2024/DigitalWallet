// ============================================
// BALANCE SERVICE — Math engine for who owes whom
// ============================================
const prisma = require('../../config/prisma');

const balanceService = {
    // Calculates net balances for every member in a group
    async getGroupBalances(groupId) {
        // 1. Get all expenses and their splits
        const expenses = await prisma.expense.findMany({
            where: { groupId },
            include: { splits: true },
        });

        // 2. Get all completed settlements
        const settlements = await prisma.settlement.findMany({
            where: { groupId, status: { in: ['COMPLETED', 'PARTIALLY_PAID'] } },
        });

        const balances = {}; // userId -> net balance (positive = gets money back, negative = owes money)

        // Initialize all group members to 0
        const members = await prisma.groupMember.findMany({
            where: { groupId },
            select: { userId: true },
        });
        members.forEach(m => balances[m.userId] = 0);

        // Helper to safely add
        const addBalance = (userId, amount) => {
            if (balances[userId] === undefined) balances[userId] = 0;
            balances[userId] += amount;
        };

        // Process Expenses
        for (const exp of expenses) {
            const total = parseFloat(exp.totalAmount);
            
            // The payer gets a positive balance (they paid on behalf of others)
            addBalance(exp.paidBy, total);

            // Everyone gets a negative balance for their share
            for (const split of exp.splits) {
                addBalance(split.userId, -parseFloat(split.amount));
            }
        }

        // Process Settlements (Paid amounts)
        for (const set of settlements) {
            const paid = parseFloat(set.paidAmount || 0);
            // Payer's debt decreases (becomes more positive)
            addBalance(set.fromUserId, paid);
            // Receiver's credit decreases (becomes more negative)
            addBalance(set.toUserId, -paid);
        }

        // Format and return
        const formatted = Object.keys(balances).map(userId => {
            const bal = balances[userId];
            return {
                userId: parseInt(userId),
                netBalance: bal, // Positive = receives, Negative = owes
            };
        });

        return formatted;
    },

    // Generates simplified "A owes B ₹X" suggestions
    getSettlementSuggestions(balances) {
        const debtors = []; // People who owe money (negative balance)
        const creditors = []; // People who should receive money (positive balance)

        balances.forEach(b => {
            if (b.netBalance < -0.01) debtors.push({ userId: b.userId, amount: Math.abs(b.netBalance) });
            else if (b.netBalance > 0.01) creditors.push({ userId: b.userId, amount: b.netBalance });
        });

        // Sort to optimize (highest debts first)
        debtors.sort((a, b) => b.amount - a.amount);
        creditors.sort((a, b) => b.amount - a.amount);

        const suggestions = [];
        let i = 0, j = 0;

        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];
            
            // Match the smaller of the two amounts
            const amount = Math.min(debtor.amount, creditor.amount);
            
            suggestions.push({
                fromUserId: debtor.userId,
                toUserId: creditor.userId,
                amount: parseFloat(amount.toFixed(2)),
            });

            debtor.amount -= amount;
            creditor.amount -= amount;

            if (debtor.amount < 0.01) i++;
            if (creditor.amount < 0.01) j++;
        }

        return suggestions;
    }
};

module.exports = balanceService;