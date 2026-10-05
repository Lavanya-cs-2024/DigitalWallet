// ============================================
// PAYMENT WEBHOOK — Paytm Events
// ============================================
// TTD alignment:
//   §9  — webhook is public, checksum-authenticated
//   §11 — WebhookEvent row inserted INSIDE settlement tx
//   §13 — REVIEW_REQUIRED written outside rollback tx (in service)
//   §22 — dedup via unique (provider, eventId)
//
//   §10 — NOT APPLICABLE to Paytm. Paytm sends a single final webhook
//         (TXN_SUCCESS or TXN_FAILURE). There is no "approved but
//         not yet captured" branch, and no auto-capture. Invariants
//         I-17 and I-18 are trivially satisfied.
// ============================================
const prisma = require('../../config/prisma');
const paytm  = require('../../config/paytm');
const paymentService = require('./payment.service');

const paymentWebhook = {

    // ============================================
    // HANDLE WEBHOOK (TTD §9)
    // ============================================
    handleWebhook: async (req, res) => {
        try {
            // ---------- cheap structure checks first ----------
            const body = req.body || {};
            if (!body.ORDERID || !body.TXNID || !body.STATUS) {
                return res.status(400).json({
                    error: 'INVALID_WEBHOOK',
                    message: 'Missing ORDERID / TXNID / STATUS'
                });
            }

            // ---------- checksum verification (auth) ----------
            const isValid = await paytm.verifyChecksum(body);
            if (!isValid) {
                return res.status(401).json({
                    error: 'INVALID_WEBHOOK',
                    message: 'Checksum verification failed'
                });
            }

            // ---------- find local order (WH-08) ----------
            const order = await prisma.paymentOrder.findUnique({
                where: { paytmOrderId: body.ORDERID }
            });
            if (!order) {
                // ack — don't make Paytm retry for unknown orders
                return res.status(200).json({ success: true, ignored: 'order not found' });
            }

            // ---------- deduplicate (WH-10, WH-15) ----------
            const existing = await prisma.webhookEvent.findUnique({
                where: {
                    provider_eventId: {
                        provider: 'paytm',
                        eventId: body.TXNID
                    }
                }
            });
            if (existing && order.status === 'PAID') {
                return res.status(200).json({ success: true, message: 'Duplicate, ignored' });
            }

            // ---------- route by final status ----------
            if (body.STATUS === 'TXN_SUCCESS') {
                if (order.status === 'PAID') {
                    // WH-09
                    return res.status(200).json({ success: true, message: 'Already settled' });
                }
                // D20: settle even if local state is CANCELLED / EXPIRED / FAILED
                // §11: TXNID passed as webhookEventId → WebhookEvent inserted inside tx
                await paymentService.settlePayment(order.id, body, body.TXNID);
            } else if (body.STATUS === 'TXN_FAILURE') {
                // WH-13: mark failed only for eligible states
                await paymentService.markFailed(order.id, body);
            }
            // unknown / pending status → ignore

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Webhook error:', error);
            // WH-20: DB failure → 500 → Paytm retries
            return res.status(500).json({
                error: 'INTERNAL_ERROR',
                message: error.message
            });
        }
    }
};

module.exports = paymentWebhook;