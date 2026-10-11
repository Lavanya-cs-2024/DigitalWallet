// ============================================
// WALLET CONTROLLER — HTTP Handling
// ============================================
const walletService = require('./wallet.service');
const { HTTP_STATUS } = require('../../config/constants');

const walletController = {

    // ============================================
    // CREATE WALLET
    // ============================================
    createWallet: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { alias, state } = req.body;

            const result = await walletService.createWallet(
                userId,
                { alias, state },
                req
            );

            res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Wallet created successfully.',
                data: result
            });
        } catch (error) {
            // wallet already exists
            if (error.code === 'WALLET_ALREADY_EXISTS') {
                return res.status(HTTP_STATUS.CONFLICT).json({
                    success: false,
                    message: 'You already have a wallet.',
                    code: 'WALLET_ALREADY_EXISTS'
                });
            }

            // alias taken
            if (error.code === 'ALIAS_TAKEN') {
                return res.status(HTTP_STATUS.CONFLICT).json({
                    success: false,
                    message: 'This alias is already taken. Please choose another one.',
                    code: 'ALIAS_TAKEN'
                });
            }

            next(error);
        }
    },

    createWallet: async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { alias, state, mobile } = req.body;

        const result = await walletService.createWallet(
            userId,
            { alias, state, mobile },
            req
        );

        res.status(HTTP_STATUS.CREATED).json({
            success: true,
            message: 'Wallet created successfully.',
            data: result
        });
    } catch (error) {
        if (error.code === 'WALLET_ALREADY_EXISTS') {
            return res.status(HTTP_STATUS.CONFLICT).json({
                success: false,
                message: 'You already have a wallet.',
                code: 'WALLET_ALREADY_EXISTS'
            });
        }
        if (error.code === 'ALIAS_TAKEN') {
            return res.status(HTTP_STATUS.CONFLICT).json({
                success: false,
                message: 'This alias is already taken. Please choose another one.',
                code: 'ALIAS_TAKEN'
            });
        }
        if (error.code === 'MOBILE_TAKEN') {
            return res.status(HTTP_STATUS.CONFLICT).json({
                success: false,
                message: 'This mobile number is already registered.',
                code: 'MOBILE_TAKEN'
            });
        }
        if (error.code === 'MOBILE_REQUIRED') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Mobile number is required.',
                code: 'MOBILE_REQUIRED'
            });
        }
        if (error.code === 'INVALID_MOBILE') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Invalid mobile number format.',
                code: 'INVALID_MOBILE'
            });
        }
        next(error);
    }
},

    // ============================================
    // GET WALLET
    // ============================================
    getWallet: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const result = await walletService.getWallet(userId);

            res.status(HTTP_STATUS.OK).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // ============================================
    // GET BALANCE
    // ============================================
    getBalance: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const result = await walletService.getBalance(userId);

            res.status(HTTP_STATUS.OK).json({
                success: true,
                data: result
            });
        } catch (error) {
            // wallet not found
            if (error.code === 'WALLET_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Wallet not found. Please create a wallet first.',
                    code: 'WALLET_NOT_FOUND'
                });
            }
            next(error);
        }
    },

    // ============================================
    // GET SUMMARY
    // ============================================
    getSummary: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const result = await walletService.getSummary(userId);

            res.status(HTTP_STATUS.OK).json({
                success: true,
                data: result
            });
        } catch (error) {
            // wallet not found
            if (error.code === 'WALLET_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Wallet not found.',
                    code: 'WALLET_NOT_FOUND'
                });
            }
            next(error);
        }
    },

    // ============================================
    // LIST TRANSACTIONS
    // ============================================
    getTransactions: async (req, res, next) => {
        try {
            const { userId } = req.user;

            // parse query params
            const page = req.query.page !== undefined ? parseInt(req.query.page) : 1;
            const limit = req.query.limit !== undefined ? parseInt(req.query.limit) : 20;
            const type = req.query.type || null;

            const result = await walletService.getTransactions(userId, {
                page,
                limit,
                type
            });

            res.status(HTTP_STATUS.OK).json({
                success: true,
                data: result
            });
        } catch (error) {
            // invalid pagination
            if (error.code === 'INVALID_PAGE' ||
                error.code === 'INVALID_LIMIT' ||
                error.code === 'INVALID_TYPE') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: error.message,
                    code: 'VALIDATION_ERROR'
                });
            }

            // wallet not found
            if (error.code === 'WALLET_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Wallet not found.',
                    code: 'WALLET_NOT_FOUND'
                });
            }
            next(error);
        }
    },

    // ============================================
    // GET SINGLE TRANSACTION
    // ============================================
    getTransaction: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { id } = req.params;

            const result = await walletService.getTransaction(userId, id);

            res.status(HTTP_STATUS.OK).json({
                success: true,
                data: result
            });
        } catch (error) {
            // invalid transaction ID
            if (error.code === 'INVALID_TRANSACTION_ID') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: error.message,
                    code: 'VALIDATION_ERROR'
                });
            }

            // transaction not found
            if (error.code === 'TRANSACTION_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Transaction not found.',
                    code: 'TRANSACTION_NOT_FOUND'
                });
            }

            // wallet not found
            if (error.code === 'WALLET_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Wallet not found.',
                    code: 'WALLET_NOT_FOUND'
                });
            }
            next(error);
        }
    },

    // ============================================
    // CHECK ALIAS AVAILABILITY (public)
    // ============================================
    checkAlias: async (req, res, next) => {
        try {
            const { alias } = req.params;

            const result = await walletService.checkAlias(alias);

            res.status(HTTP_STATUS.OK).json({
                success: true,
                data: result
            });
        } catch (error) {
            // invalid alias format
            if (error.code === 'INVALID_ALIAS') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: error.message,
                    code: 'INVALID_ALIAS'
                });
            }
            next(error);
        }
    },

    // ============================================
    // UPDATE ALIAS
    // ============================================
    updateAlias: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { alias } = req.body;

            const result = await walletService.updateAlias(userId, alias, req);

            res.status(HTTP_STATUS.OK).json({
                success: true,
                message: result.message,
                data: { alias: result.alias }
            });
        } catch (error) {
            // alias taken
            if (error.code === 'ALIAS_TAKEN') {
                return res.status(HTTP_STATUS.CONFLICT).json({
                    success: false,
                    message: 'This alias is already taken.',
                    code: 'ALIAS_TAKEN'
                });
            }

            // wallet not found
            if (error.code === 'WALLET_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Wallet not found.',
                    code: 'WALLET_NOT_FOUND'
                });
            }
            next(error);
        }
    }
};

module.exports = walletController;