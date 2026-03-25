'use strict';

const express = require('express');
const mongoose = require('mongoose');
const SchoolNotice = require('../models/SchoolNotice');
const Student = require('../models/Student');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
router.use(authMiddleware);

// ── Helper: build visibility filter for current user ──────────────────────────
function buildVisibilityFilter(req) {
  const schoolId = new mongoose.Types.ObjectId(req.schoolId);
  const role = req.user.role;
  const userId = req.user._id;

  const orConditions = [{ target_type: 'all' }];

  if (role === 'guardian') {
    orConditions.push({ target_type: 'role', target_roles: 'guardian' });
    if (req.user.student_ids?.length) {
      orConditions.push({
        target_type: 'students',
        target_students: { $in: req.user.student_ids },
      });
    }
  } else {
    orConditions.push({ target_type: 'role', target_roles: role });
  }

  orConditions.push({ target_type: 'users', target_users: userId });

  return { school_id: schoolId, $or: orConditions };
}

// ── GET / — list notices visible to current user ──────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const filter = buildVisibilityFilter(req);
    const total = await SchoolNotice.countDocuments(filter);
    const notices = await SchoolNotice.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('created_by', 'name role')
      .lean();

    const userId = req.user._id.toString();
    const data = notices.map((n) => ({
      ...n,
      isRead: (n.read_by || []).some((id) => id.toString() === userId),
      read_by: undefined, // don't expose full array
    }));

    res.json({
      success: true,
      data,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /unread-count ─────────────────────────────────────────────────────────
router.get('/unread-count', async (req, res) => {
  try {
    const filter = buildVisibilityFilter(req);
    filter.read_by = { $ne: req.user._id };
    const count = await SchoolNotice.countDocuments(filter);
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST / — create notice ───────────────────────────────────────────────────
router.post('/', requireRole('admin', 'staff', 'accountant'), async (req, res) => {
  try {
    const { title, message, target_type, target_roles, target_students, target_users } = req.body;
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ success: false, error: 'Title and message are required' });
    }
    if (!['all', 'role', 'students', 'users'].includes(target_type)) {
      return res.status(400).json({ success: false, error: 'Invalid target_type' });
    }

    const doc = {
      school_id: schoolId,
      created_by: req.user._id,
      title: title.trim(),
      message: message.trim(),
      type: 'manual',
      target_type,
    };

    if (target_type === 'role') {
      const validRoles = ['admin', 'staff', 'accountant', 'guardian'];
      const roles = (target_roles || []).filter((r) => validRoles.includes(r));
      if (roles.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one valid role is required' });
      }
      doc.target_roles = roles;
    }

    if (target_type === 'students') {
      const ids = (target_students || []).filter((id) => mongoose.isValidObjectId(id));
      if (ids.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one student is required' });
      }
      // Verify students belong to this school
      const count = await Student.countDocuments({ _id: { $in: ids }, school_id: schoolId });
      if (count !== ids.length) {
        return res.status(400).json({ success: false, error: 'Some students not found in this school' });
      }
      doc.target_students = ids;
    }

    if (target_type === 'users') {
      const ids = (target_users || []).filter((id) => mongoose.isValidObjectId(id));
      if (ids.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one user is required' });
      }
      const count = await User.countDocuments({ _id: { $in: ids }, school_id: schoolId });
      if (count !== ids.length) {
        return res.status(400).json({ success: false, error: 'Some users not found in this school' });
      }
      doc.target_users = ids;
    }

    const notice = await SchoolNotice.create(doc);
    const populated = await SchoolNotice.findById(notice._id)
      .populate('created_by', 'name role')
      .lean();

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /:id/read — mark as read ────────────────────────────────────────────
router.post('/:id/read', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid notice id' });
    }
    await SchoolNotice.findOneAndUpdate(
      { _id: req.params.id, school_id: new mongoose.Types.ObjectId(req.schoolId) },
      { $addToSet: { read_by: req.user._id } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /:id — delete (creator or admin) ──────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid notice id' });
    }
    const notice = await SchoolNotice.findOne({
      _id: req.params.id,
      school_id: new mongoose.Types.ObjectId(req.schoolId),
    });
    if (!notice) {
      return res.status(404).json({ success: false, error: 'Notice not found' });
    }
    // Only creator or admin can delete
    if (notice.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    await SchoolNotice.findByIdAndDelete(notice._id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
