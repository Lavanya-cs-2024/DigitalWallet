// ============================================
// EXPENSE SERVICE — business logic
// ============================================
const prisma = require('../../config/prisma');
const { logSecurityEvent } = require('../../utils/audit');

const expenseService = {
    // ============================================
    // CREATE EXPENSE
    // ============================================
        async createExpense(userId, groupId, { description, totalAmount, paidBy, category, splitMethod, participants }, req = {}) {
        // 1. Validations (Membership & Payer check)
        const membership = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
        if (!membership) throw Object.assign(new Error('Not a member'), { code: 'NOT_GROUP_MEMBER' });

        const payerIsMember = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: paidBy } } });
        if (!payerIsMember) throw Object.assign(new Error('Payer not in group'), { code: 'PAYER_NOT_MEMBER' });

        const allMembers = await prisma.groupMember.findMany({ where: { groupId }, select: { userId: true } });
        const memberIds = allMembers.map(m => m.userId);
        if (participants.some(p => !memberIds.includes(p.userId))) {
            throw Object.assign(new Error('Invalid participants'), { code: 'INVALID_PARTICIPANTS' });
        }

        // 2. Calculate Splits
        const method = splitMethod || 'EQUAL';
        const totalCents = Math.round(parseFloat(totalAmount) * 100);
        let splits = [];

        if (method === 'EQUAL') {
            const count = participants.length;
            const baseShare = Math.floor(totalCents / count);
            const remainder = totalCents % count;

            splits = participants.map((p, i) => ({
                userId: p.userId,
                amount: (baseShare + (i < remainder ? 1 : 0)) / 100,
            }));
        } 
        else if (method === 'PERCENT') {
            const sumPercent = participants.reduce((s, p) => s + parseFloat(p.percentage || 0), 0);
            if (Math.abs(sumPercent - 100) > 0.01) throw Object.assign(new Error('Percentages must sum to 100'), { code: 'INVALID_PERCENTAGES' });

            splits = participants.map(p => ({
                userId: p.userId,
                amount: (Math.round(totalCents * (parseFloat(p.percentage) / 100))) / 100,
                percentage: parseFloat(p.percentage),
            }));

            // Rounding fix
            const sumCents = splits.reduce((s, p) => s + Math.round(p.amount * 100), 0);
            const diff = totalCents - sumCents;
            if (diff !== 0) splits[splits.length - 1].amount += diff / 100;
        } 
        else if (method === 'EXACT') {
            const sumAmount = participants.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
            if (Math.abs(sumAmount - parseFloat(totalAmount)) > 0.05) throw Object.assign(new Error('Amounts must sum to total'), { code: 'INVALID_AMOUNTS' });

            splits = participants.map(p => ({ userId: p.userId, amount: parseFloat(p.amount) }));
        } 
        else if (method === 'SHARES') {
            const totalShares = participants.reduce((s, p) => s + (parseInt(p.shares) || 1), 0);
            splits = participants.map(p => {
                const shares = parseInt(p.shares) || 1;
                return {
                    userId: p.userId,
                    shares: shares,
                    amount: (Math.round(totalCents * (shares / totalShares))) / 100,
                };
            });

            // Rounding fix
            const sumCents = splits.reduce((s, p) => s + Math.round(p.amount * 100), 0);
            const diff = totalCents - sumCents;
            if (diff !== 0) splits[0].amount += diff / 100;
        }

        // 3. Create Expense
        const expense = await prisma.expense.create({
            data: {
                groupId, paidBy, description: description.trim(),
                category: category || 'OTHER',
                totalAmount, splitMethod: method,
                expenseDate: new Date(),
                splits: {
                    create: splits.map(s => ({
                        userId: s.userId, amount: s.amount,
                        percentage: s.percentage || null,
                        shares: s.shares || null,
                    })),
                },
            },
        });

        return { id: expense.id, description, totalAmount, splitMethod: method };
    },

    // ============================================
    // LIST GROUP EXPENSES
    // ============================================
    async listExpenses(userId, groupId) {
        const membership = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId } },
        });
        if (!membership) {
            const error = new Error('You are not a member of this group.');
            error.code = 'NOT_GROUP_MEMBER';
            throw error;
        }

        const expenses = await prisma.expense.findMany({
            where: { groupId },
            orderBy: { expenseDate: 'desc' },
            include: {
                payer: { select: { id: true, name: true } },
                splits: { select: { userId: true, amount: true } },
            },
        });

        return expenses.map(e => ({
            id: e.id,
            description: e.description,
            category: e.category,
            totalAmount: parseFloat(e.totalAmount),
            paidBy: e.payer.name,
            paidById: e.payer.id,
            date: e.expenseDate,
            splitMethod: e.splitMethod,
            myShare: parseFloat(e.splits.find(s => s.userId === userId)?.amount || 0),
        }));
    },

    // ============================================
    // DELETE EXPENSE
    // ============================================
    async deleteExpense(userId, groupId, expenseId, req = {}) {
        const membership = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId } },
        });
        if (!membership) {
            const error = new Error('You are not a member of this group.');
            error.code = 'NOT_GROUP_MEMBER';
            throw error;
        }

        const expense = await prisma.expense.findUnique({
            where: { id: expenseId, groupId },
        });

        if (!expense) {
            const error = new Error('Expense not found.');
            error.code = 'EXPENSE_NOT_FOUND';
            throw error;
        }

        const isAdmin = membership.role === 'ADMIN';
        const isPayer = expense.paidBy === userId;

        if (!isAdmin && !isPayer) {
            const error = new Error('Only the group admin or the payer can delete this expense.');
            error.code = 'NOT_AUTHORIZED_EXPENSE';
            throw error;
        }

        await prisma.expense.delete({ where: { id: expenseId } });

        await logSecurityEvent(
            userId, 'EXPENSE_DELETED',
            `Expense ${expenseId} deleted from group ${groupId}`,
            req.ip || 'unknown',
            req.headers?.['user-agent'] || 'unknown'
        );

        return { message: 'Expense deleted.' };
    },
};

module.exports = expenseService;