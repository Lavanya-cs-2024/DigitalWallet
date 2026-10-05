// ============================================
// PAYTM CONFIG — Credentials + Endpoints + Helpers
// ============================================
const PaytmChecksum = require('paytmchecksum');

// ============================================
// ENVIRONMENT
// ============================================
const ENV = (process.env.PAYTM_ENVIRONMENT || 'staging').toLowerCase();
const IS_PRODUCTION = ENV === 'production';

// ============================================
// CREDENTIALS
// ============================================
const MID          = process.env.PAYTM_MID;
const MERCHANT_KEY = process.env.PAYTM_MERCHANT_KEY;

if (!MID || !MERCHANT_KEY) {
    throw new Error(
        '[paytm] Missing PAYTM_MID or PAYTM_MERCHANT_KEY in .env — cannot initialize Paytm config.'
    );
}

// ============================================
// ENDPOINTS
// ============================================
const PAYTM_HOST = IS_PRODUCTION
    ? 'https://securegw.paytm.in'
    : 'https://securegw-stage.paytm.in';

const CALLBACK_URL =
    process.env.PAYTM_CALLBACK_URL ||
    'https://hastiness-dial-headdress.ngrok-free.dev/api/payment/paytm/callback';

const WEBHOOK_URL =
    process.env.PAYTM_WEBHOOK_URL ||
    'https://hastiness-dial-headdress.ngrok-free.dev/api/payment/paytm/webhook';

// ============================================
// MERCHANT METADATA
// ============================================
const WEBSITE          = process.env.PAYTM_WEBSITE || 'WEBSTAGING';
const CHANNEL_ID       = process.env.PAYTM_CHANNEL_ID || 'WEB';
const INDUSTRY_TYPE_ID = process.env.PAYTM_INDUSTRY_TYPE_ID || 'Retail';

// ============================================
// AMOUNT BOUNDS (INR)
// ============================================
const MIN_INR = 10.00;
const MAX_INR = 50000.00;

// ============================================
// HELPERS
// ============================================
function generatePaytmOrderId(localOrderId) {
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    return `po_${localOrderId}_${ts}_${rand}`;
}

function toPaytmAmount(amountInRupees) {
    return parseFloat(amountInRupees).toFixed(2);
}

function buildPaymentParams({ orderId, amount, custId, email, mobile }) {
    const params = {
        MID,
        WEBSITE,
        CHANNEL_ID,
        INDUSTRY_TYPE_ID,
        ORDER_ID: orderId,
        CUST_ID: String(custId),
        TXN_AMOUNT: toPaytmAmount(amount),
        CALLBACK_URL
    };
    if (email)  params.EMAIL = email;
    if (mobile) params.MOBILE_NO = mobile;
    return params;
}

async function generateChecksum(params) {
    return PaytmChecksum.generateSignature(
        JSON.stringify(params),
        MERCHANT_KEY
    );
}

async function verifyChecksum(params) {
    const receivedChecksum = params.CHECKSUMHASH;
    if (!receivedChecksum) return false;

    const paramsCopy = { ...params };
    delete paramsCopy.CHECKSUMHASH;

    try {
        return await PaytmChecksum.verifySignature(
            JSON.stringify(paramsCopy),
            MERCHANT_KEY,
            receivedChecksum
        );
    } catch (err) {
        return false;
    }
}

// ============================================
// EXPORTS
// ============================================
module.exports = {
    IS_PRODUCTION,
    ENV,
    MID,
    MERCHANT_KEY,
    PAYTM_HOST,
    CALLBACK_URL,
    WEBHOOK_URL,
    WEBSITE,
    CHANNEL_ID,
    INDUSTRY_TYPE_ID,
    MIN_INR,
    MAX_INR,
    generatePaytmOrderId,
    toPaytmAmount,
    buildPaymentParams,
    generateChecksum,
    verifyChecksum
};