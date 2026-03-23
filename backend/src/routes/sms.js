const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const { sendSMS, getBalance } = require('../services/sms');
const { canSendSMS, notifyFeeDue } = require('../services/notifications');
const SmsLog = require('../models/SmsLog');
const Student = require('../models/Student');
const Fee = require('../models/Fee');

const router = express.Router();
router.use(authMiddleware);

// ─── GET /api/sms/balance — check SMS account balance ────────────────────────
router.get('/balance', async (_req, res) => {
  try {
    const result = await getBalance();
    res.json({ success: true, data: result });
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
    if (!to || !message) {
      return res.status(400).json({ success: false, error: 'to and message are required.' });
    }

    const result = await sendSMS(to, message);

    await SmsLog.create({
      school_id: schoolId,
      type: 'manual',
      recipients: 1,
      message,
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
      if (result.sent > 0) sent++;
      else failed++;
    }

    res.json({ success: true, data: { sent, failed, total: fees.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
