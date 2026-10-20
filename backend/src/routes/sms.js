const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const { sendSMS, normalizeBdPhone } = require('../services/sms');
const { canSendSMS, deductSmsBalance, notifyFeeDue } = require('../services/notifications');
const SmsLog = require('../models/SmsLog');
const Student = require('../models/Student');
const Fee = require('../models/Fee');
const School = require('../models/School');

const requireRole = require('../middleware/requireRole');

const router = express.Router();
router.use(authMiddleware);
router.use(requireRole('admin'));

// ─── GET /api/sms/balance — check this school's SMS credit balance ───────────
// Never expose platform-wide provider balance to school tenants.
router.get('/balance', async (req, res) => {
  try {
    const school = await School.findById(req.schoolId).select('sms_balance').lean();
    const smsBalance = school?.sms_balance || 0;
    res.json({ success: true, data: { sms_balance: smsBalance } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/sms/status — check if school can send SMS (plan check) ─────────
router.get('/status', async (req, res) => {
  try {
    const enabled = await canSendSMS(req.schoolId);
    res.json({ success: true, data: { smsEnabled: enabled } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/sms/logs — SMS history for this school ─────────────────────────
router.get('/logs', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { page = 1, limit = 20, type } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));

    const filter = { school_id: schoolId };
    if (type) filter.type = type;

    const total = await SmsLog.countDocuments(filter);
    const logs = await SmsLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Summary stats
    const statsAgg = await SmsLog.aggregate([
      { $match: { school_id: schoolId } },
      { $group: { _id: null, totalSent: { $sum: '$sent' }, totalFailed: { $sum: '$failed' } } },
    ]);
    const stats = statsAgg[0] || { totalSent: 0, totalFailed: 0 };

    res.json({
      success: true,
      data: logs,
      stats: { totalSent: stats.totalSent, totalFailed: stats.totalFailed },
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/sms/send — manual SMS to a phone number ───────────────────────
router.post('/send', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    if (!(await canSendSMS(req.schoolId))) {
      return res.status(403).json({ success: false, error: 'SMS not available on your current plan.' });
    }

    const { to, message } = req.body;
    if (!to || !message || !String(message).trim()) {
      return res.status(400).json({ success: false, error: 'to and message are required.' });
    }

    const normalizedTo = normalizeBdPhone(to);
    if (!normalizedTo) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Bangladeshi mobile number. Use format 01XXXXXXXXX or +8801XXXXXXXXX.',
      });
    }

    if (!(await deductSmsBalance(req.schoolId, 1))) {
      return res.status(400).json({ success: false, error: 'SMS ব্যালেন্স নেই। SMS কিনুন।' });
    }

    const result = await sendSMS(normalizedTo, String(message).trim());

    // Restore if failed
    if (!result.success) await School.findByIdAndUpdate(req.schoolId, { $inc: { sms_balance: 1 } });

    await SmsLog.create({
      school_id: schoolId,
      type: 'manual',
      recipients: 1,
      to: normalizedTo,
      message: String(message).trim(),
      sent: result.success ? 1 : 0,
      failed: result.success ? 0 : 1,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/sms/send-due-reminders — send fee due SMS to all unpaid students ──
router.post('/send-due-reminders', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    if (!(await canSendSMS(req.schoolId))) {
      return res.status(403).json({ success: false, error: 'SMS not available on your current plan.' });
    }

    const { month, class: cls } = req.body;
    const filter = { school_id: schoolId, status: { $in: ['unpaid', 'partial'] } };
    if (month) filter.month = month;

    // If class filter, find matching student IDs
    if (cls) {
      const studentIds = await Student.find({ school_id: schoolId, class: cls, status: 'active' }, { _id: 1 }).lean();
      filter.student_id = { $in: studentIds.map((s) => s._id) };
    }

    const fees = await Fee.find(filter).lean();

    let sent = 0;
    let failed = 0;
    for (const fee of fees) {
      const result = await notifyFeeDue(
        schoolId, fee.student_id, fee.total_fee, fee.due_amount, fee.month, fee.description
      );
      if (result.sent > 0 || result.success) sent++;
      else failed++;
    }

    res.json({ success: true, data: { sent, failed, total: fees.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/sms/resend/:id — resend an SMS from history ───────────────────
router.post('/resend/:id', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    if (!(await canSendSMS(req.schoolId))) {
      return res.status(403).json({ success: false, error: 'SMS not available on your current plan.' });
    }

    const logId = req.params.id;
    if (!mongoose.isValidObjectId(logId)) {
      return res.status(400).json({ success: false, error: 'Invalid log id.' });
    }

    const log = await SmsLog.findOne({ _id: logId, school_id: schoolId }).lean();
    if (!log) return res.status(404).json({ success: false, error: 'SMS log not found.' });
    if (!log.to || !log.message) {
      return res.status(400).json({ success: false, error: 'Cannot resend — missing phone number or message.' });
    }

    // If multiple phones (attendance bulk), normalize and filter valid numbers
    const phones = log.to
      .split(',')
      .map((p) => normalizeBdPhone(p.trim()))
      .filter(Boolean);

    if (!phones.length) {
      return res.status(400).json({ success: false, error: 'No valid Bangladeshi phone numbers to resend.' });
    }

    if (!(await deductSmsBalance(req.schoolId, phones.length))) {
      return res.status(400).json({ success: false, error: `SMS ব্যালেন্স নেই। ${phones.length} SMS প্রয়োজন।` });
    }

    let totalSent = 0;
    let totalFailed = 0;

    for (const phone of phones) {
      const result = await sendSMS(phone, log.message);
      if (result.success) totalSent++;
      else totalFailed++;
    }

    // Restore balance for failed sends
    if (totalFailed > 0) await School.findByIdAndUpdate(req.schoolId, { $inc: { sms_balance: totalFailed } });

    // Log the resend
    await SmsLog.create({
      school_id: schoolId,
      type: log.type,
      recipients: phones.length,
      to: phones.join(','),
      message: log.message,
      sent: totalSent,
      failed: totalFailed,
    });

    res.json({ success: true, data: { sent: totalSent, failed: totalFailed, total: phones.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
