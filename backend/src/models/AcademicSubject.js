const mongoose = require('mongoose');

const academicSubjectSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    classes: [{ type: String, trim: true }],
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: '' },
    writtenMark: { type: Number, default: 0, min: 0 },
    mcqMark: { type: Number, default: 0, min: 0 },
    practicalMark: { type: Number, default: 0, min: 0 },
    type: { type: String, enum: ['Main', 'Optional'], default: 'Main' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

academicSubjectSchema.index({ school_id: 1 });
academicSubjectSchema.index({ school_id: 1, name: 1, classes: 1 });

module.exports = mongoose.model('AcademicSubject', academicSubjectSchema);
