const express = require('express');
const mongoose = require('mongoose');
const Fee = require('../models/Fee');
const FeePayment = require('../models/FeePayment');
const Income = require('../models/Income');
const Transaction = require('../models/Transaction');
const Student = require('../models/Student');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const { FEE_CATEGORIES } = require('../models/Fee');
const { INCOME_CATEGORIES } = require('../models/Income');

// Legacy fee_type to category (for reading old records)
const FEE_TYPE_TO_CATEGORY = {
  monthly: 'student_fee',
  admission: 'other',
  exam: 'exam_fee',
  book: 'book_sales',
  other: 'other',
};

function normalizeFee(fee) {
  if (!fee) return fee;
  const category = fee.category || FEE_TYPE_TO_CATEGORY[fee.fee_type] || 'other';
  return { ...fee, category };
}

function buildCategoryMatch(categoryParam) {
  if (!categoryParam || !FEE_CATEGORIES.includes(categoryParam)) return null;
  const legacyKeys = Object.keys(FEE_TYPE_TO_CATEGORY).filter((k) => FEE_TYPE_TO_CATEGORY[k] === categoryParam);
  if (legacyKeys.length === 0) return { category: categoryParam };
  return { $or: [{ category: categoryParam }, { fee_type: { $in: legacyKeys } }] };
}

// GET /api/fees — list fees with filters; supports pagination via page & limit params
router.get('/', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { month, status, class: classFilter, student_id: studentIdParam, category: categoryParam, page, limit } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const match = { school_id: schoolId };
    if (month && typeof month === 'string' && month.trim()) {
      match.month = month.trim();
    }
    if (status && ['unpaid', 'partial', 'paid'].includes(status)) {
      match.status = status;
    }
    const categoryMatch = buildCategoryMatch(categoryParam);
    if (categoryMatch) Object.assign(match, categoryMatch);
    if (studentIdParam && mongoose.isValidObjectId(studentIdParam)) {
      match.student_id = new mongoose.Types.ObjectId(studentIdParam);
    }

    if (classFilter && typeof classFilter === 'string' && classFilter.trim() && !match.student_id) {
      const studentIds = await Student.find(
        { school_id: schoolId, class: classFilter.trim() },
        { _id: 1 }
      ).lean();
      match.student_id = { $in: studentIds.map((s) => s._id) };
    }

    // Summary aggregation over full result set (not affected by pagination)
    const summaryAgg = await Fee.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalDue: { $sum: { $cond: [{ $in: ['$status', ['unpaid', 'partial']] }, '$due_amount', 0] } },
          unpaidCount: { $sum: { $cond: [{ $in: ['$status', ['unpaid', 'partial']] }, 1, 0] } },
        },
      },
    ]);
    const summary = summaryAgg[0]
      ? { totalDue: summaryAgg[0].totalDue, unpaidCount: summaryAgg[0].unpaidCount }
      : { totalDue: 0, unpaidCount: 0 };

    const total = await Fee.countDocuments(match);

    const fees = await Fee.find(match)
      .populate('student_id', 'name class section rollNo')
      .sort({ month: -1, category: 1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    res.json({
      success: true,
      data: fees.map(normalizeFee),
      summary,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/fees/generate-month — create/update monthly student_fee for all active students
router.post('/generate-month', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { month } = req.body;
    if (!month || typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month.trim())) {
      return res.status(400).json({ success: false, error: 'month required (YYYY-MM)' });
    }
    const monthStr = month.trim();

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
        $or: [{ category: 'student_fee' }, { fee_type: 'monthly' }],
        month: monthStr,
      }).lean();
      const description = monthStr ? `${monthStr} Student Fee` : '';
      if (existing) {
        const paid = existing.paid_amount || 0;
        const due = Math.max(0, totalFee - paid);
        const status = due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
        await Fee.updateOne(
          { _id: existing._id },
          {
            $set: {
              category: 'student_fee',
              total_fee: totalFee,
              due_amount: due,
              status,
              description,
            },
          }
        );
        updated += 1;
      } else {
        const due = Math.max(0, totalFee);
        await Fee.create({
          school_id: schoolId,
          student_id: stu._id,
          category: 'student_fee',
          month: monthStr,
          description,
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

// POST /api/fees/generate-year — create/update monthly student_fee for full year
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
      const description = `${monthStr} Student Fee`;
      for (const stu of students) {
        const totalFee = typeof stu.monthlyFee === 'number' && stu.monthlyFee >= 0 ? stu.monthlyFee : 0;
        const existing = await Fee.findOne({
          school_id: schoolId,
          student_id: stu._id,
          $or: [{ category: 'student_fee' }, { fee_type: 'monthly' }],
          month: monthStr,
        }).lean();
        if (existing) {
          const paid = existing.paid_amount || 0;
          const due = Math.max(0, totalFee - paid);
          const status = due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
          await Fee.updateOne(
            { _id: existing._id },
            { $set: { category: 'student_fee', total_fee: totalFee, due_amount: due, status, description } }
          );
          totalUpdated += 1;
        } else {
          const due = Math.max(0, totalFee);
          await Fee.create({
            school_id: schoolId,
            student_id: stu._id,
            category: 'student_fee',
            month: monthStr,
            description,
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

// POST /api/fees/additional — create additional fee(s): single student or all students
router.post('/additional', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { category, description, month, amount, student_id: studentIdParam, for_all_students } = req.body;

    if (!category || !FEE_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, error: 'category must be one of: ' + FEE_CATEGORIES.join(', ') });
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'amount must be a positive number' });
    }

    const monthStr = typeof month === 'string' ? month.trim() : '';
    const descStr = typeof description === 'string' ? description.trim() : (monthStr ? `${monthStr} ${category}` : category);

    let students;
    if (for_all_students) {
      students = await Student.find({ school_id: schoolId, status: 'active' }, { _id: 1 }).lean();
    } else {
      if (!studentIdParam || !mongoose.isValidObjectId(studentIdParam)) {
        return res.status(400).json({ success: false, error: 'student_id is required when not for_all_students' });
      }
      const student = await Student.findOne({
        _id: new mongoose.Types.ObjectId(studentIdParam),
        school_id: schoolId,
      }).lean();
      if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
      students = [student];
    }

    const created = [];
    for (const stu of students) {
      const fee = await Fee.create({
        school_id: schoolId,
        student_id: stu._id,
        category,
        month: monthStr,
        description: descStr,
        total_fee: numAmount,
        paid_amount: 0,
        due_amount: numAmount,
        status: 'unpaid',
      });
      created.push(fee._id);
    }

    const populated = await Fee.find({ _id: { $in: created } })
      .populate('student_id', 'name class section rollNo')
      .lean();

    res.status(201).json({
      success: true,
      data: populated.map(normalizeFee),
      count: created.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Legacy: POST /api/fees/one-time — keep for backward compat; maps fee_type to category
router.post('/one-time', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { student_id, fee_type, amount } = req.body;
    if (!student_id || !fee_type || amount === undefined || amount === null) {
      return res.status(400).json({ success: false, error: 'student_id, fee_type, and amount are required' });
    }
    const categoryMap = { admission: 'other', exam: 'exam_fee', book: 'book_sales', other: 'other' };
    const category = categoryMap[fee_type] || 'other';
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'amount must be a positive number' });
    }

    const student = await Student.findOne({
      _id: new mongoose.Types.ObjectId(student_id),
      school_id: schoolId,
    }).lean();
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    const fee = await Fee.create({
      school_id: schoolId,
      student_id: student._id,
      category,
      month: '',
      description: typeof req.body.description === 'string' ? req.body.description.trim() : `${fee_type} fee`,
      total_fee: numAmount,
      paid_amount: 0,
      due_amount: numAmount,
      status: 'unpaid',
    });

    const populated = await Fee.findById(fee._id)
      .populate('student_id', 'name class section rollNo')
      .lean();

    res.status(201).json({ success: true, data: normalizeFee(populated) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/fees/:id/history — payment history for a fee
router.get('/:id/history', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const feeId = req.params.id;
    if (!mongoose.isValidObjectId(feeId)) {
      return res.status(400).json({ success: false, error: 'Invalid fee id' });
    }

    const fee = await Fee.findOne({ _id: feeId, school_id: schoolId }).lean();
    if (!fee) return res.status(404).json({ success: false, error: 'Fee not found' });

    const payments = await FeePayment.find({ fee_id: feeId, school_id: schoolId })
      .populate('created_by', 'name')
      .sort({ payment_date: -1, createdAt: -1 })
      .lean();

    res.json({ success: true, data: payments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/fees/:id — delete a fee (and its payments + related income) e.g. if created by mistake
router.delete('/:id', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const feeId = req.params.id;
    if (!mongoose.isValidObjectId(feeId)) {
      return res.status(400).json({ success: false, error: 'Invalid fee id' });
    }

    const fee = await Fee.findOne({ _id: feeId, school_id: schoolId });
    if (!fee) return res.status(404).json({ success: false, error: 'Fee not found' });

    await FeePayment.deleteMany({ fee_id: feeId, school_id: schoolId });
    await Income.deleteMany({ fee_id: feeId, school_id: schoolId });
    await Fee.deleteOne({ _id: feeId, school_id: schoolId });

    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}); 

// POST /api/fees/:id/collect — collect payment: amount, optional discount, note; create FeePayment + Income
router.post('/:id/collect', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const userId = req.user._id;
    const feeId = req.params.id;
    const { amount, discount = 0, note = '', payment_date } = req.body;

    if (!mongoose.isValidObjectId(feeId)) {
      return res.status(400).json({ success: false, error: 'Invalid fee id' });
    }
    if (amount === undefined || amount === null) {
      return res.status(400).json({ success: false, error: 'amount is required' });
    }
    const numAmount = Number(amount);
    const numDiscount = Number(discount) || 0;
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'amount must be a positive number' });
    }
    if (numDiscount < 0) {
      return res.status(400).json({ success: false, error: 'discount cannot be negative' });
    }

    const fee = await Fee.findOne({ _id: feeId, school_id: schoolId });
    if (!fee) return res.status(404).json({ success: false, error: 'Fee record not found' });

    const totalFee = fee.total_fee || 0;
    const dueBefore = fee.due_amount || 0;
    const paidBefore = fee.paid_amount || 0;
    const effectivePayment = numAmount;
    const newPaid = paidBefore + effectivePayment;
    const newDue = Math.max(0, totalFee - newPaid);
    const newStatus = newDue <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

    fee.paid_amount = newPaid;
    fee.due_amount = newDue;
    fee.status = newStatus;
    await fee.save();

    const paymentDate = payment_date ? new Date(payment_date) : new Date();
    const feePayment = await FeePayment.create({
      school_id: schoolId,
      fee_id: fee._id,
      amount: numAmount,
      discount: numDiscount,
      note: typeof note === 'string' ? note.trim() : '',
      payment_date: paymentDate,
      created_by: userId,
    });

    const category = fee.category || FEE_TYPE_TO_CATEGORY[fee.fee_type] || 'other';
    await Income.create({
      school_id: schoolId,
      category,
      amount: numAmount,
      student_id: fee.student_id,
      fee_id: fee._id,
      date: paymentDate,
      created_by: userId,
    });

    const updatedFee = await Fee.findById(fee._id)
      .populate('student_id', 'name class section rollNo')
      .lean();

    res.status(201).json({
      success: true,
      data: {
        fee: normalizeFee(updatedFee),
        feePayment: {
          _id: feePayment._id,
          amount: feePayment.amount,
          discount: feePayment.discount,
          note: feePayment.note,
          payment_date: feePayment.payment_date,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Legacy: POST /api/fees/:id/pay — backward compat; same as collect with amount only
router.post('/:id/pay', async (req, res) => {
  const payload = {
    amount: req.body.amount,
    discount: 0,
    note: '',
    payment_date: req.body.payment_date,
  };
  req.body = { ...req.body, ...payload };
  const collectRoute = router.stack.find((r) => r.route && r.route.path === '/:id/collect');
  const handler = collectRoute && collectRoute.route.stack.find((s) => s.method === 'post');
  if (handler) return handler.handle(req, res);
  return res.status(500).json({ success: false, error: 'Collect handler not found' });
});

// POST /api/fees/pay — record payment by student_id + month (legacy; for monthly/student_fee)
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
      $or: [{ category: 'student_fee' }, { fee_type: 'monthly' }],
      month: monthStr,
    });
    if (!fee) {
      return res.status(404).json({
        success: false,
        error: 'Fee record not found for this student and month. Generate the month first.',
      });
    }

    req.params.id = fee._id.toString();
    req.body = { amount: numAmount, discount: 0, note: '' };
    const collectRoute = router.stack.find((r) => r.route && r.route.path === '/:id/collect');
    const handler = collectRoute && collectRoute.route.stack.find((s) => s.method === 'post');
    if (handler) return handler.handle(req, res);
    return res.status(500).json({ success: false, error: 'Collect handler not found' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
