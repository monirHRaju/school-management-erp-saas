const mongoose = require('mongoose');

const academicConfigSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, unique: true },
    classes: [{ type: String, trim: true }],
    sections: [{ type: String, trim: true }],
    shifts: [{ type: String, trim: true }],
    groups: [{ type: String, trim: true }],
    classSubjects: [{
      class: { type: String, required: true, trim: true },
      subjects: [{ type: String, trim: true }],
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('AcademicConfig', academicConfigSchema);
