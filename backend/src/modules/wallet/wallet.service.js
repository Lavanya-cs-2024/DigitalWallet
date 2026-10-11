// ============================================
// WALLET SERVICE — Business Logic
// ============================================
const prisma = require('../../config/prisma');
const { logSecurityEvent } = require('../../utils/audit');

const walletService = {

    // ============================================
    // CREATE WALLET
    // ============================================
// ============================================
// CREATE WALLET
// ============================================
async createWallet(userId, { alias, state, mobile }, req = {}) {
    // 1. user must exist
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        const error = new Error('User not found.');
        error.code = 'USER_NOT_FOUND';
        throw error;
    }

    // 2. one user → one wallet
    const existingWallet = await prisma.wallet.findUnique({ where: { userId } });
    if (existingWallet) {
        const error = new Error('Wallet already exists for this user.');
        error.code = 'WALLET_ALREADY_EXISTS';
        throw error;
    }

    // 3. normalize alias + state
    const normalizedAlias = alias.toLowerCase().trim();
    const normalizedState = state.trim();

    // 4. alias must be unique — checked on USER model
    const aliasTaken = await prisma.user.findUnique({
        where: { alias: normalizedAlias }
    });
    if (aliasTaken) {
        const error = new Error('This alias is already taken.');
        error.code = 'ALIAS_TAKEN';
        throw error;
    }

    // ============================================
    // 5. MOBILE HANDLING
    // ============================================
    // Rules:
    //   - user.mobile is null (Google OAuth) → mobile is REQUIRED + must be unique
    //   - user.mobile is set (email signup)  → mobile is IGNORED (never overwritten)
    let mobileToSave = user.mobile; // default: keep existing

    if (!user.mobile) {
        // Google OAuth user needs to provide mobile
        if (!mobile || !mobile.trim()) {
            const error = new Error('Mobile number is required.');
            error.code = 'MOBILE_REQUIRED';
            throw error;
        }

        const trimmedMobile = mobile.trim();

        // validate format
        if (!/^[6-9]\d{9}$/.test(trimmedMobile)) {
            const error = new Error('Invalid mobile number format.');
            error.code = 'INVALID_MOBILE';
            throw error;
        }

        // ✨ NEW: check mobile uniqueness across all users
        const mobileTaken = await prisma.user.findUnique({
            where: { mobile: trimmedMobile }
        });
        if (mobileTaken && mobileTaken.id !== userId) {
            const error = new Error('This mobile number is already registered.');
            error.code = 'MOBILE_TAKEN';
            throw error;
        }

        mobileToSave = trimmedMobile;
    }

    // ============================================
    // 6. ATOMIC TRANSACTION — wallet + user update
    // ============================================
    const userUpdateData = {
        alias: normalizedAlias,
        state: normalizedState
    };

    // Only update mobile if it's newly provided (not overwriting)
    if (mobileToSave && mobileToSave !== user.mobile) {
        userUpdateData.mobile = mobileToSave;
    }

    const [wallet] = await prisma.$transaction([
        prisma.wallet.create({
            data: { userId, balance: 0 }
        }),
        prisma.user.update({
            where: { id: userId },
            data: userUpdateData
        })
    ]);

    // 7. log security event
    await logSecurityEvent(
        userId,
        'WALLET_CREATED',
        `Wallet created with alias @${normalizedAlias}` +
            (mobileToSave !== user.mobile ? ' (mobile saved)' : ''),
        req.ip || 'unknown',
        req.headers?.['user-agent'] || 'unknown'
    );

    return {
        id: wallet.id,
        walletId: `wal_${wallet.id}`,
        alias: normalizedAlias,
        state: normalizedState,
        balance: parseFloat(wallet.balance),
        currency: 'INR',
        status: 'ACTIVE',
        createdAt: wallet.createdAt,
        message: 'Wallet created successfully.'
    };
},
    // ============================================
    // GET WALLET
    // ============================================
    async getWallet(userId) {
        const wallet = await prisma.wallet.findUnique({
            where: { userId },
            include: {
                user: {
                    select: { alias: true, state: true }
                },
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });

        // no wallet yet
        if (!wallet) {
            return { hasWallet: false, wallet: null };
        }

        // scoped to requesting user
        return {
            hasWallet: true,
            wallet: {
                id: wallet.id,
                walletId: `wal_${wallet.id}`,
                balance: parseFloat(wallet.balance),
                currency: 'INR',
                alias: wallet.user?.alias || null,
                state: wallet.user?.state || null,
                status: 'ACTIVE',
                createdAt: wallet.createdAt,
                transactions: wallet.transactions.map(t => ({
                    id: t.id,
                    type: t.type,
                    amount: parseFloat(t.amount),
                    description: t.description,
                    referenceType: t.referenceType,
                    createdAt: t.createdAt
                }))
            }
        };
    },

    // ============================================
    // GET BALANCE
    // ============================================
    async getBalance(userId) {
        const wallet = await prisma.wallet.findUnique({
            where: { userId },
            select: { balance: true }
        });

        // wallet must exist
        if (!wallet) {
            const error = new Error('Wallet not found.');
            error.code = 'WALLET_NOT_FOUND';
            throw error;
        }

        return {
            balance: parseFloat(wallet.balance),
            currency: 'INR',
            status: 'ACTIVE'
        };
    },

    // ============================================
    // GET SUMMARY (for dashboard)
    // ============================================
    async getSummary(userId) {
        const wallet = await prisma.wallet.findUnique({
            where: { userId },
            include: {
                user: {
                    select: { alias: true, state: true }
                }
            }
        });

        // wallet must exist
        if (!wallet) {
            const error = new Error('Wallet not found.');
            error.code = 'WALLET_NOT_FOUND';
            throw error;
        }

        // calculate group count, transaction count, income, expense
        const [groupCount, transactionCount, creditSum, debitSum] = await Promise.all([
            prisma.groupMember.count({ where: { userId } }),
            prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
            prisma.walletTransaction.aggregate({
                where: { walletId: wallet.id, type: 'CREDIT' },
                _sum: { amount: true }
            }),
            prisma.walletTransaction.aggregate({
                where: { walletId: wallet.id, type: 'DEBIT' },
                _sum: { amount: true }
            })
        ]);

        return {
            hasWallet: true,
            balance: parseFloat(wallet.balance),
            currency: 'INR',
            alias: wallet.user?.alias || null,
            state: wallet.user?.state || null,
            status: 'ACTIVE',
            income: parseFloat(creditSum._sum.amount || 0),
            expense: parseFloat(debitSum._sum.amount || 0),
            groupCount,
            transactionCount
        };
    },

    // ============================================
    // LIST TRANSACTIONS (paginated)
    // ============================================
    async getTransactions(userId, { page = 1, limit = 20, type = null } = {}) {

        // page validation
        if (!Number.isInteger(page) || page < 1) {
            const error = new Error('Page must be a positive integer.');
            error.code = 'INVALID_PAGE';
            throw error;
        }

        // limit validation
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
            const error = new Error('Limit must be between 1 and 100.');
            error.code = 'INVALID_LIMIT';
            throw error;
        }

        // type validation (optional)
        if (type !== null && type !== 'CREDIT' && type !== 'DEBIT') {
            const error = new Error('Type must be CREDIT or DEBIT.');
            error.code = 'INVALID_TYPE';
            throw error;
        }

        // wallet must exist
        const wallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!wallet) {
            const error = new Error('Wallet not found.');
            error.code = 'WALLET_NOT_FOUND';
            throw error;
        }

        // scope to user's own wallet
        const where = { walletId: wallet.id };
        if (type) where.type = type;

        // paginated fetch
        const [total, transactions] = await Promise.all([
            prisma.walletTransaction.count({ where }),
            prisma.walletTransaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            })
        ]);

        return {
            transactions: transactions.map(t => ({
                id: t.id,
                type: t.type,
                amount: parseFloat(t.amount),
                description: t.description,
                referenceType: t.referenceType,
                referenceId: t.referenceId,
                createdAt: t.createdAt
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    // ============================================
    // GET SINGLE TRANSACTION
    // ============================================
    async getTransaction(userId, transactionId) {
        const wallet = await prisma.wallet.findUnique({ where: { userId } });

        // wallet must exist
        if (!wallet) {
            const error = new Error('Wallet not found.');
            error.code = 'WALLET_NOT_FOUND';
            throw error;
        }

        // validate ID format
        const parsedId = parseInt(transactionId);
        if (isNaN(parsedId) || parsedId < 1) {
            const error = new Error('Invalid transaction ID.');
            error.code = 'INVALID_TRANSACTION_ID';
            throw error;
        }

        // scope to user's own wallet
        const transaction = await prisma.walletTransaction.findFirst({
            where: {
                id: parsedId,
                walletId: wallet.id
            }
        });

        if (!transaction) {
            const error = new Error('Transaction not found.');
            error.code = 'TRANSACTION_NOT_FOUND';
            throw error;
        }

        return {
            id: transaction.id,
            type: transaction.type,
            amount: parseFloat(transaction.amount),
            description: transaction.description,
            referenceType: transaction.referenceType,
            referenceId: transaction.referenceId,
            createdAt: transaction.createdAt
        };
    },

    // ============================================
    // CHECK ALIAS AVAILABILITY (public)
    // ============================================
    // READ-ONLY — queries USER model for alias uniqueness
    // ============================================
async checkAlias(alias) {
    // alias missing or too short
    if (!alias || alias.trim().length < 6) {
        const error = new Error('Alias must be at least 6 characters.');
        error.code = 'INVALID_ALIAS';
        throw error;
    }
        // alias too long
        if (alias.trim().length > 30) {
            const error = new Error('Alias must be at most 30 characters.');
            error.code = 'INVALID_ALIAS';
            throw error;
        }

        // invalid characters
        if (!/^[a-zA-Z0-9_]+$/.test(alias.trim())) {
            const error = new Error('Alias can only contain letters, numbers, and underscores.');
            error.code = 'INVALID_ALIAS';
            throw error;
        }

        // normalize
        const normalizedAlias = alias.toLowerCase().trim();

        // check existence — on USER model
        const existing = await prisma.user.findUnique({
            where: { alias: normalizedAlias }
        });

        return {
            alias: normalizedAlias,
            available: !existing
        };
    },

    // ============================================
    // UPDATE ALIAS
    // ============================================
    async updateAlias(userId, newAlias, req = {}) {
        const normalizedAlias = newAlias.toLowerCase().trim();

        // user must exist
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { alias: true }
        });
        if (!user) {
            const error = new Error('User not found.');
            error.code = 'USER_NOT_FOUND';
            throw error;
        }

        // wallet must exist
        const wallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!wallet) {
            const error = new Error('Wallet not found.');
            error.code = 'WALLET_NOT_FOUND';
            throw error;
        }

        // same alias → no change
        if (user.alias === normalizedAlias) {
            return {
                alias: user.alias,
                message: 'Alias unchanged.'
            };
        }

        // new alias must be free — on USER model
        const existing = await prisma.user.findUnique({
            where: { alias: normalizedAlias }
        });
        if (existing) {
            const error = new Error('This alias is already taken.');
            error.code = 'ALIAS_TAKEN';
            throw error;
        }

        // update user only (no wallet column to update)
        await prisma.user.update({
            where: { id: userId },
            data: { alias: normalizedAlias }
        });

        // log security event
        await logSecurityEvent(
            userId,
            'WALLET_ALIAS_UPDATED',
            `Alias changed from @${user.alias} to @${normalizedAlias}`,
            req.ip || 'unknown',
            req.headers?.['user-agent'] || 'unknown'
        );

        return {
            alias: normalizedAlias,
            message: 'Alias updated successfully.'
        };
    }
};

module.exports = walletService;