const express = require('express');
const mongoose = require('mongoose');
const AcademicConfig = require('../models/AcademicConfig');
const AcademicClass = require('../models/AcademicClass');
const AcademicSession = require('../models/AcademicSession');
const AcademicSection = require('../models/AcademicSection');
const AcademicSubject = require('../models/AcademicSubject');
const AcademicShift = require('../models/AcademicShift');
const AcademicGroup = require('../models/AcademicGroup');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(authMiddleware);

const DEFAULTS = {
  classes: ['Play', 'Nursery', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'],
  sections: ['A', 'B', 'C', 'D'],
  shifts: ['Morning', 'Day'],
  groups: ['General', 'Science', 'Commerce', 'Arts'],
  weeklyHolidays: ['Friday'],
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// GET /api/academic-config — aggregate from new models (with fallback to legacy AcademicConfig)
router.get('/', requireRole('admin', 'staff', 'accountant', 'teacher'), async (req, res) => {
  try {
    const schoolObjId = new mongoose.Types.ObjectId(req.schoolId);

    // Check if new models have data
    const [classCount, sectionCount, shiftCount, groupCount, subjectCount] = await Promise.all([
      AcademicClass.countDocuments({ school_id: schoolObjId }),
      AcademicSection.countDocuments({ school_id: schoolObjId }),
      AcademicShift.countDocuments({ school_id: schoolObjId }),
      AcademicGroup.countDocuments({ school_id: schoolObjId }),
      AcademicSubject.countDocuments({ school_id: schoolObjId }),
    ]);

    const hasNewData = classCount > 0 || sectionCount > 0 || shiftCount > 0 || groupCount > 0 || subjectCount > 0;

    // Get weeklyHolidays from legacy AcademicConfig (always)
    let legacyConfig = await AcademicConfig.findOne({ school_id: schoolObjId }).lean();
    const weeklyHolidays = legacyConfig?.weeklyHolidays ?? DEFAULTS.weeklyHolidays;

    if (hasNewData) {
      // Aggregate from new models
      const [classes, sections, shifts, groups, subjects] = await Promise.all([
        AcademicClass.find({ school_id: schoolObjId, status: 'active' }).sort({ name: 1 }).lean(),
        AcademicSection.find({ school_id: schoolObjId, status: 'active' }).sort({ name: 1 }).lean(),
        AcademicShift.find({ school_id: schoolObjId, status: 'active' }).sort({ name: 1 }).lean(),
        AcademicGroup.find({ school_id: schoolObjId, status: 'active' }).sort({ name: 1 }).lean(),
        AcademicSubject.find({ school_id: schoolObjId, status: 'active' }).sort({ name: 1 }).lean(),
      ]);

      // Build classSubjects from subjects (group by classes[])
      const classSubjectsMap = {};
      for (const subj of subjects) {
        for (const cls of (subj.classes || [])) {
          if (!classSubjectsMap[cls]) classSubjectsMap[cls] = [];
          classSubjectsMap[cls].push(subj.name);
        }
      }
      const classSubjects = Object.entries(classSubjectsMap).map(([cls, subjList]) => ({
        class: cls,
        subjects: subjList,
      }));

      return res.json({
        success: true,
        data: {
          classes: classes.map((c) => c.name),
          sections: sections.map((s) => s.name),
          shifts: shifts.map((s) => s.name),
          groups: groups.map((g) => g.name),
          classSubjects,
          weeklyHolidays,
        },
      });
    }

    // Fallback: use legacy AcademicConfig
    if (!legacyConfig) {
      legacyConfig = await AcademicConfig.create({
        school_id: schoolObjId,
        ...DEFAULTS,
      });
      legacyConfig = legacyConfig.toObject();
    }
    res.json({ success: true, data: legacyConfig });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/academic-config — update weeklyHolidays (admin only); arrays kept for legacy compat
router.patch('/', requireRole('admin'), async (req, res) => {
  try {
    const { classes, sections, shifts, groups, classSubjects, weeklyHolidays } = req.body;
    const update = {};
    if (Array.isArray(classes)) update.classes = classes.map((c) => String(c).trim()).filter(Boolean);
    if (Array.isArray(sections)) update.sections = sections.map((s) => String(s).trim()).filter(Boolean);
    if (Array.isArray(shifts)) update.shifts = shifts.map((s) => String(s).trim()).filter(Boolean);
    if (Array.isArray(groups)) update.groups = groups.map((g) => String(g).trim()).filter(Boolean);
    if (Array.isArray(weeklyHolidays)) {
      update.weeklyHolidays = weeklyHolidays.map((d) => String(d).trim()).filter((d) => WEEKDAYS.includes(d));
    }
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
