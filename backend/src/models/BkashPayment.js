const mongoose = require('mongoose');

/**
 * BkashPayment — persists every bKash transaction attempt.
 *
 * type='fee'          → student fee payment initiated from a PaymentLink
 * type='subscription' → school admin paying the platform subscription
 */
const bkashPaymentSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },

    type: {
      type: String,
      enum: ['fee', 'subscription', 'sms'],
      required: true,
    },

    // ── Fee payment fields ──────────────────────────────────────────────────
    fee_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'Fee',         default: null },
    payment_link_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentLink', default: null },

    // ── Subscription payment fields ─────────────────────────────────────────
    plan_slug: { type: String, default: null },

    // ── SMS order payment fields ──────────────────────────────────────────
    sms_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SmsOrder', default: null },

    // ── bKash response fields ───────────────────────────────────────────────
    /** Returned by Create Payment API; used to execute & query */
    paymentID: { type: String, required: true, unique: true },

    /** Returned by Execute Payment API after customer completes payment */
    trxID: { type: String, default: null },

    merchantInvoiceNumber: { type: String },

    amount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },

    /** Customer's bKash wallet number — populated after execute */
    customerMsisdn: { type: String, default: null },
  },
  { timestamps: true }
);

bkashPaymentSchema.index({ paymentID: 1 }, { unique: true });
bkashPaymentSchema.index({ school_id: 1 });
bkashPaymentSchema.index({ school_id: 1, type: 1, status: 1 });
bkashPaymentSchema.index({ fee_id: 1 });

module.exports = mongoose.model('BkashPayment', bkashPaymentSchema);
