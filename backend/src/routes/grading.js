const express = require('express');
const router = express.Router();
const GradeScale = require('../models/GradeScale');
const { authMiddleware, requireRole } = require('../middleware/auth');

const DEFAULT_GRADES = [
  { grade: 'A+', minMark: 80, gradePoint: 5.0, isFail: false },
  { grade: 'A', minMark: 70, gradePoint: 4.0, isFail: false },
  { grade: 'A-', minMark: 60, gradePoint: 3.5, isFail: false },
  { grade: 'B', minMark: 50, gradePoint: 3.0, isFail: false },
  { grade: 'C', minMark: 40, gradePoint: 2.0, isFail: false },
  { grade: 'D', minMark: 33, gradePoint: 1.0, isFail: false },
  { grade: 'F', minMark: 0, gradePoint: 0, isFail: true },
];

// GET /api/grading — return school's gradeScale, seed defaults if none
router.get('/', authMiddleware, requireRole(['admin', 'staff', 'teacher']), async (req, res) => {
  try {
    let scale = await GradeScale.findOne({ school_id: req.user.school_id });
    if (!scale) {
      scale = await GradeScale.create({
        school_id: req.user.school_id,
        grades: DEFAULT_GRADES,
      });
    }
    res.json({ success: true, data: scale });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/grading — replace grades array
router.put('/', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { grades } = req.body;
    if (!Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ success: false, message: 'grades array is required' });
    }
    const scale = await GradeScale.findOneAndUpdate(
      { school_id: req.user.school_id },
      { grades },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ success: true, data: scale });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
