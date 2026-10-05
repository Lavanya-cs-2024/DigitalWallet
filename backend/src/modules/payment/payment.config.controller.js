// ============================================
// PAYMENT CONFIG CONTROLLER — Public Config
// ============================================
// TTD alignment:
//   Exposes only non-secret values. Merchant key never leaves the server.
//   The frontend no longer builds the payment form itself — it POSTs to
//   /create-order and receives ready-to-submit Paytm params.
// ============================================
const paytm = require('../../config/paytm');

const paymentConfigController = {

    // ============================================
    // GET PAYMENT CONFIG
    // ============================================
    getPaymentConfig: (req, res) => {
        res.status(200).json({
            success: true,
            data: {
                provider: 'paytm',
                environment: paytm.ENV,
                mode: paytm.IS_PRODUCTION ? 'production' : 'sandbox',
                currency: 'INR',
                minAmount: paytm.MIN_INR,
                maxAmount: paytm.MAX_INR,
                mid: paytm.MID,
                website: paytm.WEBSITE
            }
        });
    }
};

module.exports = paymentConfigController;