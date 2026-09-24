// modules/wallet/wallet.controller.js
const walletService = require('./wallet.service');
const { HTTP_STATUS } = require('../../config/constants');

function requireUser(req, res) {
    if (!req.user || !req.user.id) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: 'Authentication required.',
            code: 'TOKEN_INVALID'
        });
        return null;
    }
    return req.user;
}

const walletController = {
    getStatus: async (req, res, next) => {
        try {
            const user = requireUser(req, res);
            if (!user) return;

            const result = await walletService.getStatus({ userId: user.id });
            res.status(HTTP_STATUS.OK).json({ success: true, data: result });
        } catch (error) { next(error); }
    },

    createWallet: async (req, res, next) => {
        try {
            const user = requireUser(req, res);
            if (!user) return;

            const wallet = await walletService.createWallet({ userId: user.id });
            res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Wallet created successfully.',
                data: { wallet }
            });
        } catch (error) {
            if (error.code === 'WALLET_EXISTS') {
                return res.status(HTTP_STATUS.CONFLICT).json({
                    success: false,
                    message: error.message,
                    code: 'WALLET_EXISTS'
                });
            }
            next(error);
        }
    },

    getSummary: async (req, res, next) => {
        try {
            const user = requireUser(req, res);
            if (!user) return;

            const summary = await walletService.getSummary({ userId: user.id });
            res.status(HTTP_STATUS.OK).json({ success: true, data: summary });
        } catch (error) { next(error); }
    }
};

module.exports = walletController;