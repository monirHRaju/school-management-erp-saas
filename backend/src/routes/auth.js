const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const School = require('../models/School');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register — create school + admin user
router.post('/register', async (req, res) => {
  try {
    const { schoolName, slug, contact, name, email, password, phone, subscription_plan } = req.body;
    if (!schoolName || !slug || !name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: schoolName, slug, name, email, password',
      });
    }
    const existingSchool = await School.findOne({ slug: slug.trim().toLowerCase() });
    if (existingSchool) {
      return res.status(400).json({ success: false, error: 'School slug already taken' });
    }
    const school = await School.create({
      name: schoolName.trim(),
      slug: slug.trim().toLowerCase(),
      contact: contact ? contact.trim() : undefined,
      subscription_plan: (subscription_plan || 'free').toLowerCase(),
    });
    const user = await User.create({
      school_id: school._id,
      email: email.trim().toLowerCase(),
      passwordHash: password,
      name: name.trim(),
      phone: phone ? phone.trim() : undefined,
      role: 'admin',
    });
    const token = jwt.sign(
      { userId: user._id.toString(), schoolId: school._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    const userObj = user.toObject();
    delete userObj.passwordHash;
    res.status(201).json({
      success: true,
      data: {
        token,
        user: userObj,
        school: { _id: school._id, name: school.name, slug: school.slug },
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: 'Email already in use' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login — login with email + password only (no school slug required)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, password',
      });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    const school = await School.findById(user.school_id);
    if (!school) {
      return res.status(401).json({ success: false, error: 'School not found' });
    }
    const token = jwt.sign(
      { userId: user._id.toString(), schoolId: school._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    const userObj = user.toObject();
    delete userObj.passwordHash;
    res.json({
      success: true,
      data: {
        token,
        user: userObj,
        school: { _id: school._id, name: school.name, slug: school.slug },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/me — current user (protected)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const school = await School.findById(req.schoolId).select('name slug');
    res.json({
      success: true,
      data: { user: req.user, school: school || { _id: req.schoolId } },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
