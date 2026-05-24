const mongoose = require('mongoose');

const academicShiftSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

academicShiftSchema.index({ school_id: 1 });
academicShiftSchema.index({ school_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('AcademicShift', academicShiftSchema);
