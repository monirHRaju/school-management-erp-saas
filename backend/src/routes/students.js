const express = require('express');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/students — list with optional filters (class, section, status)
router.get('/', async (req, res) => {
  try {
    const { class: classFilter, section, status, shift, group, q } = req.query;
    const filter = { school_id: new mongoose.Types.ObjectId(req.schoolId) };
    if (classFilter) filter.class = classFilter;
    if (section) filter.section = section;
    if (status) filter.status = status;
    if (shift) filter.shift = shift;
    if (group) filter.group = group;

    const conditions = [filter];
    if (q && typeof q === 'string' && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      conditions.push({ $or: [{ name: regex }, { rollNo: regex }] });
    }

    const students = await Student.find(conditions.length > 1 ? { $and: conditions } : filter)
      .sort({ createdAt: -1 })
      .lean();
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
    const {
      name,
      fatherName,
      motherName,
      guardianName,
      guardianPhone,
      photoUrl,
      shift,
      group,
      dateOfBirth,
      birthRegNo,
      gender,
      religion,
      class: className,
      section,
      rollNo,
      monthlyFee,
      admissionDate,
      status,
    } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    const student = await Student.create({
      school_id: new mongoose.Types.ObjectId(req.schoolId),
      name: name.trim(),
      fatherName: fatherName ? fatherName.trim() : undefined,
      motherName: motherName ? motherName.trim() : undefined,
      guardianName:
        guardianName?.trim() ||
        fatherName?.trim() ||
        motherName?.trim() ||
        undefined,
      guardianPhone: guardianPhone ? String(guardianPhone).trim() : undefined,
      photoUrl: photoUrl ? String(photoUrl).trim() : undefined,
      shift: shift ? String(shift).trim() : undefined,
      group: group ? String(group).trim() : undefined,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      birthRegNo: birthRegNo ? String(birthRegNo).trim() : undefined,
      gender: gender ? String(gender).trim() : undefined,
      religion: religion ? String(religion).trim() : undefined,
      class: className ? String(className).trim() : undefined,
      section: section ? String(section).trim() : undefined,
      rollNo: rollNo != null ? String(rollNo).trim() : undefined,
      monthlyFee:
        monthlyFee !== undefined && monthlyFee !== null && monthlyFee !== ''
          ? Number(monthlyFee)
          : undefined,
      admissionDate: admissionDate ? new Date(admissionDate) : undefined,
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
    const {
      name,
      fatherName,
      motherName,
      guardianName,
      guardianPhone,
      photoUrl,
      shift,
      group,
      dateOfBirth,
      birthRegNo,
      gender,
      religion,
      class: className,
      section,
      rollNo,
      monthlyFee,
      admissionDate,
      status,
    } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (fatherName !== undefined) update.fatherName = fatherName ? fatherName.trim() : '';
    if (motherName !== undefined) update.motherName = motherName ? motherName.trim() : '';
    if (guardianName !== undefined) update.guardianName = guardianName ? guardianName.trim() : '';
    if (guardianPhone !== undefined)
      update.guardianPhone = guardianPhone ? String(guardianPhone).trim() : '';
    if (photoUrl !== undefined) update.photoUrl = photoUrl ? String(photoUrl).trim() : '';
    if (shift !== undefined) update.shift = shift ? String(shift).trim() : '';
    if (group !== undefined) update.group = group ? String(group).trim() : '';
    if (dateOfBirth !== undefined)
      update.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
    if (birthRegNo !== undefined) update.birthRegNo = birthRegNo ? String(birthRegNo).trim() : '';
    if (gender !== undefined) update.gender = gender ? String(gender).trim() : '';
    if (religion !== undefined) update.religion = religion ? String(religion).trim() : '';
    if (className !== undefined) update.class = String(className).trim();
    if (section !== undefined) update.section = String(section).trim();
    if (rollNo !== undefined) update.rollNo = String(rollNo).trim();
    if (monthlyFee !== undefined && monthlyFee !== null && monthlyFee !== '')
      update.monthlyFee = Number(monthlyFee);
    if (admissionDate !== undefined)
      update.admissionDate = admissionDate ? new Date(admissionDate) : undefined;
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
