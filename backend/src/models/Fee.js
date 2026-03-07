const mongoose = require('mongoose');

// Canonical categories for fees and income reports (replaces legacy fee_type)
const FEE_CATEGORIES = [
  'student_fee',
  'book_sales',
  'stationery',
  'exam_fee',
  'syllabus_fee',
  'fine',
  'other',
];

const feeSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    category: { type: String, enum: FEE_CATEGORIES, required: true },
    month: { type: String, trim: true, default: '' }, // YYYY-MM for monthly/reference; '' for one-off
    description: { type: String, trim: true, default: '' },
    total_fee: { type: Number, default: 0 },
    paid_amount: { type: Number, default: 0 },
    due_amount: { type: Number, default: 0 },
    status: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'unpaid' },
    // Legacy: support old fee_type for backward compatibility when reading
    fee_type: { type: String, trim: true },
  },
  { timestamps: true }
);

feeSchema.index({ school_id: 1, month: 1 });
feeSchema.index({ school_id: 1, student_id: 1 });
feeSchema.index({ school_id: 1, status: 1 });
feeSchema.index({ school_id: 1, student_id: 1, month: 1, category: 1 });

module.exports = mongoose.model('Fee', feeSchema);
module.exports.FEE_CATEGORIES = FEE_CATEGORIES;
