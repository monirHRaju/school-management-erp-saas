const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const canRead = requireRole('admin', 'staff', 'teacher');
const canWrite = requireRole('admin', 'staff');

// GET /api/exams
router.get('/', authMiddleware, canRead, async (req, res) => {
  try {
    const { session, class: cls, status, q } = req.query;
    const filter = { school_id: req.user.school_id };
    if (session) filter.session = session;
    if (cls) filter.class = cls;
    if (status) filter.status = status;
    if (q) filter.name = { $regex: q, $options: 'i' };

    const exams = await Exam.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: exams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/exams
router.post('/', authMiddleware, canWrite, async (req, res) => {
  try {
    const { name, session, class: cls, term, examDate, status } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Exam name is required' });
    }
    const exam = await Exam.create({
      school_id: req.user.school_id,
      name: name.trim(),
      session: session || '',
      class: cls || '',
      term: term || '',
      examDate: examDate || null,
      status: status || 'active',
    });
    res.status(201).json({ success: true, data: exam });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/exams/:id
router.patch('/:id', authMiddleware, canWrite, async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, school_id: req.user.school_id });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    const fields = ['name', 'session', 'term', 'examDate', 'status'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) exam[f] = req.body[f];
    });
    if (req.body.class !== undefined) exam.class = req.body.class;
    if (req.body.name) exam.name = req.body.name.trim();

    await exam.save();
    res.json({ success: true, data: exam });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/exams/:id
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const exam = await Exam.findOneAndDelete({ _id: req.params.id, school_id: req.user.school_id });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    res.json({ success: true, message: 'Exam deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
