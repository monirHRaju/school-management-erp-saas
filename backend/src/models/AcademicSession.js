const mongoose = require('mongoose');

const academicSessionSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    name: { type: String, required: true, trim: true },
    year: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

academicSessionSchema.index({ school_id: 1 });
academicSessionSchema.index({ school_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('AcademicSession', academicSessionSchema);
