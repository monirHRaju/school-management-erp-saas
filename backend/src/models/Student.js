const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    name: { type: String, required: true, trim: true },
    fatherName: { type: String, trim: true },
    motherName: { type: String, trim: true },
    guardianName: { type: String, trim: true },
    guardianPhone: { type: String, trim: true },
    photoUrl: { type: String, trim: true },
    shift: { type: String, trim: true },
    group: { type: String, trim: true },
    dateOfBirth: { type: Date },
    birthRegNo: { type: String, trim: true },
    gender: { type: String, trim: true },
    religion: { type: String, trim: true },
    class: { type: String, trim: true },
    section: { type: String, trim: true },
    rollNo: { type: String, trim: true },
    monthlyFee: { type: Number, min: 0 },
    admissionDate: { type: Date },
    status: { type: String, enum: ['active', 'inactive', 'left'], default: 'active' },
  },
  { timestamps: true }
);

studentSchema.index({ school_id: 1 });
studentSchema.index({ school_id: 1, class: 1, section: 1 });
studentSchema.index({ school_id: 1, status: 1 });

module.exports = mongoose.model('Student', studentSchema);
