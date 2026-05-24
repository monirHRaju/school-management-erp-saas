const express = require('express');
const router = express.Router();
const ResultSettings = require('../models/ResultSettings');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// GET /api/result-settings
router.get('/', authMiddleware, requireRole(['admin', 'staff', 'teacher']), async (req, res) => {
  try {
    let settings = await ResultSettings.findOne({ school_id: req.user.school_id });
    if (!settings) {
      settings = await ResultSettings.create({ school_id: req.user.school_id });
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/result-settings
router.put('/', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const {
      finalResultMethod,
      finalExamName,
      includeOptionalSubjects,
      passMark,
      gpaMethod,
      examWeights,
    } = req.body;

    const settings = await ResultSettings.findOneAndUpdate(
      { school_id: req.user.school_id },
      {
        ...(finalResultMethod !== undefined && { finalResultMethod }),
        ...(finalExamName !== undefined && { finalExamName }),
        ...(includeOptionalSubjects !== undefined && { includeOptionalSubjects }),
        ...(passMark !== undefined && { passMark }),
        ...(gpaMethod !== undefined && { gpaMethod }),
        ...(examWeights !== undefined && { examWeights }),
      },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
