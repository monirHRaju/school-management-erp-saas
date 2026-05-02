const express = require('express');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { findOrCreateGuardian, linkStudent, unlinkStudent } = require('../services/guardianService');

const { checkStudentLimit, checkGuardianLimit } = require('../middleware/planGate');

const router = express.Router();

router.use(authMiddleware);

// Generate a unique 6-digit numeric student ID for the given school.
// Retries on collision; falls back to a longer suffix only if 10 attempts fail.
async function generateUniqueStudentId(schoolId) {
  const schoolObjectId = typeof schoolId === 'string' ? new mongoose.Types.ObjectId(schoolId) : schoolId;
  for (let i = 0; i < 10; i++) {
    const candidate = String(Math.floor(100000 + Math.random() * 900000));
    const exists = await Student.exists({ school_id: schoolObjectId, studentId: candidate });
    if (!exists) return candidate;
  }
  // Fallback: 6 digits + 2-char suffix to guarantee uniqueness on extreme collision
  return `${Math.floor(100000 + Math.random() * 900000)}${Math.random().toString(36).slice(2, 4)}`;
}

// GET /api/students — list with optional filters; add page & limit for pagination
router.get('/', requireRole('admin', 'staff', 'accountant', 'teacher'), async (req, res) => {
  try {
    const { class: classFilter, section, status, shift, group, q, page, limit } = req.query;
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

    const finalFilter = conditions.length > 1 ? { $and: conditions } : filter;

    if (page != null) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
      const total = await Student.countDocuments(finalFilter);
      const students = await Student.find(finalFilter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean();
      return res.json({ success: true, data: students, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
    }

    // No pagination — return all (used by dropdowns in other pages)
    const students = await Student.find(finalFilter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/students/bulk — batch import (must be before /:id)
router.post('/bulk', requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { defaults = {}, students: rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No student rows provided' });
    }
    if (rows.length > 500) {
      return res.status(400).json({ success: false, error: 'Maximum 500 students per import' });
    }

    const limitCheck = await checkStudentLimit(req.schoolId, rows.length);
    if (!limitCheck.allowed) {
      return res.status(403).json({ success: false, error: limitCheck.error });
    }

    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const created = [];
    const failed = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = (row.name || '').trim();
      if (!name) {
        failed.push({ row: i + 1, name: name || '(blank)', error: 'Name is required' });
        continue;
      }

      // Merge: row values take precedence over defaults
      const cls    = (row.class        || defaults.class        || '').trim();
      const sec    = (row.section      || defaults.section      || '').trim();
      const shift  = (row.shift        || defaults.shift        || '').trim();
      const grp    = (row.group        || defaults.group        || '').trim();
      const phone  = (row.guardianPhone || '').trim();
      const fee    = row.monthlyFee != null && row.monthlyFee !== ''
        ? Number(row.monthlyFee)
        : defaults.monthlyFee != null && defaults.monthlyFee !== ''
          ? Number(defaults.monthlyFee)
          : undefined;
      const admDate = row.admissionDate || defaults.admissionDate;

      try {
        const studentIdValue = await generateUniqueStudentId(schoolId);
        const student = await Student.create({
          school_id: schoolId,
          studentId: studentIdValue,
          name,
          fatherName:    row.fatherName    ? String(row.fatherName).trim()    : undefined,
          motherName:    row.motherName    ? String(row.motherName).trim()    : undefined,
          guardianName:  row.guardianName  ? String(row.guardianName).trim()  : (row.fatherName ? String(row.fatherName).trim() : undefined),
          guardianPhone: phone || undefined,
          gender:        row.gender        ? String(row.gender).trim()        : undefined,
          religion:      row.religion      ? String(row.religion).trim()      : undefined,
          dateOfBirth:   row.dateOfBirth   ? new Date(row.dateOfBirth)        : undefined,
          rollNo:        row.rollNo != null ? String(row.rollNo).trim()       : undefined,
          address:       row.address       ? String(row.address).trim()       : undefined,
          whatsappNumber: row.whatsappNumber ? String(row.whatsappNumber).trim() : undefined,
          class:         cls  || undefined,
          section:       sec  || undefined,
          shift:         shift || undefined,
          group:         grp  || undefined,
          monthlyFee:    fee,
          admissionDate: admDate ? new Date(admDate) : undefined,
          status: 'active',
        });

        if (phone) {
          try {
            const result = await findOrCreateGuardian(
              req.schoolId, phone,
              row.guardianName?.trim() || row.fatherName?.trim() || 'Guardian'
            );
            if (result?.user) await linkStudent(result.user._id, student._id);
          } catch (_) { /* guardian creation non-fatal */ }
        }

        created.push(student._id);
      } catch (err) {
        failed.push({ row: i + 1, name, error: err.message });
      }
    }

    res.status(201).json({
      success: true,
      created: created.length,
      failed,
      total: rows.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/students/:id — get one
router.get('/:id', requireRole('admin', 'staff', 'accountant', 'teacher'), async (req, res) => {
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
router.post('/', requireRole('admin', 'staff'), async (req, res) => {
  try {
    const {
      studentId,
      name,
      nameBn,
      bloodGroup,
      fatherName,
      motherName,
      guardianName,
      guardianPhone,
      guardianRelation,
      guardianProfession,
      fatherProfession,
      motherProfession,
      fatherMobile,
      motherMobile,
      fatherMonthlyIncome,
      motherMonthlyIncome,
      whatsappNumber,
      address,
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
    const limitCheck = await checkStudentLimit(req.schoolId, 1);
    if (!limitCheck.allowed) {
      return res.status(403).json({ success: false, error: limitCheck.error });
    }

    // Resolve studentId: caller-supplied (admin only) or auto-generate
    let resolvedStudentId = (typeof studentId === 'string' && studentId.trim()) ? studentId.trim() : null;
    if (resolvedStudentId) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Only admin can set a custom student ID' });
      }
      const dup = await Student.exists({ school_id: new mongoose.Types.ObjectId(req.schoolId), studentId: resolvedStudentId });
      if (dup) return res.status(400).json({ success: false, error: 'Student ID already in use' });
    } else {
      resolvedStudentId = await generateUniqueStudentId(req.schoolId);
    }

    const student = await Student.create({
      school_id: new mongoose.Types.ObjectId(req.schoolId),
      studentId: resolvedStudentId,
      name: name.trim(),
      nameBn: nameBn ? String(nameBn).trim() : undefined,
      bloodGroup: bloodGroup ? String(bloodGroup).trim() : undefined,
      fatherName: fatherName ? fatherName.trim() : undefined,
      motherName: motherName ? motherName.trim() : undefined,
      guardianName:
        guardianName?.trim() ||
        fatherName?.trim() ||
        motherName?.trim() ||
        undefined,
      guardianPhone: guardianPhone ? String(guardianPhone).trim() : undefined,
      guardianRelation: guardianRelation ? String(guardianRelation).trim() : undefined,
      guardianProfession: guardianProfession ? String(guardianProfession).trim() : undefined,
      fatherProfession: fatherProfession ? String(fatherProfession).trim() : undefined,
      motherProfession: motherProfession ? String(motherProfession).trim() : undefined,
      fatherMobile: fatherMobile ? String(fatherMobile).trim() : undefined,
      motherMobile: motherMobile ? String(motherMobile).trim() : undefined,
      fatherMonthlyIncome: fatherMonthlyIncome !== undefined && fatherMonthlyIncome !== null && fatherMonthlyIncome !== '' ? Number(fatherMonthlyIncome) : undefined,
      motherMonthlyIncome: motherMonthlyIncome !== undefined && motherMonthlyIncome !== null && motherMonthlyIncome !== '' ? Number(motherMonthlyIncome) : undefined,
      whatsappNumber: whatsappNumber ? String(whatsappNumber).trim() : undefined,
      address: address ? String(address).trim() : undefined,
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
    // Auto-create guardian if phone provided
    if (guardianPhone) {
      try {
        const result = await findOrCreateGuardian(
          req.schoolId,
          guardianPhone,
          guardianName?.trim() || fatherName?.trim() || 'Guardian'
        );
        if (result?.user) {
          await linkStudent(result.user._id, student._id);
        }
      } catch (err) {
        console.error('[Guardian] Auto-create failed:', err.message);
      }
    }

    res.status(201).json({ success: true, data: student.toObject() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/students/:id — update
router.patch('/:id', requireRole('admin', 'staff'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid student id' });
    }
    const {
      studentId,
      name,
      nameBn,
      bloodGroup,
      fatherName,
      motherName,
      guardianName,
      guardianPhone,
      guardianRelation,
      guardianProfession,
      fatherProfession,
      motherProfession,
      fatherMobile,
      motherMobile,
      fatherMonthlyIncome,
      motherMonthlyIncome,
      whatsappNumber,
      address,
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

    // studentId change is admin-only; must be unique within the school
    if (studentId !== undefined) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Only admin can change student ID' });
      }
      const trimmed = String(studentId).trim();
      if (!trimmed) {
        return res.status(400).json({ success: false, error: 'Student ID cannot be empty' });
      }
      const dup = await Student.exists({
        school_id: new mongoose.Types.ObjectId(req.schoolId),
        studentId: trimmed,
        _id: { $ne: req.params.id },
      });
      if (dup) return res.status(400).json({ success: false, error: 'Student ID already in use' });
      update.studentId = trimmed;
    }

    if (name !== undefined) update.name = name.trim();
    if (nameBn !== undefined) update.nameBn = nameBn ? String(nameBn).trim() : '';
    if (bloodGroup !== undefined) update.bloodGroup = bloodGroup ? String(bloodGroup).trim() : '';
    if (fatherMobile !== undefined) update.fatherMobile = fatherMobile ? String(fatherMobile).trim() : '';
    if (motherMobile !== undefined) update.motherMobile = motherMobile ? String(motherMobile).trim() : '';
    if (fatherMonthlyIncome !== undefined) update.fatherMonthlyIncome = fatherMonthlyIncome === '' || fatherMonthlyIncome === null ? undefined : Number(fatherMonthlyIncome);
    if (motherMonthlyIncome !== undefined) update.motherMonthlyIncome = motherMonthlyIncome === '' || motherMonthlyIncome === null ? undefined : Number(motherMonthlyIncome);
    if (fatherName !== undefined) update.fatherName = fatherName ? fatherName.trim() : '';
    if (motherName !== undefined) update.motherName = motherName ? motherName.trim() : '';
    if (guardianName !== undefined) update.guardianName = guardianName ? guardianName.trim() : '';
    if (guardianPhone !== undefined)
      update.guardianPhone = guardianPhone ? String(guardianPhone).trim() : '';
    if (guardianRelation !== undefined) update.guardianRelation = guardianRelation ? String(guardianRelation).trim() : '';
    if (guardianProfession !== undefined) update.guardianProfession = guardianProfession ? String(guardianProfession).trim() : '';
    if (fatherProfession !== undefined) update.fatherProfession = fatherProfession ? String(fatherProfession).trim() : '';
    if (motherProfession !== undefined) update.motherProfession = motherProfession ? String(motherProfession).trim() : '';
    if (whatsappNumber !== undefined) update.whatsappNumber = whatsappNumber ? String(whatsappNumber).trim() : '';
    if (address !== undefined) update.address = address ? String(address).trim() : '';
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

    // Get old student to check if guardianPhone changed
    const oldStudent = guardianPhone !== undefined
      ? await Student.findOne({ _id: req.params.id, school_id: new mongoose.Types.ObjectId(req.schoolId) }).select('guardianPhone guardianName').lean()
      : null;

    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, school_id: new mongoose.Types.ObjectId(req.schoolId) },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Re-link guardian if phone changed
    if (oldStudent && update.guardianPhone !== undefined && oldStudent.guardianPhone !== update.guardianPhone) {
      try {
        // Unlink from old guardian
        if (oldStudent.guardianPhone) {
          const oldGuardian = await User.findOne({ school_id: req.schoolId, phone: oldStudent.guardianPhone, role: 'guardian' });
          if (oldGuardian) await unlinkStudent(oldGuardian._id, student._id);
        }
        // Link to new guardian
        if (update.guardianPhone) {
          const result = await findOrCreateGuardian(
            req.schoolId, update.guardianPhone,
            update.guardianName || student.guardianName || 'Guardian'
          );
          if (result?.user) await linkStudent(result.user._id, student._id);
        }
      } catch (err) {
        console.error('[Guardian] Re-link failed:', err.message);
      }
    }

    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/students/:id/guardian — create or link a guardian account for this student.
// Uses the student's existing guardianPhone if no phone is provided. Idempotent: if a
// guardian already exists for that phone in this school, it is just linked.
router.post('/:id/guardian', requireRole('admin', 'staff'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid student id' });
    }

    const student = await Student.findOne({
      _id: req.params.id,
      school_id: new mongoose.Types.ObjectId(req.schoolId),
    }).lean();
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    const { phone: phoneOverride, name: nameOverride } = req.body || {};
    const phone = (phoneOverride || student.guardianPhone || '').trim();
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Guardian phone is required. Add a guardian phone to the student or pass one in the request.',
      });
    }

    // Check if a guardian already exists for this phone before counting against limit.
    const existing = await User.findOne({
      school_id: new mongoose.Types.ObjectId(req.schoolId),
      phone,
      role: 'guardian',
    }).lean();

    if (!existing) {
      const limitCheck = await checkGuardianLimit(req.schoolId);
      if (!limitCheck.allowed) {
        return res.status(403).json({ success: false, error: limitCheck.error });
      }
    }

    const result = await findOrCreateGuardian(
      req.schoolId,
      phone,
      nameOverride?.trim() || student.guardianName || student.fatherName || 'Guardian'
    );
    if (!result?.user) {
      return res.status(400).json({ success: false, error: 'Invalid guardian phone number' });
    }

    await linkStudent(result.user._id, student._id);

    // If student.guardianPhone was empty, sync it for future use
    if (!student.guardianPhone && phone) {
      await Student.updateOne({ _id: student._id }, { $set: { guardianPhone: phone } });
    }

    const userObj = result.user.toObject ? result.user.toObject() : result.user;
    delete userObj.passwordHash;

    res.status(201).json({
      success: true,
      created: result.created,
      data: userObj,
      message: result.created
        ? 'Guardian account created and linked. Credentials sent via SMS.'
        : 'Existing guardian linked to this student.',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/students/:id
router.delete('/:id', requireRole('admin', 'staff'), async (req, res) => {
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
