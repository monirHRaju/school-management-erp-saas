const express = require('express');
const router = express.Router();
const DemoRequest = require('../models/DemoRequest');
const { sendSMS } = require('../services/sms');
const superAdminAuth = require('../middleware/superAdminAuth');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanMobile(mobile) {
  return mobile.replace(/\s+/g, '').replace(/^(\+88|88)/, '');
}

// POST /api/demo/request — submit form, send OTP
router.post('/request', async (req, res) => {
  try {
    const { name, email, occupation, institution, mobile, address, specialRequirements, heardFrom } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ success: false, error: 'নাম ও মোবাইল নম্বর আবশ্যক।' });
    }

    const mobileClean = cleanMobile(mobile);
    if (!/^01[3-9]\d{8}$/.test(mobileClean)) {
      return res.status(400).json({ success: false, error: 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন।' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await DemoRequest.findOneAndUpdate(
      { mobile: mobileClean },
      { name, email, occupation, institution, mobile: mobileClean, address, specialRequirements, heardFrom, otp, otpExpiry, isVerified: false },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const message = `আমার স্কুল ডেমো OTP: ${otp}। এটি ১০ মিনিটের জন্য বৈধ।`;
    await sendSMS(mobileClean, message);

    res.json({ success: true, message: 'OTP পাঠানো হয়েছে।' });
  } catch (err) {
    console.error('[Demo Request]', err);
    res.status(500).json({ success: false, error: 'সার্ভার ত্রুটি। পুনরায় চেষ্টা করুন।' });
  }
});

// POST /api/demo/verify — verify OTP, grant demo access
router.post('/verify', async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({ success: false, error: 'মোবাইল ও OTP আবশ্যক।' });
    }

    const mobileClean = cleanMobile(mobile);
    const demoReq = await DemoRequest.findOne({ mobile: mobileClean }).select('+otp +otpExpiry');

    if (!demoReq) {
      return res.status(404).json({ success: false, error: 'ডেমো আবেদন পাওয়া যায়নি। ফর্ম পুনরায় পূরণ করুন।' });
    }

    if (demoReq.otp !== otp) {
      return res.status(400).json({ success: false, error: 'OTP সঠিক নয়।' });
    }

    if (new Date() > demoReq.otpExpiry) {
      return res.status(400).json({ success: false, error: 'OTP মেয়াদ শেষ। পুনরায় OTP নিন।' });
    }

    demoReq.isVerified = true;
    demoReq.verifiedAt = new Date();
    demoReq.otp = undefined;
    demoReq.otpExpiry = undefined;
    await demoReq.save();

    // Notify super-admin via SMS (fire-and-forget)
    const superAdminPhone = process.env.SUPER_ADMIN_PHONE;
    if (superAdminPhone) {
      const notifyMsg = `নতুন ডেমো আবেদন!\nনাম: ${demoReq.name}\nমোবাইল: ${mobileClean}\nপ্রতিষ্ঠান: ${demoReq.institution || 'N/A'}\nপেশা: ${demoReq.occupation || 'N/A'}`;
      sendSMS(superAdminPhone, notifyMsg).catch((e) => console.error('[Demo notify]', e));
    }

    const demoToken = process.env.DEMO_SCHOOL_TOKEN || null;

    res.json({
      success: true,
      message: 'যাচাই সফল হয়েছে।',
      demoToken,
      redirectUrl: demoToken ? '/dashboard' : null,
    });
  } catch (err) {
    console.error('[Demo Verify]', err);
    res.status(500).json({ success: false, error: 'সার্ভার ত্রুটি।' });
  }
});

// GET /api/demo/requests — super-admin: list all demo requests
router.get('/requests', superAdminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, verified, search } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const filter = {};
    if (verified === 'true') filter.isVerified = true;
    if (verified === 'false') filter.isVerified = false;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { institution: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await DemoRequest.countDocuments(filter);
    const requests = await DemoRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    res.json({ success: true, requests, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
