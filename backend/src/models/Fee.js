const mongoose = require('mongoose');

const FEE_TYPES = ['monthly', 'admission', 'exam', 'book', 'other'];

const feeSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    fee_type: { type: String, enum: FEE_TYPES, default: 'monthly' },
    month: { type: String, trim: true, default: '' }, // YYYY-MM for monthly; '' for one-time
    total_fee: { type: Number, default: 0 },
    paid_amount: { type: Number, default: 0 },
    due_amount: { type: Number, default: 0 },
    status: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'unpaid' },
  },
  { timestamps: true }
);

feeSchema.index({ school_id: 1, month: 1 });
feeSchema.index({ school_id: 1, student_id: 1, fee_type: 1, month: 1 }, { unique: true });
feeSchema.index({ school_id: 1, student_id: 1 });

module.exports = mongoose.model('Fee', feeSchema);
module.exports.FEE_TYPES = FEE_TYPES;
