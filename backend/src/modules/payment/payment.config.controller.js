// src/modules/payment/payment.config.controller.js
const paymentConfigController = {
    getPaymentConfig: (req, res) => {
        res.status(200).json({
            success: true,
            data: {
                provider: 'phonepe',
                environment: process.env.PHONEPE_ENV || 'sandbox',
                currency: 'INR',
                minAmount: 10.00,
                maxAmount: 50000.00
            }
        });
    }
};

module.exports = paymentConfigController;