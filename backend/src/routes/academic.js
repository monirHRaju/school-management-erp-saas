const express = require('express');
const mongoose = require('mongoose');
const AcademicClass = require('../models/AcademicClass');
const AcademicSession = require('../models/AcademicSession');
const AcademicSection = require('../models/AcademicSection');
const AcademicSubject = require('../models/AcademicSubject');
const AcademicShift = require('../models/AcademicShift');
const AcademicGroup = require('../models/AcademicGroup');
const AcademicConfig = require('../models/AcademicConfig');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
router.use(authMiddleware);

const READ_ROLES = ['admin', 'staff', 'accountant', 'teacher'];

// ── Auto-migration helper ─────────────────────────────────────────────────────
// Runs once per school: if new collections are empty but old AcademicConfig exists, seed from it.
async function autoMigrate(schoolId) {
  const schoolObjId = new mongoose.Types.ObjectId(schoolId);

  const [classCount, shiftCount, groupCount, sectionCount, subjectCount] = await Promise.all([
    AcademicClass.countDocuments({ school_id: schoolObjId }),
    AcademicShift.countDocuments({ school_id: schoolObjId }),
    AcademicGroup.countDocuments({ school_id: schoolObjId }),
    AcademicSection.countDocuments({ school_id: schoolObjId }),
    AcademicSubject.countDocuments({ school_id: schoolObjId }),
  ]);

  const alreadyMigrated = classCount > 0 || shiftCount > 0 || groupCount > 0 || sectionCount > 0 || subjectCount > 0;
  if (alreadyMigrated) return;

  const config = await AcademicConfig.findOne({ school_id: schoolObjId }).lean();
  if (!config) return;

  const ops = [];

  if (config.classes?.length) {
    ops.push(
      AcademicClass.insertMany(
        config.classes.map((name) => ({ school_id: schoolObjId, name, status: 'active' })),
        { ordered: false }
      ).catch(() => {})
    );
  }
  if (config.sections?.length) {
    ops.push(
      AcademicSection.insertMany(
        config.sections.map((name) => ({ school_id: schoolObjId, name, status: 'active' })),
        { ordered: false }
      ).catch(() => {})
    );
  }
  if (config.shifts?.length) {
    ops.push(
      AcademicShift.insertMany(
        config.shifts.map((name) => ({ school_id: schoolObjId, name, status: 'active' })),
        { ordered: false }
      ).catch(() => {})
    );
  }
  if (config.groups?.length) {
    ops.push(
      AcademicGroup.insertMany(
        config.groups.map((name) => ({ school_id: schoolObjId, name, status: 'active' })),
        { ordered: false }
      ).catch(() => {})
    );
  }
  if (config.classSubjects?.length) {
    const subjectDocs = [];
    for (const cs of config.classSubjects) {
      if (!cs.class || !cs.subjects?.length) continue;
      for (const subjectName of cs.subjects) {
        if (!subjectName?.trim()) continue;
        subjectDocs.push({ school_id: schoolObjId, name: subjectName.trim(), classes: [cs.class], status: 'active' });
      }
    }
    if (subjectDocs.length) {
      ops.push(AcademicSubject.insertMany(subjectDocs, { ordered: false }).catch(() => {}));
    }
  }

  await Promise.all(ops);
}

// ── Utility ───────────────────────────────────────────────────────────────────
function schoolObjId(req) {
  return new mongoose.Types.ObjectId(req.schoolId);
}

function applySearch(filter, q) {
  if (q && typeof q === 'string' && q.trim()) {
    const safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name = new RegExp(safe, 'i');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/classes', requireRole(...READ_ROLES), async (req, res) => {
  try {
    await autoMigrate(req.schoolId);
    const filter = { school_id: schoolObjId(req) };
    if (req.query.status) filter.status = req.query.status;
    applySearch(filter, req.query.q);
    const data = await AcademicClass.find(filter).sort({ name: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/classes', requireRole('admin'), async (req, res) => {
  try {
    const { name, admissionFee, examFee, idCardFee, sessionFee, transcriptFee, tuitionFee, status } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Name is required' });
    const doc = await AcademicClass.create({
      school_id: schoolObjId(req),
      name: name.trim(),
      admissionFee: Number(admissionFee) || 0,
      examFee: Number(examFee) || 0,
      idCardFee: Number(idCardFee) || 0,
      sessionFee: Number(sessionFee) || 0,
      transcriptFee: Number(transcriptFee) || 0,
      tuitionFee: Number(tuitionFee) || 0,
      status: status || 'active',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: 'A class with this name already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/classes/:id', requireRole('admin'), async (req, res) => {
  try {
    const { name, admissionFee, examFee, idCardFee, sessionFee, transcriptFee, tuitionFee, status } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (admissionFee !== undefined) update.admissionFee = Number(admissionFee) || 0;
    if (examFee !== undefined) update.examFee = Number(examFee) || 0;
    if (idCardFee !== undefined) update.idCardFee = Number(idCardFee) || 0;
    if (sessionFee !== undefined) update.sessionFee = Number(sessionFee) || 0;
    if (transcriptFee !== undefined) update.transcriptFee = Number(transcriptFee) || 0;
    if (tuitionFee !== undefined) update.tuitionFee = Number(tuitionFee) || 0;
    if (status !== undefined) update.status = status;
    const doc = await AcademicClass.findOneAndUpdate(
      { _id: req.params.id, school_id: schoolObjId(req) },
      { $set: update },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: 'A class with this name already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/classes/:id', requireRole('admin'), async (req, res) => {
  try {
    const doc = await AcademicClass.findOneAndDelete({ _id: req.params.id, school_id: schoolObjId(req) });
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SESSIONS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/sessions', requireRole(...READ_ROLES), async (req, res) => {
  try {
    const filter = { school_id: schoolObjId(req) };
    if (req.query.status) filter.status = req.query.status;
    applySearch(filter, req.query.q);
    const data = await AcademicSession.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/sessions', requireRole('admin'), async (req, res) => {
  try {
    const { name, year, status } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Name is required' });
    const doc = await AcademicSession.create({
      school_id: schoolObjId(req),
      name: name.trim(),
      year: year?.trim() || '',
      status: status || 'active',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: 'A session with this name already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/sessions/:id', requireRole('admin'), async (req, res) => {
  try {
    const { name, year, status } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (year !== undefined) update.year = year.trim();
    if (status !== undefined) update.status = status;
    const doc = await AcademicSession.findOneAndUpdate(
      { _id: req.params.id, school_id: schoolObjId(req) },
      { $set: update },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: 'A session with this name already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/sessions/:id', requireRole('admin'), async (req, res) => {
  try {
    const doc = await AcademicSession.findOneAndDelete({ _id: req.params.id, school_id: schoolObjId(req) });
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/sections', requireRole(...READ_ROLES), async (req, res) => {
  try {
    await autoMigrate(req.schoolId);
    const filter = { school_id: schoolObjId(req) };
    if (req.query.status) filter.status = req.query.status;
    applySearch(filter, req.query.q);
    const data = await AcademicSection.find(filter).populate('session', 'name year').sort({ name: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/sections', requireRole('admin'), async (req, res) => {
  try {
    const { name, session, status } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Name is required' });
    const doc = await AcademicSection.create({
      school_id: schoolObjId(req),
      name: name.trim(),
      session: session && mongoose.isValidObjectId(session) ? session : null,
      status: status || 'active',
    });
    const populated = await AcademicSection.findById(doc._id).populate('session', 'name year').lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: 'A section with this name already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/sections/:id', requireRole('admin'), async (req, res) => {
  try {
    const { name, session, status } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (session !== undefined) update.session = session && mongoose.isValidObjectId(session) ? session : null;
    if (status !== undefined) update.status = status;
    const doc = await AcademicSection.findOneAndUpdate(
      { _id: req.params.id, school_id: schoolObjId(req) },
      { $set: update },
      { new: true }
    ).populate('session', 'name year');
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: 'A section with this name already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/sections/:id', requireRole('admin'), async (req, res) => {
  try {
    const doc = await AcademicSection.findOneAndDelete({ _id: req.params.id, school_id: schoolObjId(req) });
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/subjects', requireRole(...READ_ROLES), async (req, res) => {
  try {
    await autoMigrate(req.schoolId);
    const filter = { school_id: schoolObjId(req) };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.class) filter.classes = req.query.class;
    applySearch(filter, req.query.q);
    const data = await AcademicSubject.find(filter).sort({ name: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/subjects', requireRole('admin'), async (req, res) => {
  try {
    const { classes, name, code, writtenMark, mcqMark, otherMark, practicalMark, type, status } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Name is required' });
    const doc = await AcademicSubject.create({
      school_id: schoolObjId(req),
      classes: Array.isArray(classes) ? classes.map((c) => String(c).trim()).filter(Boolean) : [],
      name: name.trim(),
      code: code?.trim() || '',
      writtenMark: Number(writtenMark) || 0,
      mcqMark: Number(mcqMark ?? otherMark) || 0,
      practicalMark: Number(practicalMark) || 0,
      type: type || 'Main',
      status: status || 'active',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/subjects/:id', requireRole('admin'), async (req, res) => {
  try {
    const { classes, name, code, writtenMark, mcqMark, otherMark, practicalMark, type, status } = req.body;
    const update = {};
    if (classes !== undefined) update.classes = Array.isArray(classes) ? classes.map((c) => String(c).trim()).filter(Boolean) : [];
    if (name !== undefined) update.name = name.trim();
    if (code !== undefined) update.code = code.trim();
    if (writtenMark !== undefined) update.writtenMark = Number(writtenMark) || 0;
    if (mcqMark !== undefined) update.mcqMark = Number(mcqMark) || 0;
    else if (otherMark !== undefined) update.mcqMark = Number(otherMark) || 0;
    if (practicalMark !== undefined) update.practicalMark = Number(practicalMark) || 0;
    if (type !== undefined) update.type = type;
    if (status !== undefined) update.status = status;
    const doc = await AcademicSubject.findOneAndUpdate(
      { _id: req.params.id, school_id: schoolObjId(req) },
      { $set: update },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/subjects/:id', requireRole('admin'), async (req, res) => {
  try {
    const doc = await AcademicSubject.findOneAndDelete({ _id: req.params.id, school_id: schoolObjId(req) });
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SHIFTS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/shifts', requireRole(...READ_ROLES), async (req, res) => {
  try {
    await autoMigrate(req.schoolId);
    const filter = { school_id: schoolObjId(req) };
    if (req.query.status) filter.status = req.query.status;
    applySearch(filter, req.query.q);
    const data = await AcademicShift.find(filter).sort({ name: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/shifts', requireRole('admin'), async (req, res) => {
  try {
    const { name, status } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Name is required' });
    const doc = await AcademicShift.create({ school_id: schoolObjId(req), name: name.trim(), status: status || 'active' });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: 'A shift with this name already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/shifts/:id', requireRole('admin'), async (req, res) => {
  try {
    const { name, status } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (status !== undefined) update.status = status;
    const doc = await AcademicShift.findOneAndUpdate(
      { _id: req.params.id, school_id: schoolObjId(req) },
      { $set: update },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: 'A shift with this name already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/shifts/:id', requireRole('admin'), async (req, res) => {
  try {
    const doc = await AcademicShift.findOneAndDelete({ _id: req.params.id, school_id: schoolObjId(req) });
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUPS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/groups', requireRole(...READ_ROLES), async (req, res) => {
  try {
    await autoMigrate(req.schoolId);
    const filter = { school_id: schoolObjId(req) };
    if (req.query.status) filter.status = req.query.status;
    applySearch(filter, req.query.q);
    const data = await AcademicGroup.find(filter).sort({ name: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/groups', requireRole('admin'), async (req, res) => {
  try {
    const { name, status } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Name is required' });
    const doc = await AcademicGroup.create({ school_id: schoolObjId(req), name: name.trim(), status: status || 'active' });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: 'A group with this name already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/groups/:id', requireRole('admin'), async (req, res) => {
  try {
    const { name, status } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (status !== undefined) update.status = status;
    const doc = await AcademicGroup.findOneAndUpdate(
      { _id: req.params.id, school_id: schoolObjId(req) },
      { $set: update },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: 'A group with this name already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/groups/:id', requireRole('admin'), async (req, res) => {
  try {
    const doc = await AcademicGroup.findOneAndDelete({ _id: req.params.id, school_id: schoolObjId(req) });
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
