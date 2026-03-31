'use strict';

const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { findOrCreateGuardian } = require('../services/guardianService');

const router = express.Router();
router.use(authMiddleware);
router.use(requireRole('admin'));

// ── GET /api/users — list school users with optional role filter ──────────────
router.get('/', async (req, res) => {
  try {
    const { role, status, page, limit } = req.query;
    const filter = { school_id: new mongoose.Types.ObjectId(req.schoolId) };
    if (role && ['admin', 'staff', 'accountant', 'guardian', 'teacher'].includes(role)) {
      filter.role = role;
    }
    if (status && ['active', 'inactive'].includes(status)) {
      filter.status = status;
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    res.json({ success: true, data: users, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/users — create user ────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, password, role, status, joiningDate } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    if (!role || !['staff', 'accountant', 'guardian', 'teacher'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Valid role is required (staff, accountant, guardian, teacher)' });
    }

    // Guardian creation uses guardianService (auto-generates password + sends SMS)
    if (role === 'guardian') {
      if (!phone) {
        return res.status(400).json({ success: false, error: 'Phone is required for guardian' });
      }
      const result = await findOrCreateGuardian(req.schoolId, phone, name.trim());
      if (!result) {
        return res.status(400).json({ success: false, error: 'Invalid phone number' });
      }
      const userObj = result.user.toObject ? result.user.toObject() : result.user;
      delete userObj.passwordHash;
      return res.status(201).json({
        success: true,
        data: userObj,
        created: result.created,
        message: result.created
          ? 'Guardian created. Credentials sent via SMS.'
          : 'Guardian already exists.',
      });
    }

    // Staff / Accountant: require email + password
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required for staff/accountant' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ success: false, error: 'Password is required (min 4 chars)' });
    }

    const user = await User.create({
      school_id: new mongoose.Types.ObjectId(req.schoolId),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : undefined,
      passwordHash: password, // pre-save hook hashes
      role,
      status: status && ['active', 'inactive'].includes(status) ? status : 'active',
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;

    res.status(201).json({ success: true, data: userObj });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: 'Email or phone already in use' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /api/users/:id — update user ───────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid user id' });
    }

    const { name, email, phone, role, password, status, joiningDate } = req.body;
    const update = {};

    if (name !== undefined) update.name = name.trim();
    if (email !== undefined) update.email = email ? email.trim().toLowerCase() : undefined;
    if (phone !== undefined) update.phone = phone ? phone.trim() : undefined;
    if (role && ['staff', 'accountant', 'guardian', 'teacher'].includes(role)) update.role = role;
    if (status && ['active', 'inactive'].includes(status)) update.status = status;
    if (joiningDate !== undefined) update.joiningDate = joiningDate ? new Date(joiningDate) : undefined;

    // Password reset by admin
    if (password && password.length >= 4) {
      const bcrypt = require('bcryptjs');
      update.passwordHash = await bcrypt.hash(password, 10);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: 'Nothing to update' });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, school_id: new mongoose.Types.ObjectId(req.schoolId) },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    delete user.passwordHash;
    res.json({ success: true, data: user });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: 'Email or phone already in use' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/users/:id — delete user (cannot delete self) ─────────────────
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid user id' });
    }
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }

    const result = await User.findOneAndDelete({
      _id: req.params.id,
      school_id: new mongoose.Types.ObjectId(req.schoolId),
    });

    if (!result) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: { _id: req.params.id, deleted: true } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
