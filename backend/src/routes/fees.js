const express = require('express');
const mongoose = require('mongoose');
const Fee = require('../models/Fee');
const Transaction = require('../models/Transaction');
const Student = require('../models/Student');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Map fee_type to transaction category (income)
const FEE_TYPE_TO_CATEGORY = {
  monthly: 'Fee',
  admission: 'Admission',
  exam: 'Exam',
  book: 'Book',
  other: 'Other',
};

// GET /api/fees — list fees with filters; optional summary; support student_id for individual report
router.get('/', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { month, status, class: classFilter, student_id: studentIdParam, fee_type: feeTypeParam } = req.query;

    const match = { school_id: schoolId };
    if (month && typeof month === 'string' && month.trim()) {
      match.month = month.trim();
    }
    if (status && ['unpaid', 'partial', 'paid'].includes(status)) {
      match.status = status;
    }
    if (feeTypeParam && ['monthly', 'admission', 'exam', 'book', 'other'].includes(feeTypeParam)) {
      match.fee_type = feeTypeParam;
    }
    if (studentIdParam && mongoose.isValidObjectId(studentIdParam)) {
      match.student_id = new mongoose.Types.ObjectId(studentIdParam);
    }

    let query = Fee.find(match)
      .populate('student_id', 'name class section rollNo')
      .sort({ month: -1, fee_type: 1, createdAt: -1 })
      .lean();

    if (classFilter && typeof classFilter === 'string' && classFilter.trim() && !match.student_id) {
      const studentIds = await Student.find(
        { school_id: schoolId, class: classFilter.trim() },
        { _id: 1 }
      ).lean();
      const ids = studentIds.map((s) => s._id);
      match.student_id = { $in: ids };
      query = Fee.find(match)
        .populate('student_id', 'name class section rollNo')
        .sort({ month: -1, fee_type: 1, createdAt: -1 })
        .lean();
    }

    const fees = await query;

    const summary = {
      totalDue: fees
        .filter((f) => f.status === 'unpaid' || f.status === 'partial')
        .reduce((sum, f) => sum + (f.due_amount || 0), 0),
      unpaidCount: fees.filter((f) => f.status === 'unpaid' || f.status === 'partial').length,
    };

    res.json({ success: true, data: fees, summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/fees/generate-month — create/update monthly fees for active students for given month
router.post('/generate-month', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { month } = req.body;
    if (!month || typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month.trim())) {
      return res.status(400).json({ success: false, error: 'month required (YYYY-MM)' });
    }
    const monthStr = month.trim();

    await Fee.updateMany(
      { school_id: schoolId, fee_type: { $exists: false }, month: { $regex: /^\d{4}-\d{2}$/ } },
      { $set: { fee_type: 'monthly' } }
    );

    const students = await Student.find(
      { school_id: schoolId, status: 'active' },
      { _id: 1, monthlyFee: 1 }
    ).lean();

    let created = 0;
    let updated = 0;
    for (const stu of students) {
      const totalFee = typeof stu.monthlyFee === 'number' && stu.monthlyFee >= 0 ? stu.monthlyFee : 0;
      const existing = await Fee.findOne({
        school_id: schoolId,
        student_id: stu._id,
        $or: [{ fee_type: 'monthly' }, { fee_type: { $exists: false } }],
        month: monthStr,
      }).lean();
      if (existing) {
        const paid = existing.paid_amount || 0;
        const due = Math.max(0, totalFee - paid);
        const status = due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
        await Fee.updateOne(
          { _id: existing._id },
          {
            $set: {
              fee_type: 'monthly',
              total_fee: totalFee,
              due_amount: due,
              status,
            },
          }
        );
        updated += 1;
      } else {
        const due = Math.max(0, totalFee);
        await Fee.create({
          school_id: schoolId,
          student_id: stu._id,
          fee_type: 'monthly',
          month: monthStr,
          total_fee: totalFee,
          paid_amount: 0,
          due_amount: due,
          status: due <= 0 ? 'paid' : 'unpaid',
        });
        created += 1;
      }
    }

    res.json({
      success: true,
      data: { month: monthStr, created, updated, totalStudents: students.length },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/fees/generate-year — create/update monthly fees from January to December for active students
router.post('/generate-year', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { year } = req.body;
    const y = year != null ? Number(year) : new Date().getFullYear();
    if (isNaN(y) || y < 2000 || y > 2100) {
      return res.status(400).json({ success: false, error: 'year required (e.g. 2025)' });
    }

    const students = await Student.find(
      { school_id: schoolId, status: 'active' },
      { _id: 1, monthlyFee: 1 }
    ).lean();

    let totalCreated = 0;
    let totalUpdated = 0;
    for (let m = 1; m <= 12; m += 1) {
      const monthStr = `${y}-${String(m).padStart(2, '0')}`;
      for (const stu of students) {
        const totalFee = typeof stu.monthlyFee === 'number' && stu.monthlyFee >= 0 ? stu.monthlyFee : 0;
        const existing = await Fee.findOne({
          school_id: schoolId,
          student_id: stu._id,
          $or: [{ fee_type: 'monthly' }, { fee_type: { $exists: false } }],
          month: monthStr,
        }).lean();
        if (existing) {
          const paid = existing.paid_amount || 0;
          const due = Math.max(0, totalFee - paid);
          const status = due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
          await Fee.updateOne(
            { _id: existing._id },
            { $set: { fee_type: 'monthly', total_fee: totalFee, due_amount: due, status } }
          );
          totalUpdated += 1;
        } else {
          const due = Math.max(0, totalFee);
          await Fee.create({
            school_id: schoolId,
            student_id: stu._id,
            fee_type: 'monthly',
            month: monthStr,
            total_fee: totalFee,
            paid_amount: 0,
            due_amount: due,
            status: due <= 0 ? 'paid' : 'unpaid',
          });
          totalCreated += 1;
        }
      }
    }

    res.json({
      success: true,
      data: { year: y, created: totalCreated, updated: totalUpdated, totalStudents: students.length },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/fees/one-time — create one-time fee (admission, exam, book, other) for a student
router.post('/one-time', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { student_id, fee_type, amount } = req.body;
    if (!student_id || !fee_type || amount === undefined || amount === null) {
      return res.status(400).json({ success: false, error: 'student_id, fee_type, and amount are required' });
    }
    if (!['admission', 'exam', 'book', 'other'].includes(fee_type)) {
      return res.status(400).json({ success: false, error: 'fee_type must be admission, exam, book, or other' });
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'amount must be a positive number' });
    }

    const student = await Student.findOne({
      _id: new mongoose.Types.ObjectId(student_id),
      school_id: schoolId,
    }).lean();
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const existing = await Fee.findOne({
      school_id: schoolId,
      student_id: new mongoose.Types.ObjectId(student_id),
      fee_type,
      month: '',
    }).lean();
    if (existing) {
      return res.status(400).json({ success: false, error: `A ${fee_type} fee already exists for this student` });
    }

    const fee = await Fee.create({
      school_id: schoolId,
      student_id: new mongoose.Types.ObjectId(student_id),
      fee_type,
      month: '',
      total_fee: numAmount,
      paid_amount: 0,
      due_amount: numAmount,
      status: 'unpaid',
    });

    const populated = await Fee.findById(fee._id)
      .populate('student_id', 'name class section rollNo')
      .lean();

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/fees/pay — record payment by student_id + month (for monthly fees)
router.post('/pay', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { student_id, month, amount } = req.body;
    if (!student_id || !month || amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        error: 'student_id, month, and amount are required',
      });
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'amount must be a positive number' });
    }
    const monthStr = String(month).trim();
    if (!/^\d{4}-\d{2}$/.test(monthStr)) {
      return res.status(400).json({ success: false, error: 'month must be YYYY-MM' });
    }

    const fee = await Fee.findOne({
      school_id: schoolId,
      student_id: new mongoose.Types.ObjectId(student_id),
      $or: [{ fee_type: 'monthly' }, { fee_type: { $exists: false } }],
      month: monthStr,
    });
    if (!fee) {
      return res.status(404).json({
        success: false,
        error: 'Fee record not found for this student and month. Generate the month first.',
      });
    }

    const newPaid = (fee.paid_amount || 0) + numAmount;
    const totalFee = fee.total_fee || 0;
    const newDue = Math.max(0, totalFee - newPaid);
    const newStatus = newDue <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

    fee.paid_amount = newPaid;
    fee.due_amount = newDue;
    fee.status = newStatus;
    await fee.save();

    const category = FEE_TYPE_TO_CATEGORY[fee.fee_type] || 'Fee';
    const transaction = await Transaction.create({
      school_id: schoolId,
      type: 'income',
      category,
      amount: numAmount,
      date: new Date(),
      note: fee.fee_type === 'monthly' ? `Fee payment for ${monthStr}` : `${fee.fee_type} fee payment`,
      related_fee_id: fee._id,
    });

    const updatedFee = await Fee.findById(fee._id)
      .populate('student_id', 'name class section rollNo')
      .lean();

    res.status(201).json({
      success: true,
      data: {
        fee: updatedFee,
        transaction: {
          _id: transaction._id,
          type: transaction.type,
          category: transaction.category,
          amount: transaction.amount,
          date: transaction.date,
          related_fee_id: transaction.related_fee_id,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/fees/:id/pay — record payment by fee id (works for any fee type; used by Collect button)
router.post('/:id/pay', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const feeId = req.params.id;
    const { amount } = req.body;
    if (!mongoose.isValidObjectId(feeId)) {
      return res.status(400).json({ success: false, error: 'Invalid fee id' });
    }
    if (amount === undefined || amount === null) {
      return res.status(400).json({ success: false, error: 'amount is required' });
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'amount must be a positive number' });
    }

    const fee = await Fee.findOne({ _id: feeId, school_id: schoolId });
    if (!fee) {
      return res.status(404).json({ success: false, error: 'Fee record not found' });
    }

    const newPaid = (fee.paid_amount || 0) + numAmount;
    const totalFee = fee.total_fee || 0;
    const newDue = Math.max(0, totalFee - newPaid);
    const newStatus = newDue <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

    fee.paid_amount = newPaid;
    fee.due_amount = newDue;
    fee.status = newStatus;
    await fee.save();

    const category = FEE_TYPE_TO_CATEGORY[fee.fee_type] || 'Fee';
    const note = fee.fee_type === 'monthly' && fee.month
      ? `Fee payment for ${fee.month}`
      : `${fee.fee_type} fee payment`;
    const transaction = await Transaction.create({
      school_id: schoolId,
      type: 'income',
      category,
      amount: numAmount,
      date: new Date(),
      note,
      related_fee_id: fee._id,
    });

    const updatedFee = await Fee.findById(fee._id)
      .populate('student_id', 'name class section rollNo')
      .lean();

    res.status(201).json({
      success: true,
      data: {
        fee: updatedFee,
        transaction: {
          _id: transaction._id,
          type: transaction.type,
          category: transaction.category,
          amount: transaction.amount,
          date: transaction.date,
          related_fee_id: transaction.related_fee_id,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
