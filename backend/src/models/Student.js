const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    name: { type: String, required: true, trim: true },
    guardianName: { type: String, trim: true },
    class: { type: String, trim: true },
    section: { type: String, trim: true },
    rollNo: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive', 'left'], default: 'active' },
  },
  { timestamps: true }
);

studentSchema.index({ school_id: 1 });
studentSchema.index({ school_id: 1, class: 1, section: 1 });
studentSchema.index({ school_id: 1, status: 1 });

module.exports = mongoose.model('Student', studentSchema);
