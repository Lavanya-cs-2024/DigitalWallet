// src/config/phonepe.js
const { StandardCheckoutClient, Env } = require('@phonepe-pg/pg-sdk-node');
require('dotenv').config();

const requiredVars = [
    'PHONEPE_CLIENT_ID',
    'PHONEPE_CLIENT_SECRET',
    'PHONEPE_CLIENT_VERSION',
    'PHONEPE_WEBHOOK_USERNAME',
    'PHONEPE_WEBHOOK_PASSWORD',
    'PHONEPE_REDIRECT_URL'
];

for (const varName of requiredVars) {
    if (!process.env[varName]) {
        throw new Error(`[phonepe] Missing required environment variable: ${varName}`);
    }
}

const clientId = process.env.PHONEPE_CLIENT_ID;
const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
const clientVersion = parseInt(process.env.PHONEPE_CLIENT_VERSION, 10);
const env = process.env.PHONEPE_ENV === 'production' ? Env.PRODUCTION : Env.SANDBOX;

// Initialize singleton [citation:1]
const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);

/**
 * Generates a unique order ID for PhonePe.
 */
function generateMerchantOrderId(localOrderId) {
    const timestamp = Date.now();
    return `wallet_order_${localOrderId}_${timestamp}`;
}

module.exports = {
    client,
    webhookUsername: process.env.PHONEPE_WEBHOOK_USERNAME,
    webhookPassword: process.env.PHONEPE_WEBHOOK_PASSWORD,
    redirectUrl: process.env.PHONEPE_REDIRECT_URL,
    MIN_INR: 10.00,
    MAX_INR: 50000.00,
    generateMerchantOrderId
};