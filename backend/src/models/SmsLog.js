const mongoose = require('mongoose');

const smsLogSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    type: {
      type: String,
      enum: ['attendance_absent', 'fee_generated', 'fee_due_reminder', 'payment_received', 'payment_link', 'manual'],
      required: true,
    },
    recipients: { type: Number, default: 1 },
    to: { type: String, default: '' },
    message: { type: String },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

smsLogSchema.index({ school_id: 1, createdAt: -1 });
smsLogSchema.index({ school_id: 1, type: 1 });

module.exports = mongoose.model('SmsLog', smsLogSchema);
