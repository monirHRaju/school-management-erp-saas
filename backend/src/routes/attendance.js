const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { notifyAbsentStudents } = require('../services/notifications');

const router = express.Router();

// ─── POST /mark ── Bulk upsert attendance for a class on a date ──────────────
router.post('/mark', authMiddleware, async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { date, class: cls, section, shift, records } = req.body;

    if (!date || !cls || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'date, class, and records[] are required.' });
    }

    const dateObj = new Date(date + 'T00:00:00.000Z');

    const ops = records.map((r) => ({
      updateOne: {
        filter: { school_id: schoolId, student_id: new mongoose.Types.ObjectId(r.student_id), date: dateObj },
        update: { $set: { status: r.status || 'present' } },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(ops);

    // Auto-send SMS to absent students' guardians (fire-and-forget)
    const absentIds = records.filter((r) => r.status === 'absent').map((r) => r.student_id);
    let smsSent = 0;
    if (absentIds.length > 0) {
      const smsResult = await notifyAbsentStudents(schoolId, absentIds, date, cls);
      smsSent = smsResult.sent || 0;
    }

    res.json({
      success: true,
      data: { marked: records.length, date: date, class: cls, section: section || '', smsSent },
    });
  } catch (err) {
    console.error('Attendance mark error:', err);
    res.status(500).json({ success: false, error: 'Failed to save attendance.' });
  }
});

// ─── GET /daily ── Get attendance for a class/date ───────────────────────────
router.get('/daily', authMiddleware, async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { date, class: cls, section, shift } = req.query;

    if (!date || !cls) {
      return res.status(400).json({ success: false, error: 'date and class are required.' });
    }

    const dateObj = new Date(date + 'T00:00:00.000Z');

    // Find active students matching filters
    const filter = { school_id: schoolId, status: 'active', class: cls };
    if (section) filter.section = section;
    if (shift) filter.shift = shift;

    const students = await Student.find(filter)
      .select('name rollNo class section shift')
      .sort({ rollNo: 1, name: 1 })
      .lean();

    // Find existing records for that date
    const studentIds = students.map((s) => s._id);
    const existing = await Attendance.find({
      school_id: schoolId,
      date: dateObj,
      student_id: { $in: studentIds },
    }).lean();

    const statusMap = {};
    for (const rec of existing) {
      statusMap[rec.student_id.toString()] = rec.status;
    }

    const result = students.map((s) => ({
      student_id: s._id.toString(),
      studentName: s.name,
      rollNo: s.rollNo || '',
      status: statusMap[s._id.toString()] || 'present',
    }));

    res.json({ success: true, data: { students: result } });
  } catch (err) {
    console.error('Attendance daily error:', err);
    res.status(500).json({ success: false, error: 'Failed to load attendance.' });
  }
});

// ─── GET /monthly ── Monthly grid (student × days) ──────────────────────────
router.get('/monthly', authMiddleware, async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { month, class: cls, section, shift } = req.query;

    if (!month || !cls) {
      return res.status(400).json({ success: false, error: 'month (YYYY-MM) and class are required.' });
    }

    // Parse month range
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, mon - 1, 1));
    const endDate = new Date(Date.UTC(year, mon, 0)); // last day of month
    const daysInMonth = endDate.getUTCDate();

    // Students
    const filter = { school_id: schoolId, status: 'active', class: cls };
    if (section) filter.section = section;
    if (shift) filter.shift = shift;

    const students = await Student.find(filter)
      .select('name rollNo')
      .sort({ rollNo: 1, name: 1 })
      .lean();

    const studentIds = students.map((s) => s._id);

    // All attendance records for this month
    const records = await Attendance.find({
      school_id: schoolId,
      student_id: { $in: studentIds },
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    // Build lookup: studentId -> day -> status
    const lookup = {};
    for (const rec of records) {
      const sid = rec.student_id.toString();
      if (!lookup[sid]) lookup[sid] = {};
      const day = new Date(rec.date).getUTCDate();
      lookup[sid][day] = rec.status === 'absent' ? 'A' : 'P';
    }

    // Find which days have any attendance data (to know totalDays)
    const daysWithData = new Set();
    for (const rec of records) {
      daysWithData.add(new Date(rec.date).getUTCDate());
    }
    const totalDays = daysWithData.size;

    const result = students.map((s) => {
      const sid = s._id.toString();
      const days = lookup[sid] || {};
      let totalPresent = 0;
      let totalAbsent = 0;
      for (const d of daysWithData) {
        if (days[d] === 'A') totalAbsent++;
        else if (days[d] === 'P') totalPresent++;
        // If no record for this day but other students have records, count as no data
      }
      const percentage = totalDays > 0 ? Math.round((totalPresent / totalDays) * 1000) / 10 : 0;

      return {
        _id: sid,
        name: s.name,
        rollNo: s.rollNo || '',
        days,
        totalPresent,
        totalAbsent,
        percentage,
      };
    });

    res.json({
      success: true,
      data: { students: result, totalDays, daysInMonth, month },
    });
  } catch (err) {
    console.error('Attendance monthly error:', err);
    res.status(500).json({ success: false, error: 'Failed to load monthly attendance.' });
  }
});

// ─── GET /report ── Class-wise and school summary ───────────────────────────
router.get('/report', authMiddleware, async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({ success: false, error: 'month (YYYY-MM) is required.' });
    }

    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, mon - 1, 1));
    const endDate = new Date(Date.UTC(year, mon, 0));

    // Get all active students grouped by class/section
    const students = await Student.find({ school_id: schoolId, status: 'active' })
      .select('class section')
      .lean();

    // Count unique days with attendance data
    const allRecords = await Attendance.find({
      school_id: schoolId,
      date: { $gte: startDate, $lte: endDate },
    })
      .select('student_id date status')
      .lean();

    const daysWithData = new Set();
    for (const rec of allRecords) {
      daysWithData.add(new Date(rec.date).getUTCDate());
    }
    const totalDays = daysWithData.size;

    // Build per-student present count
    const studentPresent = {};
    for (const rec of allRecords) {
      const sid = rec.student_id.toString();
      if (!studentPresent[sid]) studentPresent[sid] = 0;
      if (rec.status === 'present') studentPresent[sid]++;
    }

    // Group students by class-section
    const groups = {};
    for (const s of students) {
      const key = `${s.class}||${s.section || ''}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s._id.toString());
    }

    let totalSchoolStudents = 0;
    let totalSchoolPresent = 0;

    const classSummary = Object.entries(groups).map(([key, sids]) => {
      const [cls, sec] = key.split('||');
      const totalStudents = sids.length;
      let presentSum = 0;
      for (const sid of sids) {
        presentSum += studentPresent[sid] || 0;
      }
      const possible = totalStudents * totalDays;
      const avgAttendance = possible > 0 ? Math.round((presentSum / possible) * 1000) / 10 : 0;

      totalSchoolStudents += totalStudents;
      totalSchoolPresent += presentSum;

      return { class: cls, section: sec, totalStudents, avgAttendance };
    });

    classSummary.sort((a, b) => a.class.localeCompare(b.class) || a.section.localeCompare(b.section));

    const schoolPossible = totalSchoolStudents * totalDays;
    const schoolAvg = schoolPossible > 0 ? Math.round((totalSchoolPresent / schoolPossible) * 1000) / 10 : 0;

    res.json({
      success: true,
      data: {
        classSummary,
        schoolSummary: { totalStudents: totalSchoolStudents, avgAttendance: schoolAvg },
        totalDays,
      },
    });
  } catch (err) {
    console.error('Attendance report error:', err);
    res.status(500).json({ success: false, error: 'Failed to load report.' });
  }
});

module.exports = router;
