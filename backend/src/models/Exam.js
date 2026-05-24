const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    name: { type: String, required: true, trim: true },
    session: { type: String, trim: true, default: '' },
    class: { type: String, trim: true, default: '' },
    term: { type: String, trim: true, default: '' },
    examDate: { type: Date, default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

examSchema.index({ school_id: 1 });
examSchema.index({ school_id: 1, session: 1, class: 1 });

module.exports = mongoose.model('Exam', examSchema);
