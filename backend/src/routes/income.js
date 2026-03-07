const express = require('express');
const mongoose = require('mongoose');
const Income = require('../models/Income');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const { INCOME_CATEGORIES } = require('../models/Income');

// GET /api/income — list income records for reports (filter by from, to, category, student_id, page, limit)
router.get('/', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { from, to, category, student_id: studentIdParam, page = 1, limit = 50 } = req.query;

    const match = { school_id: schoolId };

    if (from && typeof from === 'string' && from.trim()) {
      match.date = match.date || {};
      match.date.$gte = new Date(from.trim());
    }
    if (to && typeof to === 'string' && to.trim()) {
      match.date = match.date || {};
      match.date.$lte = new Date(to.trim());
    }
    if (category && INCOME_CATEGORIES.includes(category)) {
      match.category = category;
    }
    if (studentIdParam && mongoose.isValidObjectId(studentIdParam)) {
      match.student_id = new mongoose.Types.ObjectId(studentIdParam);
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      Income.find(match)
        .populate('student_id', 'name class section rollNo')
        .populate('created_by', 'name')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Income.countDocuments(match),
    ]);

    res.json({ success: true, data, total });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
