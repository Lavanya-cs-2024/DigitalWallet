// ============================================
// PAYMENT VALIDATION — Input Rules (Paytm)
// ============================================
// TTD alignment:
//   §5 — amount must be a JSON *string*, decimal, up to 2 places
//   §2 — VALIDATION_ERROR (400) for malformed input
//   §22 — orderId format: "po_<digits>" or "po_<digits>_<ts>_<rand>"
// ============================================
const { body, header } = require('express-validator');

// "10", "10.0", "10.00" — no sign, no exponent, no whitespace
const AMOUNT_REGEX = /^\d+(\.\d{1,2})?$/;

// "po_42" or "po_42_1727891234567_a1b2c3"
const ORDER_ID_REGEX = /^po_\d+(_\d+_[a-z0-9]+)?$/;

// ============================================
// CREATE ORDER
// ============================================
const createOrderSchema = [
    header('idempotency-key')
        .exists().withMessage('Idempotency-Key header is required')
        .isString().withMessage('Idempotency-Key must be a string')
        .isLength({ min: 8, max: 64 }).withMessage('Idempotency-Key must be 8–64 chars'),

    body('amount')
        .exists().withMessage('Amount is required')
        .isString().withMessage('Amount must be a string (not a JSON number)')
        .matches(AMOUNT_REGEX).withMessage('Amount must be a decimal string with up to 2 decimal places')
];

// ============================================
// VERIFY STATUS
// ============================================
const verifyStatusSchema = [
    body('orderId')
        .exists().withMessage('orderId is required')
        .isString().withMessage('orderId must be a string')
        .matches(ORDER_ID_REGEX).withMessage('orderId must be in format po_<number>')
];

// ============================================
// CANCEL ORDER
// ============================================
const cancelOrderSchema = [
    body('orderId')
        .exists().withMessage('orderId is required')
        .isString().withMessage('orderId must be a string')
        .matches(ORDER_ID_REGEX).withMessage('orderId must be in format po_<number>')
];

module.exports = {
    createOrderSchema,
    verifyStatusSchema,
    cancelOrderSchema
};