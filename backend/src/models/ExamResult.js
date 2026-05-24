const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    session: { type: String, trim: true, default: '' },
    class: { type: String, trim: true, default: '' },
    section: { type: String, trim: true, default: '' },
    subject: { type: String, trim: true, default: '' },
    writtenMark: { type: Number, default: 0, min: 0 },
    mcqMark: { type: Number, default: 0, min: 0 },
    practicalMark: { type: Number, default: 0, min: 0 },
    totalMark: { type: Number, default: 0 },
    grade: { type: String, default: '' },
    gradePoint: { type: Number, default: 0 },
    isFail: { type: Boolean, default: false },
  },
  { timestamps: true }
);

examResultSchema.index({ school_id: 1, exam_id: 1, student_id: 1, subject: 1 }, { unique: true });
examResultSchema.index({ school_id: 1, exam_id: 1 });
examResultSchema.index({ school_id: 1, student_id: 1 });

module.exports = mongoose.model('ExamResult', examResultSchema);
