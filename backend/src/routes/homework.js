'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Homework = require('../models/Homework');
const Student = require('../models/Student');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
router.use(authMiddleware);

// ── GET / — list homework ─────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const role = req.user.role;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    let filter = { school_id: schoolId };

    if (role === 'guardian') {
      // Resolve guardian's children → collect class/section pairs
      const studentIds = req.user.student_ids || [];
      if (!studentIds.length) {
        return res.json({ success: true, data: [], total: 0, page, totalPages: 0 });
      }
      const students = await Student.find(
        { _id: { $in: studentIds }, school_id: schoolId },
        'name class section group'
      ).lean();

      if (!students.length) {
        return res.json({ success: true, data: [], total: 0, page, totalPages: 0 });
      }

      // Match homework where class matches AND (section is empty/all OR section matches)
      const orConditions = students.map((s) => {
        const cond = { class: s.class };
        if (s.section) {
          cond.$or = [{ section: '' }, { section: s.section }];
        }
        return cond;
      });

      filter.$or = orConditions;
      filter.status = 'active';
    } else {
      // Admin / staff / accountant — full school view with optional filters
      if (req.query.class) filter.class = req.query.class;
      if (req.query.section !== undefined && req.query.section !== '')
        filter.section = req.query.section;
      if (req.query.subject) filter.subject = new RegExp(req.query.subject, 'i');
      if (req.query.status) filter.status = req.query.status;
      else filter.status = 'active';

      if (req.query.from_date || req.query.to_date) {
        filter.due_date = {};
        if (req.query.from_date) filter.due_date.$gte = new Date(req.query.from_date);
        if (req.query.to_date) filter.due_date.$lte = new Date(req.query.to_date);
      }
    }

    const [data, total] = await Promise.all([
      Homework.find(filter)
        .sort({ due_date: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('created_by', 'name role')
        .lean(),
      Homework.countDocuments(filter),
    ]);

    res.json({ success: true, data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// ── POST / — create homework ──────────────────────────────────────────────────
router.post('/', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { title, description, subject, class: cls, section, group, due_date, attachment_url } = req.body;

    if (!title?.trim()) return res.status(400).json({ success: false, error: 'Title is required' });
    if (!description?.trim()) return res.status(400).json({ success: false, error: 'Description is required' });
    if (!subject?.trim()) return res.status(400).json({ success: false, error: 'Subject is required' });
    if (!cls?.trim()) return res.status(400).json({ success: false, error: 'Class is required' });
    if (!due_date) return res.status(400).json({ success: false, error: 'Due date is required' });

    const hw = await Homework.create({
      school_id: req.schoolId,
      created_by: req.user._id,
      title: title.trim(),
      description: description.trim(),
      subject: subject.trim(),
      class: cls.trim(),
      section: section?.trim() || '',
      group: group?.trim() || '',
      due_date: new Date(due_date),
      attachment_url: attachment_url?.trim() || '',
    });

    const populated = await hw.populate('created_by', 'name role');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /:id — update homework ──────────────────────────────────────────────
router.patch('/:id', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const hw = await Homework.findOne({ _id: req.params.id, school_id: schoolId });
    if (!hw) return res.status(404).json({ success: false, error: 'Homework not found' });

    // Only creator or admin can edit
    const isCreator = hw.created_by.toString() === req.user._id.toString();
    if (!isCreator && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only the creator or admin can edit this homework' });
    }

    const allowed = ['title', 'description', 'subject', 'class', 'section', 'group', 'due_date', 'attachment_url', 'status'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        hw[key] = key === 'due_date' ? new Date(req.body[key]) : req.body[key];
      }
    }
    // Handle class field (reserved word)
    if (req.body.class !== undefined) hw.class = req.body.class;

    await hw.save();
    const populated = await hw.populate('created_by', 'name role');
    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /:id — delete homework ─────────────────────────────────────────────
router.delete('/:id', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const hw = await Homework.findOne({ _id: req.params.id, school_id: schoolId });
    if (!hw) return res.status(404).json({ success: false, error: 'Homework not found' });

    const isCreator = hw.created_by.toString() === req.user._id.toString();
    if (!isCreator && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only the creator or admin can delete this homework' });
    }

    await hw.deleteOne();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
