const mongoose = require('mongoose');

const examWeightSchema = new mongoose.Schema(
  {
    examName: { type: String, trim: true },
    weight: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

const resultSettingsSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, unique: true },
    finalResultMethod: {
      type: String,
      enum: ['average_all', 'final_only', 'weighted'],
      default: 'average_all',
    },
    finalExamName: { type: String, trim: true, default: 'Final' },
    includeOptionalSubjects: { type: Boolean, default: false },
    passMark: { type: Number, default: 33, min: 0 },
    gpaMethod: {
      type: String,
      enum: ['subject_average', 'total_marks'],
      default: 'subject_average',
    },
    examWeights: [examWeightSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('ResultSettings', resultSettingsSchema);
