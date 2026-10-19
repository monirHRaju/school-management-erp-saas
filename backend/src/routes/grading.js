const express = require('express');
const router = express.Router();
const GradeScale = require('../models/GradeScale');
const { DEFAULT_GRADES } = require('../utils/gradeCalc');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// GET /api/grading — return school's gradeScale, seed defaults if none
router.get('/', authMiddleware, requireRole('admin', 'staff', 'teacher'), async (req, res) => {
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
    res.status(500).json({ success: false, error: err.message, message: err.message });
  }
});

// PUT /api/grading — replace grades array
router.put('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { grades } = req.body;
    if (!Array.isArray(grades) || grades.length === 0) {
      const msg = 'grades array is required';
      return res.status(400).json({ success: false, error: msg, message: msg });
    }
    const scale = await GradeScale.findOneAndUpdate(
      { school_id: req.user.school_id },
      { grades },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ success: true, data: scale });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, message: err.message });
  }
});

module.exports = router;
