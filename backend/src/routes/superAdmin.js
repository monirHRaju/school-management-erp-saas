const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const SuperAdmin = require('../models/SuperAdmin');
const School = require('../models/School');
const User = require('../models/User');
const Student = require('../models/Student');
const Fee = require('../models/Fee');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const superAdminAuth = require('../middleware/superAdminAuth');

const router = express.Router();

const SA_SECRET = () => process.env.JWT_SUPER_ADMIN_SECRET || process.env.JWT_SECRET;

// POST /api/super-admin/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    const admin = await SuperAdmin.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { superAdminId: admin._id.toString(), role: 'super_admin' },
      SA_SECRET(),
      { expiresIn: '8h' }
    );
    const adminObj = admin.toObject();
    delete adminObj.passwordHash;
    res.json({ success: true, data: { token, admin: adminObj } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/super-admin/me
router.get('/me', superAdminAuth, (req, res) => {
  res.json({ success: true, data: { admin: req.superAdmin } });
});

// GET /api/super-admin/stats — overview numbers
router.get('/stats', superAdminAuth, async (req, res) => {
  try {
    const [totalSchools, totalStudents, totalUsers] = await Promise.all([
      School.countDocuments(),
      Student.countDocuments(),
      User.countDocuments(),
    ]);

    const now = new Date();
    const planBreakdown = await School.aggregate([
      { $group: { _id: '$subscription_plan', count: { $sum: 1 } } },
    ]);
    const planMap = Object.fromEntries(planBreakdown.map((p) => [p._id, p.count]));

    // Recently registered schools (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const newSchools = await School.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    res.json({
      success: true,
      data: {
        totalSchools,
        totalStudents,
        totalUsers,
        newSchoolsLast30Days: newSchools,
        planBreakdown: planMap,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/super-admin/schools — list all schools with basic info
router.get('/schools', superAdminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const match = search
      ? { $or: [{ name: { $regex: search, $options: 'i' } }, { slug: { $regex: search, $options: 'i' } }] }
      : {};

    const total = await School.countDocuments(match);
    const schools = await School.find(match)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Attach user and student counts per school
    const schoolIds = schools.map((s) => s._id);
    const [userCounts, studentCounts] = await Promise.all([
      User.aggregate([
        { $match: { school_id: { $in: schoolIds } } },
        { $group: { _id: '$school_id', count: { $sum: 1 } } },
      ]),
      Student.aggregate([
        { $match: { school_id: { $in: schoolIds } } },
        { $group: { _id: '$school_id', count: { $sum: 1 } } },
      ]),
    ]);

    const userMap = Object.fromEntries(userCounts.map((u) => [u._id.toString(), u.count]));
    const studentMap = Object.fromEntries(studentCounts.map((s) => [s._id.toString(), s.count]));

    const enriched = schools.map((s) => ({
      ...s,
      userCount: userMap[s._id.toString()] || 0,
      studentCount: studentMap[s._id.toString()] || 0,
    }));

    res.json({
      success: true,
      data: enriched,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/super-admin/schools/:id — school detail with users
router.get('/schools/:id', superAdminAuth, async (req, res) => {
  try {
    const school = await School.findById(req.params.id).lean();
    if (!school) return res.status(404).json({ success: false, error: 'School not found' });

    const [users, studentCount] = await Promise.all([
      User.find({ school_id: school._id }).select('-passwordHash').lean(),
      Student.countDocuments({ school_id: school._id }),
    ]);

    res.json({ success: true, data: { school, users, studentCount } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/super-admin/schools/:id — update subscription plan / expiry / name / contact
router.put('/schools/:id', superAdminAuth, async (req, res) => {
  try {
    const { name, contact, plan_slug, subscription_expiry, settings } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (contact !== undefined) update.contact = contact;
    if (plan_slug !== undefined) update.plan_slug = plan_slug;
    if (subscription_expiry !== undefined) update.subscription_expiry = subscription_expiry;
    if (settings !== undefined) update.settings = settings;

    const school = await School.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!school) return res.status(404).json({ success: false, error: 'School not found' });
    res.json({ success: true, data: school });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/super-admin/schools/:id/reset-password — reset a user's password
router.post('/schools/:id/reset-password', superAdminAuth, async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ success: false, error: 'userId and newPassword required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    const user = await User.findOne({ _id: userId, school_id: req.params.id }).select('+passwordHash');
    if (!user) return res.status(404).json({ success: false, error: 'User not found in this school' });

    user.passwordHash = newPassword; // pre-save hook will hash it
    await user.save();
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/super-admin/schools — create a new school + admin user
router.post('/schools', superAdminAuth, async (req, res) => {
  try {
    const { schoolName, slug, contact, subscription_plan, subscription_expiry, adminName, adminEmail, adminPassword } = req.body;
    if (!schoolName || !slug || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ success: false, error: 'schoolName, slug, adminName, adminEmail, adminPassword required' });
    }
    const existing = await School.findOne({ slug: slug.trim().toLowerCase() });
    if (existing) return res.status(400).json({ success: false, error: 'Slug already taken' });

    const school = await School.create({
      name: schoolName.trim(),
      slug: slug.trim().toLowerCase(),
      contact: contact?.trim(),
      plan_slug: subscription_plan || 'free',
      subscription_expiry: subscription_expiry || undefined,
    });

    const user = await User.create({
      school_id: school._id,
      email: adminEmail.trim().toLowerCase(),
      passwordHash: adminPassword,
      name: adminName.trim(),
      role: 'admin',
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;
    res.status(201).json({ success: true, data: { school, admin: userObj } });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: 'Email already registered for this school' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/super-admin/schools/:id — permanently delete school and all data
router.delete('/schools/:id', superAdminAuth, async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ success: false, error: 'School not found' });

    const sid = school._id;
    await Promise.all([
      User.deleteMany({ school_id: sid }),
      Student.deleteMany({ school_id: sid }),
      Fee.deleteMany({ school_id: sid }),
      School.findByIdAndDelete(sid),
    ]);

    res.json({ success: true, message: 'School and all associated data deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/super-admin/me/password — change own password
router.put('/me/password', superAdminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'currentPassword and newPassword required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
    }
    const admin = await SuperAdmin.findById(req.superAdmin._id).select('+passwordHash');
    if (!(await bcrypt.compare(currentPassword, admin.passwordHash))) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }
    admin.passwordHash = newPassword;
    await admin.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Subscription Plans ─────────────────────────────────────────────────────

// GET /api/super-admin/plans — list all plans
router.get('/plans', superAdminAuth, async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ order: 1 }).lean();
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/super-admin/plans — create a plan
router.post('/plans', superAdminAuth, async (req, res) => {
  try {
    const { name, slug, price, currency, maxStudents, maxAdmins, features, isActive, order } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ success: false, error: 'name and slug are required' });
    }
    const plan = await SubscriptionPlan.create({
      name, slug, price: price ?? 0, currency, maxStudents: maxStudents ?? 50,
      maxAdmins: maxAdmins ?? 1, features, isActive: isActive ?? true, order: order ?? 0,
    });
    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, error: 'Plan slug already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/super-admin/plans/:id — update a plan
router.put('/plans/:id', superAdminAuth, async (req, res) => {
  try {
    const { name, price, currency, maxStudents, maxAdmins, features, isActive, order } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (price !== undefined) update.price = price;
    if (currency !== undefined) update.currency = currency;
    if (maxStudents !== undefined) update.maxStudents = maxStudents;
    if (maxAdmins !== undefined) update.maxAdmins = maxAdmins;
    if (features !== undefined) update.features = features;
    if (isActive !== undefined) update.isActive = isActive;
    if (order !== undefined) update.order = order;

    const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/super-admin/plans/:id — delete a plan
router.delete('/plans/:id', superAdminAuth, async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });
    res.json({ success: true, message: 'Plan deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/super-admin/schools/:id/plan — update school's subscription plan
router.put('/schools/:id/plan', superAdminAuth, async (req, res) => {
  try {
    const { plan_slug, subscription_expiry } = req.body;
    if (!plan_slug) return res.status(400).json({ success: false, error: 'plan_slug required' });

    const plan = await SubscriptionPlan.findOne({ slug: plan_slug });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });

    const school = await School.findByIdAndUpdate(
      req.params.id,
      { plan_slug, subscription_expiry: subscription_expiry || null },
      { new: true }
    );
    if (!school) return res.status(404).json({ success: false, error: 'School not found' });
    res.json({ success: true, data: school });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/super-admin/schools/:id/limits — manually override school's usage limits
router.put('/schools/:id/limits', superAdminAuth, async (req, res) => {
  try {
    const { maxStudents, maxAdmins } = req.body;
    const custom_limits = {
      maxStudents: maxStudents !== undefined ? Number(maxStudents) : null,
      maxAdmins: maxAdmins !== undefined ? Number(maxAdmins) : null,
    };
    const school = await School.findByIdAndUpdate(req.params.id, { custom_limits }, { new: true });
    if (!school) return res.status(404).json({ success: false, error: 'School not found' });
    res.json({ success: true, data: school });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
