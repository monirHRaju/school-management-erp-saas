const express = require('express');
const mongoose = require('mongoose');
const AcademicConfig = require('../models/AcademicConfig');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(authMiddleware);

const DEFAULTS = {
  classes: ['Play', 'Nursery', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'],
  sections: ['A', 'B', 'C', 'D'],
  shifts: ['Morning', 'Day'],
  groups: ['General', 'Science', 'Commerce', 'Arts'],
};

// GET /api/academic-config — return config (auto-seed defaults if none)
router.get('/', requireRole('admin', 'staff', 'accountant', 'teacher'), async (req, res) => {
  try {
    let config = await AcademicConfig.findOne({ school_id: new mongoose.Types.ObjectId(req.schoolId) }).lean();
    if (!config) {
      config = await AcademicConfig.create({
        school_id: new mongoose.Types.ObjectId(req.schoolId),
        ...DEFAULTS,
      });
      config = config.toObject();
    }
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/academic-config — update arrays (admin only)
router.patch('/', requireRole('admin'), async (req, res) => {
  try {
    const { classes, sections, shifts, groups, classSubjects } = req.body;
    const update = {};
    if (Array.isArray(classes)) update.classes = classes.map((c) => String(c).trim()).filter(Boolean);
    if (Array.isArray(sections)) update.sections = sections.map((s) => String(s).trim()).filter(Boolean);
    if (Array.isArray(shifts)) update.shifts = shifts.map((s) => String(s).trim()).filter(Boolean);
    if (Array.isArray(groups)) update.groups = groups.map((g) => String(g).trim()).filter(Boolean);
    if (Array.isArray(classSubjects)) {
      update.classSubjects = classSubjects
        .filter((cs) => cs.class && String(cs.class).trim())
        .map((cs) => ({
          class: String(cs.class).trim(),
          subjects: Array.isArray(cs.subjects)
            ? cs.subjects.map((s) => String(s).trim()).filter(Boolean)
            : [],
        }));
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: 'Nothing to update' });
    }

    const config = await AcademicConfig.findOneAndUpdate(
      { school_id: new mongoose.Types.ObjectId(req.schoolId) },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
