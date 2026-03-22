const express = require('express');
const authMiddleware = require('../middleware/auth');
const Student = require('../models/Student');
const Fee = require('../models/Fee');
const Transaction = require('../models/Transaction');
const Income = require('../models/Income');
const Attendance = require('../models/Attendance');
const mongoose = require('mongoose');

const router = express.Router();

// GET /api/dashboard — dashboard stats for current school
router.get('/', authMiddleware, async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);

    const totalStudents = await Student.countDocuments({ school_id: schoolId, status: 'active' });

    // Today's attendance
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const presentToday = await Attendance.countDocuments({
      school_id: schoolId,
      date: todayStart,
      status: 'present',
    });
    const todayAttendancePercent =
      totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0;

    const dueAgg = await Fee.aggregate([
      { $match: { school_id: schoolId, status: { $in: ['unpaid', 'partial'] } } },
      { $group: { _id: null, total: { $sum: '$due_amount' } } },
    ]);
    const totalDueFees = dueAgg[0]?.total ?? 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthIncomeAgg = await Income.aggregate([
      { $match: { school_id: schoolId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    let monthIncome = monthIncomeAgg[0]?.total ?? 0;
    const monthExpenseAgg = await Transaction.aggregate([
      {
        $match: {
          school_id: schoolId,
          type: 'expense',
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const monthExpense = monthExpenseAgg[0]?.total ?? 0;
    const monthIncomeFromTx = await Transaction.aggregate([
      {
        $match: {
          school_id: schoolId,
          type: 'income',
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    monthIncome += monthIncomeFromTx[0]?.total ?? 0;
    const netBalance = monthIncome - monthExpense;

    const recentTransactions = await Transaction.find({ school_id: schoolId })
      .sort({ date: -1, createdAt: -1 })
      .limit(5)
      .lean();

    const recentIncome = await Income.find({ school_id: schoolId })
      .sort({ date: -1, createdAt: -1 })
      .limit(5)
      .populate('student_id', 'name')
      .lean();
    const recentPayments = recentIncome.map((t) => ({
      studentName: t.student_id?.name ?? '—',
      month: null,
      amount: t.amount,
      date: t.date,
    }));

    const data = {
      totalStudents,
      todayAttendancePercent,
      monthIncome,
      monthExpense,
      netBalance,
      totalDueFees,
      recentTransactions,
      recentPayments,
    };

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

