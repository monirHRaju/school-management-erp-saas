'use strict';

const express      = require('express');
const crypto       = require('crypto');
const mongoose     = require('mongoose');
const authMiddleware = require('../middleware/auth');

const bkash        = require('../services/bkash');
const PaymentLink  = require('../models/PaymentLink');
const BkashPayment = require('../models/BkashPayment');
const Fee          = require('../models/Fee');
const FeePayment   = require('../models/FeePayment');
const Income       = require('../models/Income');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const School       = require('../models/School');

const { FEE_TYPE_TO_CATEGORY } = (() => {
  const map = { monthly: 'student_fee', admission: 'other', exam: 'exam_fee', book: 'book_sales', other: 'other' };
  return { FEE_TYPE_TO_CATEGORY: map };
})();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const router = express.Router();

// ─── Helper ────────────────────────────────────────────────────────────────────
function isValidOid(id) {
  return mongoose.isValidObjectId(id);
}

// ══════════════════════════════════════════════════════════════════════════════
//  PAYMENT LINK — generate & retrieve
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/payment/link/generate
 * Auth: school user (admin/accountant)
 * Body: { fee_id }
 * Returns: { url, token, amount, expiresAt }
 *
 * Idempotent — returns existing active link if one already exists for this fee.
 */
router.post('/link/generate', authMiddleware, async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { fee_id } = req.body;

    if (!fee_id || !isValidOid(fee_id)) {
      return res.status(400).json({ success: false, error: 'fee_id is required' });
    }

    const fee = await Fee.findOne({ _id: fee_id, school_id: schoolId }).lean();
    if (!fee) return res.status(404).json({ success: false, error: 'Fee not found' });
    if ((fee.due_amount || 0) <= 0) {
      return res.status(400).json({ success: false, error: 'Fee has no outstanding balance' });
    }

    // Return existing active non-expired link if present
    const existing = await PaymentLink.findOne({
      fee_id: fee._id,
      school_id: schoolId,
      status: 'active',
      expiresAt: { $gt: new Date() },
    }).lean();

    if (existing) {
      return res.json({
        success: true,
        data: {
          url: `${FRONTEND_URL}/pay/${existing.token}`,
          token: existing.token,
          amount: existing.amount,
          expiresAt: existing.expiresAt,
        },
      });
    }

    // Create new link
    const token = crypto.randomBytes(16).toString('hex');
    const link = await PaymentLink.create({
      school_id: schoolId,
      fee_id: fee._id,
      token,
      amount: fee.due_amount,
    });

    res.status(201).json({
      success: true,
      data: {
        url: `${FRONTEND_URL}/pay/${link.token}`,
        token: link.token,
        amount: link.amount,
        expiresAt: link.expiresAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/payment/link/:token
 * Public — no auth required
 * Returns safe public info: school name, student name/class, fee category/month/amount
 */
router.get('/link/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const link = await PaymentLink.findOne({ token })
      .populate({
        path: 'fee_id',
        populate: { path: 'student_id', select: 'name class section rollNo' },
      })
      .populate('school_id', 'name')
      .lean();

    if (!link) return res.status(404).json({ success: false, error: 'Payment link not found' });
    if (link.status === 'used') return res.status(410).json({ success: false, error: 'This payment link has already been used', code: 'USED' });
    if (link.status === 'expired' || new Date(link.expiresAt) < new Date()) {
      return res.status(410).json({ success: false, error: 'This payment link has expired', code: 'EXPIRED' });
    }

    const fee = link.fee_id;
    const student = fee?.student_id;
    const school  = link.school_id;

    res.json({
      success: true,
      data: {
        token,
        amount: link.amount,
        expiresAt: link.expiresAt,
        school: { name: school?.name || 'School' },
        student: {
          name:    student?.name || 'Student',
          class:   student?.class || '',
          section: student?.section || '',
          rollNo:  student?.rollNo || '',
        },
        fee: {
          category:    fee?.category || 'student_fee',
          month:       fee?.month || '',
          description: fee?.description || '',
          totalFee:    fee?.total_fee || 0,
          dueAmount:   fee?.due_amount || link.amount,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  bKASH — FEE PAYMENT (PUBLIC)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/payment/bkash/create-fee
 * Public — authenticated via PaymentLink token
 * Body: { token }
 * Returns: { paymentID, bkashURL }
 */
router.post('/bkash/create-fee', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'token is required' });

    const link = await PaymentLink.findOne({ token, status: 'active' }).populate('fee_id').lean();
    if (!link) return res.status(404).json({ success: false, error: 'Payment link not found or no longer active' });
    if (new Date(link.expiresAt) < new Date()) {
      return res.status(410).json({ success: false, error: 'Payment link has expired' });
    }

    const merchantInvoiceNumber = `FEE-${link.fee_id._id}-${Date.now()}`;
    const callbackURL = `${FRONTEND_URL}/pay/callback`;

    const bkashRes = await bkash.createPayment({
      callbackURL,
      amount: link.amount,
      merchantInvoiceNumber,
      payerReference: '-',
    });

    // Persist pending payment record
    await BkashPayment.create({
      school_id:   link.school_id,
      type:        'fee',
      fee_id:      link.fee_id._id,
      payment_link_id: link._id,
      paymentID:   bkashRes.paymentID,
      merchantInvoiceNumber,
      amount:      link.amount,
      status:      'pending',
    });

    res.json({
      success: true,
      data: {
        paymentID: bkashRes.paymentID,
        bkashURL:  bkashRes.bkashURL,
      },
    });
  } catch (err) {
    console.error('[bKash create-fee]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/payment/bkash/execute-fee
 * Public — called by the callback page after bKash redirects back
 * Body: { paymentID }
 * Returns: { trxID, amount, studentName, feeCategory, status }
 */
router.post('/bkash/execute-fee', async (req, res) => {
  try {
    const { paymentID } = req.body;
    if (!paymentID) return res.status(400).json({ success: false, error: 'paymentID is required' });

    const record = await BkashPayment.findOne({ paymentID, type: 'fee' });
    if (!record) return res.status(404).json({ success: false, error: 'Payment record not found' });
    if (record.status === 'completed') {
      // Already processed (idempotent)
      return res.json({ success: true, data: { trxID: record.trxID, amount: record.amount, alreadyProcessed: true } });
    }
    if (record.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Payment is ${record.status}` });
    }

    // Execute with bKash
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

    // Double-verify with query
    try {
      const queryResult = await bkash.queryPayment(paymentID);
      if (queryResult.transactionStatus !== 'Completed') {
        record.status = 'failed';
        await record.save();
        return res.status(400).json({ success: false, error: 'Payment verification failed' });
      }
    } catch {
      // Query is a best-effort check; if it fails, we trust execute result
    }

    // ── Collect the fee ───────────────────────────────────────────────────────
    const fee = await Fee.findById(record.fee_id);
    if (!fee) {
      // Edge case: fee deleted after link creation
      record.status = 'completed';
      record.trxID  = execResult.trxID;
      record.customerMsisdn = execResult.customerMsisdn || null;
      await record.save();
      return res.json({ success: true, data: { trxID: execResult.trxID, amount: record.amount, warning: 'Fee record not found' } });
    }

    const paidAmount = record.amount;
    const newPaid = (fee.paid_amount || 0) + paidAmount;
    const newDue  = Math.max(0, (fee.total_fee || 0) - newPaid);
    const newStatus = newDue <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

    fee.paid_amount = newPaid;
    fee.due_amount  = newDue;
    fee.status      = newStatus;
    await fee.save();

    const paymentDate = new Date();
    await FeePayment.create({
      school_id:    fee.school_id,
      fee_id:       fee._id,
      amount:       paidAmount,
      discount:     0,
      note:         `bKash payment — trxID: ${execResult.trxID}`,
      payment_date: paymentDate,
      created_by:   null, // no logged-in user on public page
    });

    const category = fee.category || FEE_TYPE_TO_CATEGORY[fee.fee_type] || 'other';
    await Income.create({
      school_id:  fee.school_id,
      category,
      amount:     paidAmount,
      student_id: fee.student_id,
      fee_id:     fee._id,
      date:       paymentDate,
      created_by: null,
    });

    // Mark payment link as used
    await PaymentLink.findByIdAndUpdate(record.payment_link_id, { status: 'used' });

    // Update BkashPayment record
    record.status         = 'completed';
    record.trxID          = execResult.trxID;
    record.customerMsisdn = execResult.customerMsisdn || null;
    await record.save();

    // Fetch student info for response
    const populatedFee = await Fee.findById(fee._id)
      .populate('student_id', 'name class section')
      .lean();

    res.json({
      success: true,
      data: {
        trxID:       execResult.trxID,
        amount:      paidAmount,
        studentName: populatedFee?.student_id?.name || 'Student',
        feeCategory: category,
        feeStatus:   newStatus,
        customerMsisdn: execResult.customerMsisdn || null,
      },
    });
  } catch (err) {
    console.error('[bKash execute-fee]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  bKASH — SUBSCRIPTION PAYMENT (AUTH REQUIRED)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/payment/bkash/create-sub
 * Auth: school user
 * Body: { plan_slug }
 * Returns: { paymentID, bkashURL }
 */
router.post('/bkash/create-sub', authMiddleware, async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { plan_slug } = req.body;

    if (!plan_slug) return res.status(400).json({ success: false, error: 'plan_slug is required' });

    const plan = await SubscriptionPlan.findOne({ slug: plan_slug, isActive: true }).lean();
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found or inactive' });
    if (plan.price <= 0) return res.status(400).json({ success: false, error: 'This plan is free — no payment required' });

    const merchantInvoiceNumber = `SUB-${schoolId}-${Date.now()}`;
    const callbackURL = `${FRONTEND_URL}/dashboard/subscription/callback`;

    const bkashRes = await bkash.createPayment({
      callbackURL,
      amount:  plan.price,
      merchantInvoiceNumber,
      payerReference: '-',
    });

    await BkashPayment.create({
      school_id:  schoolId,
      type:       'subscription',
      plan_slug,
      paymentID:  bkashRes.paymentID,
      merchantInvoiceNumber,
      amount:     plan.price,
      status:     'pending',
    });

    res.json({
      success: true,
      data: {
        paymentID: bkashRes.paymentID,
        bkashURL:  bkashRes.bkashURL,
        planName:  plan.name,
        amount:    plan.price,
      },
    });
  } catch (err) {
    console.error('[bKash create-sub]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/payment/bkash/execute-sub
 * Auth: school user
 * Body: { paymentID }
 * Returns: { trxID, amount, plan_slug, message }
 *
 * NOTE: Does NOT auto-activate the plan. Super admin reviews and activates manually.
 */
router.post('/bkash/execute-sub', authMiddleware, async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const { paymentID } = req.body;

    if (!paymentID) return res.status(400).json({ success: false, error: 'paymentID is required' });

    const record = await BkashPayment.findOne({ paymentID, type: 'subscription' });
    if (!record) return res.status(404).json({ success: false, error: 'Payment record not found' });
    if (record.school_id.toString() !== schoolId.toString()) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (record.status === 'completed') {
      return res.json({ success: true, data: { trxID: record.trxID, amount: record.amount, alreadyProcessed: true } });
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

    // Best-effort verification
    try {
      const q = await bkash.queryPayment(paymentID);
      if (q.transactionStatus !== 'Completed') {
        record.status = 'failed';
        await record.save();
        return res.status(400).json({ success: false, error: 'Payment verification failed' });
      }
    } catch { /* ignore */ }

    record.status         = 'completed';
    record.trxID          = execResult.trxID;
    record.customerMsisdn = execResult.customerMsisdn || null;
    await record.save();

    res.json({
      success: true,
      data: {
        trxID:     execResult.trxID,
        amount:    record.amount,
        plan_slug: record.plan_slug,
        customerMsisdn: execResult.customerMsisdn || null,
        message:   'Payment received. Your plan will be activated within 24 hours.',
      },
    });
  } catch (err) {
    console.error('[bKash execute-sub]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  PAYMENT HISTORY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/payment/history?type=fee|subscription&page=1&limit=20
 * Auth: school user
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { type, page = 1, limit = 20 } = req.query;

    const filter = { school_id: schoolId };
    if (type && ['fee', 'subscription'].includes(type)) filter.type = type;

    const total   = await BkashPayment.countDocuments(filter);
    const records = await BkashPayment.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('fee_id', 'category month description')
      .lean();

    res.json({
      success: true,
      data:       records,
      total,
      page:       Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
