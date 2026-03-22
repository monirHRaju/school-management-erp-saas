const express = require('express');
const authMiddleware = require('../middleware/auth');
const School = require('../models/School');
const User = require('../models/User');
const Student = require('../models/Student');
const SubscriptionPlan = require('../models/SubscriptionPlan');

const router = express.Router();

// Helper: get effective limits (custom_limits override plan defaults)
function effectiveLimits(school, plan) {
  return {
    maxStudents: school.custom_limits?.maxStudents != null
      ? school.custom_limits.maxStudents
      : (plan?.maxStudents ?? 50),
    maxAdmins: school.custom_limits?.maxAdmins != null
      ? school.custom_limits.maxAdmins
      : (plan?.maxAdmins ?? 1),
  };
}

// GET /api/subscription/plan — current plan info + features
router.get('/plan', authMiddleware, async (req, res) => {
  try {
    const school = await School.findById(req.schoolId).lean();
    if (!school) return res.status(404).json({ success: false, error: 'School not found' });

    const plan = await SubscriptionPlan.findOne({ slug: school.plan_slug || 'free' }).lean();
    const limits = effectiveLimits(school, plan);

    res.json({
      success: true,
      data: {
        plan,
        plan_slug: school.plan_slug || 'free',
        subscription_expiry: school.subscription_expiry,
        custom_limits: school.custom_limits,
        effective_limits: limits,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/subscription/usage — usage stats for current school
router.get('/usage', authMiddleware, async (req, res) => {
  try {
    const school = await School.findById(req.schoolId).lean();
    const plan = await SubscriptionPlan.findOne({ slug: school?.plan_slug || 'free' }).lean();
    const limits = effectiveLimits(school, plan);

    const [studentCount, adminCount] = await Promise.all([
      Student.countDocuments({ school_id: req.schoolId }),
      User.countDocuments({ school_id: req.schoolId }),
    ]);

    res.json({
      success: true,
      data: {
        students: { used: studentCount, max: limits.maxStudents, unlimited: limits.maxStudents === -1 },
        admins:   { used: adminCount,   max: limits.maxAdmins,   unlimited: limits.maxAdmins === -1   },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/subscription/plans — all active plans (for upgrade comparison)
router.get('/plans', authMiddleware, async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ order: 1 }).lean();
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
