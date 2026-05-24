const mongoose = require('mongoose');

const academicClassSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    name: { type: String, required: true, trim: true },
    admissionFee: { type: Number, default: 0, min: 0 },
    examFee: { type: Number, default: 0, min: 0 },
    idCardFee: { type: Number, default: 0, min: 0 },
    sessionFee: { type: Number, default: 0, min: 0 },
    transcriptFee: { type: Number, default: 0, min: 0 },
    tuitionFee: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

academicClassSchema.index({ school_id: 1 });
academicClassSchema.index({ school_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('AcademicClass', academicClassSchema);
