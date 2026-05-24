const mongoose = require('mongoose');

const academicGroupSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

academicGroupSchema.index({ school_id: 1 });
academicGroupSchema.index({ school_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('AcademicGroup', academicGroupSchema);
