const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const bkash = require('../services/bkash');
const SmsOrder = require('../models/SmsOrder');
const BkashPayment = require('../models/BkashPayment');
const School = require('../models/School');
const Notice = require('../models/Notice');

const router = express.Router();
router.use(authMiddleware);

const PRICE_PER_SMS = 0.35;
const MIN_COUNT = 500;
const CASHOUT_RATE = 0.0015;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

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
    const { smsCount, bkash_last4, trxid } = req.body;

    const count = parseInt(smsCount);
    if (!count || count < MIN_COUNT) {
      return res.status(400).json({ success: false, error: `Minimum ${MIN_COUNT} SMS required.` });
    }
    if (!bkash_last4 || !trxid) {
      return res.status(400).json({ success: false, error: 'Last 4 digits and TrxID are required.' });
    }

    const amount = calcAmount(count);
    const order = await SmsOrder.create({
      school_id: schoolId,
      sms_count: count,
      amount,
      payment_method: 'manual',
      bkash_last4: String(bkash_last4).trim(),
      manual_trxid: String(trxid).trim(),
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /create-bkash ─────────────────────────────────────────────────────
router.post('/create-bkash', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { smsCount } = req.body;

    const count = parseInt(smsCount);
    if (!count || count < MIN_COUNT) {
      return res.status(400).json({ success: false, error: `Minimum ${MIN_COUNT} SMS required.` });
    }

    const amount = calcAmount(count);
    const order = await SmsOrder.create({
      school_id: schoolId,
      sms_count: count,
      amount,
      payment_method: 'bkash',
    });

    const merchantInvoiceNumber = `SMS-${order._id}-${Date.now()}`;
    const callbackURL = `${FRONTEND_URL}/dashboard/sms-order/callback`;

    const bkashRes = await bkash.createPayment({
      callbackURL,
      amount,
      merchantInvoiceNumber,
      payerReference: '-',
    });

    await BkashPayment.create({
      school_id: schoolId,
      type: 'sms',
      sms_order_id: order._id,
      paymentID: bkashRes.paymentID,
      merchantInvoiceNumber,
      amount,
      status: 'pending',
    });

    order.bkash_payment_id = bkashRes.paymentID;
    await order.save();

    res.json({
      success: true,
      data: {
        paymentID: bkashRes.paymentID,
        bkashURL: bkashRes.bkashURL,
        amount,
        smsCount: count,
      },
    });
  } catch (err) {
    console.error('[SMS Order bKash create]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /execute-bkash ─────────────────────────────────────────────────────
router.post('/execute-bkash', async (req, res) => {
  try {
    const { paymentID } = req.body;
    if (!paymentID) return res.status(400).json({ success: false, error: 'paymentID is required' });

    const record = await BkashPayment.findOne({ paymentID, type: 'sms' });
    if (!record) return res.status(404).json({ success: false, error: 'Payment record not found' });
    if (record.status === 'completed') {
      return res.json({ success: true, data: { trxID: record.trxID, alreadyProcessed: true } });
    }
    if (record.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Payment is ${record.status}` });
    }

    let execResult;
    try {
      execResult = await bkash.executePayment(paymentID);
    } catch (err) {
      record.status = 'failed';
      await record.save();
      return res.status(400).json({ success: false, error: err.message || 'Payment execution failed' });
    }

    if (execResult.transactionStatus !== 'Completed') {
      record.status = 'failed';
      await record.save();
      return res.status(400).json({ success: false, error: `Payment not completed: ${execResult.transactionStatus}` });
    }

    // Best-effort verify
    try {
      const q = await bkash.queryPayment(paymentID);
      if (q.transactionStatus !== 'Completed') {
        record.status = 'failed';
        await record.save();
        return res.status(400).json({ success: false, error: 'Payment verification failed' });
      }
    } catch { /* ignore */ }

    record.status = 'completed';
    record.trxID = execResult.trxID;
    record.customerMsisdn = execResult.customerMsisdn || null;
    await record.save();

    // Auto-approve order + add balance
    const order = await SmsOrder.findById(record.sms_order_id);
    if (order && order.status === 'pending') {
      order.status = 'approved';
      order.bkash_trxid = execResult.trxID;
      await order.save();

      await School.findByIdAndUpdate(order.school_id, { $inc: { sms_balance: order.sms_count } });

      await Notice.create({
        title: 'SMS ব্যালেন্স যোগ হয়েছে',
        message: `${order.sms_count} SMS ব্যালেন্স যোগ করা হয়েছে (bKash পেমেন্ট)। TrxID: ${execResult.trxID}`,
        target: order.school_id.toString(),
        type: 'auto',
        from: 'system',
      });
    }

    res.json({
      success: true,
      data: {
        trxID: execResult.trxID,
        amount: record.amount,
        smsCount: order?.sms_count || 0,
        message: 'পেমেন্ট সফল! SMS ব্যালেন্স যোগ করা হয়েছে।',
      },
    });
  } catch (err) {
    console.error('[SMS Order bKash execute]', err.message);
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
