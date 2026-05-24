const mongoose = require('mongoose');

const academicSectionSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    name: { type: String, required: true, trim: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession', default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

academicSectionSchema.index({ school_id: 1 });
academicSectionSchema.index({ school_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('AcademicSection', academicSectionSchema);
