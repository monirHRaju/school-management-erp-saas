const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    school_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'School',  required: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },

    /** Stored as midnight UTC for the given calendar date */
    date: { type: Date, required: true },

    status: {
      type: String,
      enum: ['present', 'absent'],
      default: 'present',
    },
  },
  { timestamps: true }
);

// One record per student per day per school
attendanceSchema.index({ school_id: 1, date: 1, student_id: 1 }, { unique: true });
// Fast monthly lookups for a student
attendanceSchema.index({ school_id: 1, student_id: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
