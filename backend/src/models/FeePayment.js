const mongoose = require('mongoose');

const feePaymentSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    fee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Fee', required: true },
    amount: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    note: { type: String, trim: true, default: '' },
    payment_date: { type: Date, default: Date.now },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

feePaymentSchema.index({ school_id: 1, fee_id: 1 });
feePaymentSchema.index({ school_id: 1, payment_date: -1 });

module.exports = mongoose.model('FeePayment', feePaymentSchema);
