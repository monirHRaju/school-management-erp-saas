const express = require('express');
const authMiddleware = require('../middleware/auth');
const Student = require('../models/Student');

const router = express.Router();

// GET /api/dashboard — dashboard stats for current school
router.get('/', authMiddleware, async (req, res) => {
  try {
    const schoolId = req.schoolId;

    const totalStudents = await Student.countDocuments({ school_id: schoolId });

    const data = {
      totalStudents,
      todayAttendancePercent: 0,
      monthIncome: 0,
      monthExpense: 0,
      netBalance: 0,
      totalDueFees: 0,
      recentTransactions: [],
      recentPayments: [],
    };

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

