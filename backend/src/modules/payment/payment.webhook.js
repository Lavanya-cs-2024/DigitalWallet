// src/modules/payment/payment.webhook.js
const phonepe = require('../../config/phonepe');
const paymentService = require('./payment.service');
const prisma = require('../../config/prisma');

const paymentWebhook = {
    handleWebhook: async (req, res) => {
        console.log('🔔 [webhook] Hit');
        console.log('   auth header:', req.headers.authorization ? 'present' : 'missing');
        console.log('   body keys:', Object.keys(req.body || {}));

        try {
            const authorization = req.headers['authorization'];
            const responseBody = req.body;

            if (!authorization || !responseBody) {
                return res.status(400).json({
                    error: 'INVALID_WEBHOOK',
                    message: 'Missing authorization or body'
                });
            }

            // Verify signature using PhonePe SDK
            const callbackResponse = phonepe.client.validateCallback(
                phonepe.webhookUsername,
                phonepe.webhookPassword,
                authorization,
                JSON.stringify(responseBody)
            );

            console.log('   ✅ signature verified');
            console.log('   event type:', callbackResponse.type);

            const { type, payload } = callbackResponse;

            if (type !== 'PG_ORDER_COMPLETED' && type !== 'PG_ORDER_FAILED') {
                return res.status(200).json({ success: true, message: 'Ignored event type' });
            }

            const merchantOrderId = payload.originalMerchantOrderId;
            const order = await prisma.paymentOrder.findUnique({
                where: { paytmOrderId: merchantOrderId }
            });

            if (!order) {
                console.log('   ⚠️ order not found for:', merchantOrderId);
                return res.status(200).json({ success: true, message: 'Order not found' });
            }

            console.log('   matched order: po_' + order.id);

            if (type === 'PG_ORDER_COMPLETED') {
                await paymentService.settlePayment(order.id, payload, payload.orderId);
                console.log('   ✅ settled');
            } else if (type === 'PG_ORDER_FAILED') {
                await paymentService.markFailed(order.id, payload);
                console.log('   ✅ marked failed');
            }

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('❌ [webhook] Error:', error.message);
            return res.status(500).json({
                error: 'INTERNAL_ERROR',
                message: error.message
            });
        }
    }
};

module.exports = paymentWebhook;