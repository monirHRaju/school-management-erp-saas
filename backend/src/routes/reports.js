const express = require('express');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Fee = require('../models/Fee');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(authMiddleware);

const MAX_REPORT_ROWS = 5000;

// GET /api/reports/students — filtered student list with fee totals for reporting & export
router.get(
  '/students',
  requireRole('admin', 'staff', 'accountant', 'teacher'),
  async (req, res) => {
    try {
      const {
        session,
        class: classFilter,
        section,
        shift,
        group,
        status,
        gender,
        religion,
        bloodGroup,
        admissionFrom,
        admissionTo,
        q,
      } = req.query;

      const schoolId = new mongoose.Types.ObjectId(req.schoolId);
      const filter = { school_id: schoolId };

      if (session) filter.session = String(session).trim();
      if (classFilter) filter.class = String(classFilter).trim();
      if (section) filter.section = String(section).trim();
      if (shift) filter.shift = String(shift).trim();
      if (group) filter.group = String(group).trim();
      if (gender) filter.gender = String(gender).trim();
      if (religion) filter.religion = String(religion).trim();
      if (bloodGroup) filter.bloodGroup = String(bloodGroup).trim();

      if (!status || status === '') {
        filter.status = 'active';
      } else if (status !== 'all' && ['active', 'inactive', 'left'].includes(String(status))) {
        filter.status = String(status);
      }

      if (admissionFrom || admissionTo) {
        filter.admissionDate = {};
        if (admissionFrom) {
          const fromDate = new Date(String(admissionFrom));
          if (!isNaN(fromDate.getTime())) filter.admissionDate.$gte = fromDate;
        }
        if (admissionTo) {
          const toDate = new Date(String(admissionTo));
          if (!isNaN(toDate.getTime())) {
            toDate.setUTCHours(23, 59, 59, 999);
            filter.admissionDate.$lte = toDate;
          }
        }
        if (Object.keys(filter.admissionDate).length === 0) {
          delete filter.admissionDate;
        }
      }

      const conditions = [filter];
      if (q && typeof q === 'string' && q.trim()) {
        const term = q.trim();
        const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(safe, 'i');
        conditions.push({
          $or: [
            { name: regex },
            { nameBn: regex },
            { rollNo: regex },
            { studentId: regex },
            { fatherName: regex },
            { guardianPhone: regex },
          ],
        });
      }

      const finalFilter = conditions.length > 1 ? { $and: conditions } : filter;

      const [total, students] = await Promise.all([
        Student.countDocuments(finalFilter),
        Student.find(finalFilter)
          .collation({ locale: 'en', numericOrdering: true })
          .sort({ class: 1, section: 1, rollNo: 1, name: 1 })
          .limit(MAX_REPORT_ROWS)
          .lean(),
      ]);

      const studentIds = students.map((s) => s._id);
      const feeAgg =
        studentIds.length > 0
          ? await Fee.aggregate([
              {
                $match: {
                  school_id: schoolId,
                  student_id: { $in: studentIds },
                },
              },
              {
                $group: {
                  _id: '$student_id',
                  feeTotal: { $sum: '$total_fee' },
                  feePaid: { $sum: '$paid_amount' },
                  feeDiscount: { $sum: '$discount_amount' },
                  feeDue: {
                    $sum: {
                      $cond: [{ $in: ['$status', ['unpaid', 'partial']] }, '$due_amount', 0],
                    },
                  },
                },
              },
            ])
          : [];

      const feeByStudent = new Map(feeAgg.map((f) => [String(f._id), f]));
      const isTeacher = req.user.role === 'teacher';

      const rows = students.map((s) => {
        const fee = feeByStudent.get(String(s._id));
        const row = {
          ...s,
          feeTotal: fee ? fee.feeTotal : 0,
          feePaid: fee ? fee.feePaid : 0,
          feeDiscount: fee ? fee.feeDiscount : 0,
          feeDue: fee ? fee.feeDue : 0,
        };
        if (isTeacher) {
          delete row.fatherMonthlyIncome;
          delete row.motherMonthlyIncome;
        }
        return row;
      });

      res.json({
        success: true,
        data: rows,
        total,
        capped: total > MAX_REPORT_ROWS,
        maxRows: MAX_REPORT_ROWS,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
