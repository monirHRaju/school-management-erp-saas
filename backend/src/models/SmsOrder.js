const mongoose = require('mongoose');

const smsOrderSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    sms_count: { type: Number, required: true, min: 500 },
    amount: { type: Number, required: true, min: 0 },
    payment_method: { type: String, enum: ['manual'], default: 'manual', required: true },

    // Manual payment fields
    sender_last4: { type: String, default: null },
    manual_trxid: { type: String, default: null },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reject_reason: { type: String, default: null },
  },
  { timestamps: true }
);

smsOrderSchema.index({ school_id: 1, createdAt: -1 });
smsOrderSchema.index({ status: 1 });

module.exports = mongoose.model('SmsOrder', smsOrderSchema);
