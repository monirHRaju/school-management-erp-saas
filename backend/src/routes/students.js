const express = require('express');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/students — list with optional filters (class, section, status)
router.get('/', async (req, res) => {
  try {
    const { class: classFilter, section, status } = req.query;
    const filter = { school_id: new mongoose.Types.ObjectId(req.schoolId) };
    if (classFilter) filter.class = classFilter;
    if (section) filter.section = section;
    if (status) filter.status = status;

    const students = await Student.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/students/:id — get one
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid student id' });
    }
    const student = await Student.findOne({
      _id: req.params.id,
      school_id: new mongoose.Types.ObjectId(req.schoolId),
    }).lean();
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/students — create
router.post('/', async (req, res) => {
  try {
    const { name, guardianName, class: className, section, rollNo, status } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    const student = await Student.create({
      school_id: new mongoose.Types.ObjectId(req.schoolId),
      name: name.trim(),
      guardianName: guardianName ? guardianName.trim() : undefined,
      class: className ? String(className).trim() : undefined,
      section: section ? String(section).trim() : undefined,
      rollNo: rollNo != null ? String(rollNo).trim() : undefined,
      status: status && ['active', 'inactive', 'left'].includes(status) ? status : 'active',
    });
    res.status(201).json({ success: true, data: student.toObject() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/students/:id — update
router.patch('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid student id' });
    }
    const { name, guardianName, class: className, section, rollNo, status } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (guardianName !== undefined) update.guardianName = guardianName ? guardianName.trim() : '';
    if (className !== undefined) update.class = String(className).trim();
    if (section !== undefined) update.section = String(section).trim();
    if (rollNo !== undefined) update.rollNo = String(rollNo).trim();
    if (status !== undefined && ['active', 'inactive', 'left'].includes(status)) update.status = status;

    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, school_id: new mongoose.Types.ObjectId(req.schoolId) },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/students/:id
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid student id' });
    }
    const result = await Student.findOneAndDelete({
      _id: req.params.id,
      school_id: new mongoose.Types.ObjectId(req.schoolId),
    });
    if (!result) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    res.json({ success: true, data: { _id: req.params.id, deleted: true } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
