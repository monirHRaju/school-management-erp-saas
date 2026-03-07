const mongoose = require('mongoose');

const INCOME_CATEGORIES = [
  'student_fee',
  'book_sales',
  'stationery',
  'exam_fee',
  'syllabus_fee',
  'fine',
  'other',
];

const incomeSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    category: { type: String, enum: INCOME_CATEGORIES, required: true },
    amount: { type: Number, required: true, min: 0 },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    fee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Fee' },
    date: { type: Date, required: true, default: Date.now },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

incomeSchema.index({ school_id: 1, date: -1 });
incomeSchema.index({ school_id: 1, category: 1 });
incomeSchema.index({ school_id: 1, student_id: 1 });

module.exports = mongoose.model('Income', incomeSchema);
module.exports.INCOME_CATEGORIES = INCOME_CATEGORIES;
