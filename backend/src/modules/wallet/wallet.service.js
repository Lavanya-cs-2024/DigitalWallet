const prisma = require('../../config/prisma');

const walletService = {
    async getStatus({ userId }) {
        const wallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!wallet) return { hasWallet: false, wallet: null };
        return {
            hasWallet: true,
            wallet: {
                id: wallet.id,
                balance: Number(wallet.balance),
                currency: 'INR',
                createdAt: wallet.createdAt
            }
        };
    },

    async createWallet({ userId }) {
        const existing = await prisma.wallet.findUnique({ where: { userId } });
        if (existing) {
            const err = new Error('Wallet already exists.');
            err.code = 'WALLET_EXISTS';
            throw err;
        }
        const wallet = await prisma.wallet.create({
            data: { userId, balance: 0 }
        });
        return {
            id: wallet.id,
            balance: Number(wallet.balance),
            currency: 'INR',
            createdAt: wallet.createdAt
        };
    },

    async getSummary({ userId }) {
        const wallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!wallet) {
            return { hasWallet: false, groupCount: 0, transactionCount: 0, balance: 0 };
        }
        const groupCount = await prisma.groupMember.count({ where: { userId } });
        const transactionCount = await prisma.walletTransaction.count({
            where: { walletId: wallet.id }
        });
        return {
            hasWallet: true,
            balance: Number(wallet.balance),
            groupCount,
            transactionCount
        };
    }
};

module.exports = walletService;