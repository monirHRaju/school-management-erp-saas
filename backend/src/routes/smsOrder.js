const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const SmsOrder = require('../models/SmsOrder');
const School = require('../models/School');

const requireRole = require('../middleware/requireRole');

const router = express.Router();
router.use(authMiddleware);
router.use(requireRole('admin'));

const PRICE_PER_SMS = 0.35;
const MIN_COUNT = 500;
const CASHOUT_RATE = 0.0015;

function calcAmount(smsCount) {
  return Math.ceil(smsCount * PRICE_PER_SMS * (1 + CASHOUT_RATE));
}

// ─── GET /pricing ────────────────────────────────────────────────────────────
router.get('/pricing', (_req, res) => {
  res.json({
    success: true,
    data: { pricePerSms: PRICE_PER_SMS, minCount: MIN_COUNT, cashoutRate: CASHOUT_RATE },
  });
});

// ─── POST /create-manual ─────────────────────────────────────────────────────
router.post('/create-manual', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { smsCount, sender_last4, trxid } = req.body;

    const count = parseInt(smsCount);
    if (!count || count < MIN_COUNT) {
      return res.status(400).json({ success: false, error: `Minimum ${MIN_COUNT} SMS required.` });
    }

    const cleanLast4 = sender_last4 ? String(sender_last4).trim() : '';
    const cleanTrxId = trxid ? String(trxid).trim() : '';

    if (!cleanLast4 || !cleanTrxId) {
      return res.status(400).json({ success: false, error: 'Last 4 digits and TrxID are required.' });
    }
    if (!/^\d{4}$/.test(cleanLast4)) {
      return res.status(400).json({ success: false, error: 'Sender last 4 digits must be 4 numeric digits.' });
    }

    // Reject duplicate TrxID if an order is already pending or approved (allow re-submission if rejected)
    const escapedTrx = cleanTrxId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const duplicate = await SmsOrder.findOne({
      manual_trxid: new RegExp(`^${escapedTrx}$`, 'i'),
      status: { $in: ['pending', 'approved'] },
    }).lean();

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: 'This Transaction ID (TrxID) has already been submitted.',
      });
    }

    const amount = calcAmount(count);
    const order = await SmsOrder.create({
      school_id: schoolId,
      sms_count: count,
      amount,
      payment_method: 'manual',
      sender_last4: cleanLast4,
      manual_trxid: cleanTrxId,
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /history ────────────────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { page = 1, limit = 15 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 15));

    const filter = { school_id: schoolId };
    const total = await SmsOrder.countDocuments(filter);
    const orders = await SmsOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const school = await School.findById(schoolId).select('sms_balance').lean();

    res.json({
      success: true,
      data: orders,
      sms_balance: school?.sms_balance || 0,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
