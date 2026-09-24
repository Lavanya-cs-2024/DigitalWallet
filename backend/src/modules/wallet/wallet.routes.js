// modules/wallet/wallet.routes.js
const express = require('express');
const router = express.Router();

const walletController = require('./wallet.controller');
const { protect } = require('../../middleware/auth.middleware');

// Every wallet route requires a valid JWT
router.get('/status', protect, walletController.getStatus);
router.post('/create', protect, walletController.createWallet);
router.get('/summary', protect, walletController.getSummary);

module.exports = router;