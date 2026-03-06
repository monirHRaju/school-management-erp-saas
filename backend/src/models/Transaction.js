const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, trim: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    note: { type: String, trim: true },
    related_fee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Fee' },
  },
  { timestamps: true }
);

transactionSchema.index({ school_id: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
