// src/modules/payment/payment.validation.js
const { body, header } = require('express-validator');
const AMOUNT_REGEX = /^\d+(\.\d{1,2})?$/;
const ORDER_ID_REGEX = /^po_\d+(_\d+_[a-z0-9]+)?$/;

const createOrderSchema = [
    header('idempotency-key').exists().isString().isLength({ min: 8, max: 64 }),
    body('amount').exists().isString().matches(AMOUNT_REGEX)
];

const verifyStatusSchema = [
    body('orderId').exists().isString().matches(ORDER_ID_REGEX)
];

const cancelOrderSchema = [
    body('orderId').exists().isString().matches(ORDER_ID_REGEX)
];

module.exports = { createOrderSchema, verifyStatusSchema, cancelOrderSchema };