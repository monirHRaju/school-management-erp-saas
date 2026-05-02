'use strict';

const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Student = require('../models/Student');
const Fee = require('../models/Fee');
const Attendance = require('../models/Attendance');
const Notice = require('../models/Notice');
const User = require('../models/User');
const PaymentLink = require('../models/PaymentLink');
const FeePayment = require('../models/FeePayment');
const School = require('../models/School');
const bcrypt = require('bcryptjs');

const router = express.Router();
router.use(authMiddleware);
router.use(requireRole('guardian'));

// Helper: verify student belongs to this guardian
function ownsStudent(req, studentId) {
  const ids = (req.user.student_ids || []).map((id) => id.toString());
  return ids.includes(studentId.toString());
}

// ── GET /api/guardian/children ─────────────────────────────────────────────────
router.get('/children', async (req, res) => {
  try {
    const studentIds = req.user.student_ids || [];
    if (studentIds.length === 0) return res.json({ success: true, data: [] });

    const students = await Student.find({
      _id: { $in: studentIds },
      school_id: new mongoose.Types.ObjectId(req.schoolId),
    }).lean();

    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/guardian/children/:studentId ──────────────────────────────────────
router.get('/children/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.isValidObjectId(studentId) || !ownsStudent(req, studentId)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const student = await Student.findOne({
      _id: studentId,
      school_id: new mongoose.Types.ObjectId(req.schoolId),
    }).lean();

    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/guardian/children/:studentId/fees ─────────────────────────────────
router.get('/children/:studentId/fees', async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.isValidObjectId(studentId) || !ownsStudent(req, studentId)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { status, month } = req.query;
    const filter = {
      student_id: new mongoose.Types.ObjectId(studentId),
      school_id: new mongoose.Types.ObjectId(req.schoolId),
    };
    if (status && ['paid', 'partial', 'unpaid'].includes(status)) filter.status = status;
    if (month) filter.month = month;

    const fees = await Fee.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: fees });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/guardian/children/:studentId/attendance ───────────────────────────
router.get('/children/:studentId/attendance', async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.isValidObjectId(studentId) || !ownsStudent(req, studentId)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { month } = req.query; // YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, error: 'month query param required (YYYY-MM)' });
    }

    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, mon - 1, 1));
    const endDate = new Date(Date.UTC(year, mon, 0, 23, 59, 59, 999));

    const records = await Attendance.find({
      school_id: new mongoose.Types.ObjectId(req.schoolId),
      student_id: new mongoose.Types.ObjectId(studentId),
      date: { $gte: startDate, $lte: endDate },
    })
      .sort({ date: 1 })
      .lean();

    const totalDays = records.length;
    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;

    res.json({
      success: true,
      data: {
        month,
        records,
        summary: { totalDays, present, absent, percentage: totalDays ? Math.round((present / totalDays) * 100) : 0 },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/guardian/notices ──────────────────────────────────────────────────
router.get('/notices', async (req, res) => {
  try {
    const notices = await Notice.find({
      $or: [{ target: 'all' }, { target: req.schoolId }],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const userId = req.user._id.toString();
    const result = notices.map((n) => ({
      ...n,
      isRead: (n.read_by || []).some((id) => id.toString() === userId),
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/guardian/pay/:feeId ─────────────────────────────────────────────
// Initiates bKash payment for a fee belonging to guardian's child
router.post('/pay/:feeId', async (req, res) => {
  try {
    const { feeId } = req.params;
    if (!mongoose.isValidObjectId(feeId)) {
      return res.status(400).json({ success: false, error: 'Invalid fee id' });
    }

    const fee = await Fee.findOne({
      _id: feeId,
      school_id: new mongoose.Types.ObjectId(req.schoolId),
    }).lean();

    if (!fee) return res.status(404).json({ success: false, error: 'Fee not found' });
    if (!ownsStudent(req, fee.student_id)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if ((fee.due_amount || 0) <= 0) {
      return res.status(400).json({ success: false, error: 'Fee already paid' });
    }

    // Generate or reuse payment link
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const crypto = require('crypto');

    let link = await PaymentLink.findOne({
      fee_id: fee._id,
      school_id: new mongoose.Types.ObjectId(req.schoolId),
      status: 'active',
      expiresAt: { $gt: new Date() },
    }).lean();

    if (!link) {
      const token = crypto.randomBytes(16).toString('hex');
      link = await PaymentLink.create({
        school_id: new mongoose.Types.ObjectId(req.schoolId),
        fee_id: fee._id,
        token,
        amount: fee.due_amount,
      });
      link = link.toObject();
    }

    res.json({
      success: true,
      data: {
        payUrl: `${FRONTEND_URL}/pay/${link.token}`,
        token: link.token,
        amount: link.amount,
        expiresAt: link.expiresAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/guardian/payments — list all payments across guardian's children ─
router.get('/payments', async (req, res) => {
  try {
    const studentIds = (req.user.student_ids || []).map((id) => new mongoose.Types.ObjectId(id));
    if (studentIds.length === 0) return res.json({ success: true, data: [] });

    const schoolObjectId = new mongoose.Types.ObjectId(req.schoolId);
    const fees = await Fee.find({
      school_id: schoolObjectId,
      student_id: { $in: studentIds },
    }).select('_id student_id category month total_fee fee_type description').lean();
    const feeIds = fees.map((f) => f._id);
    const feeById = new Map(fees.map((f) => [f._id.toString(), f]));

    const payments = await FeePayment.find({
      school_id: schoolObjectId,
      fee_id: { $in: feeIds },
    })
      .sort({ payment_date: -1 })
      .limit(100)
      .lean();

    const studentMap = new Map();
    const students = await Student.find({ _id: { $in: studentIds } })
      .select('_id name class section rollNo').lean();
    students.forEach((s) => studentMap.set(s._id.toString(), s));

    const data = payments.map((p) => {
      const fee = feeById.get(p.fee_id.toString());
      const student = fee ? studentMap.get(fee.student_id.toString()) : null;
      return {
        _id: p._id,
        amount: p.amount,
        discount: p.discount,
        note: p.note,
        payment_date: p.payment_date,
        fee: fee ? {
          _id: fee._id,
          category: fee.category || fee.fee_type || 'other',
          month: fee.month,
          total_fee: fee.total_fee,
          description: fee.description,
        } : null,
        student: student ? {
          _id: student._id,
          name: student.name,
          class: student.class,
          section: student.section,
          rollNo: student.rollNo,
        } : null,
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/guardian/payments/:id — fetch one payment with full invoice data ─
router.get('/payments/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid payment id' });
    }
    const schoolObjectId = new mongoose.Types.ObjectId(req.schoolId);
    const payment = await FeePayment.findOne({ _id: req.params.id, school_id: schoolObjectId })
      .populate('created_by', 'name role')
      .lean();
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });

    const fee = await Fee.findOne({ _id: payment.fee_id, school_id: schoolObjectId }).lean();
    if (!fee) return res.status(404).json({ success: false, error: 'Fee not found' });
    if (!ownsStudent(req, fee.student_id)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const student = await Student.findOne({ _id: fee.student_id, school_id: schoolObjectId }).lean();
    const school = await School.findById(schoolObjectId).select('name address contact logoUrl').lean();

    res.json({ success: true, data: { payment, fee, student, school } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/guardian/profile ─────────────────────────────────────────────────
router.get('/profile', async (req, res) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /api/guardian/profile ───────────────────────────────────────────────
router.patch('/profile', async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const update = {};

    if (name && name.trim()) update.name = name.trim();

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, error: 'Current password is required' });
      }
      const user = await User.findById(req.user._id).select('+passwordHash');
      if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
        return res.status(401).json({ success: false, error: 'Current password is incorrect' });
      }
      update.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: 'Nothing to update' });
    }

    const updated = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true }).lean();
    delete updated.passwordHash;

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
