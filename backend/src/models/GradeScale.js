const mongoose = require('mongoose');

const gradeEntrySchema = new mongoose.Schema(
  {
    grade: { type: String, required: true, trim: true },
    minMark: { type: Number, required: true, min: 0 },
    gradePoint: { type: Number, required: true, min: 0 },
    isFail: { type: Boolean, default: false },
  },
  { _id: false }
);

const gradeScaleSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, unique: true },
    grades: [gradeEntrySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('GradeScale', gradeScaleSchema);
