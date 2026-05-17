const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const AcademicConfig = require('../models/AcademicConfig');
const { notifyAbsentStudents } = require('../services/notifications');

const router = express.Router();

const VALID_STATUSES = ['present', 'absent', 'late', 'leave'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Late counts as Present; Leave counts as Absent for percentage calculations.
const isPresentForStats = (s) => s === 'present' || s === 'late';
const isAbsentForStats = (s) => s === 'absent' || s === 'leave';

// Short code used in monthly grid: P (present), A (absent), L (late), Lv (leave)
function statusToCode(s) {
  if (s === 'present') return 'P';
  if (s === 'absent') return 'A';
  if (s === 'late') return 'L';
  if (s === 'leave') return 'Lv';
  return 'P';
}

async function getWeeklyHolidayDayIndices(schoolId) {
  const cfg = await AcademicConfig.findOne({ school_id: schoolId }).select('weeklyHolidays').lean();
  const names = (cfg && Array.isArray(cfg.weeklyHolidays)) ? cfg.weeklyHolidays : [];
  return new Set(names.map((n) => WEEKDAYS.indexOf(n)).filter((i) => i >= 0));
}

// ─── POST /mark ── Bulk upsert attendance for a class on a date ──────────────
router.post('/mark', authMiddleware, requireRole('admin', 'staff', 'teacher'), async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { date, class: cls, section, shift, records } = req.body;

    if (!date || !cls || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'date, class, and records[] are required.' });
    }

    const dateObj = new Date(date + 'T00:00:00.000Z');

    const ops = records.map((r) => {
      const status = VALID_STATUSES.includes(r.status) ? r.status : 'present';
      return {
        updateOne: {
          filter: { school_id: schoolId, student_id: new mongoose.Types.ObjectId(r.student_id), date: dateObj },
          update: { $set: { status } },
          upsert: true,
        },
      };
    });

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
router.get('/daily', authMiddleware, requireRole('admin', 'staff', 'teacher'), async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { date, class: cls, section, shift } = req.query;

    if (!date || !cls) {
      return res.status(400).json({ success: false, error: 'date and class are required.' });
    }

    const dateObj = new Date(date + 'T00:00:00.000Z');

    // Detect weekly holiday for this date
    const weeklyHolidayIdx = await getWeeklyHolidayDayIndices(schoolId);
    const dayIdx = dateObj.getUTCDay();
    const isWeeklyHoliday = weeklyHolidayIdx.has(dayIdx);

    const filter = { school_id: schoolId, status: 'active', class: cls };
    if (section) filter.section = section;
    if (shift) filter.shift = shift;

    const students = await Student.find(filter)
      .select('name rollNo class section shift studentId')
      .sort({ rollNo: 1, name: 1 })
      .lean();

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
      studentId: s.studentId || '',
      studentName: s.name,
      rollNo: s.rollNo || '',
      status: statusMap[s._id.toString()] || 'present',
    }));

    res.json({
      success: true,
      data: {
        students: result,
        isWeeklyHoliday,
        weeklyHolidayName: isWeeklyHoliday ? WEEKDAYS[dayIdx] : null,
      },
    });
  } catch (err) {
    console.error('Attendance daily error:', err);
    res.status(500).json({ success: false, error: 'Failed to load attendance.' });
  }
});

// ─── GET /monthly ── Monthly grid (student × days) ──────────────────────────
router.get('/monthly', authMiddleware, requireRole('admin', 'staff', 'teacher'), async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { month, class: cls, section, shift } = req.query;

    if (!month || !cls) {
      return res.status(400).json({ success: false, error: 'month (YYYY-MM) and class are required.' });
    }

    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, mon - 1, 1));
    const endDate = new Date(Date.UTC(year, mon, 0));
    const daysInMonth = endDate.getUTCDate();

    const filter = { school_id: schoolId, status: 'active', class: cls };
    if (section) filter.section = section;
    if (shift) filter.shift = shift;

    const students = await Student.find(filter)
      .select('name rollNo studentId')
      .sort({ rollNo: 1, name: 1 })
      .lean();

    const studentIds = students.map((s) => s._id);

    const records = await Attendance.find({
      school_id: schoolId,
      student_id: { $in: studentIds },
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    // Lookup: studentId -> day -> status code
    const lookup = {};
    for (const rec of records) {
      const sid = rec.student_id.toString();
      if (!lookup[sid]) lookup[sid] = {};
      const day = new Date(rec.date).getUTCDate();
      lookup[sid][day] = statusToCode(rec.status);
    }

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
      let totalLate = 0;
      let totalLeave = 0;
      for (const d of daysWithData) {
        const code = days[d];
        if (code === 'A') totalAbsent++;
        else if (code === 'P') totalPresent++;
        else if (code === 'L') totalLate++;
        else if (code === 'Lv') totalLeave++;
      }
      // Late counts as present, Leave counts as absent
      const effectivePresent = totalPresent + totalLate;
      const percentage = totalDays > 0 ? Math.round((effectivePresent / totalDays) * 1000) / 10 : 0;

      return {
        _id: sid,
        studentId: s.studentId || '',
        name: s.name,
        rollNo: s.rollNo || '',
        days,
        totalPresent,
        totalAbsent,
        totalLate,
        totalLeave,
        effectivePresent,
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

// ─── GET /report ── Class Monthly Report (class-wise + school summary) ───────
router.get('/report', authMiddleware, requireRole('admin', 'staff', 'teacher'), async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({ success: false, error: 'month (YYYY-MM) is required.' });
    }

    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, mon - 1, 1));
    const endDate = new Date(Date.UTC(year, mon, 0));

    const students = await Student.find({ school_id: schoolId, status: 'active' })
      .select('class section')
      .lean();

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

    // Per-student effective present count (present + late)
    const studentPresent = {};
    let totals = { present: 0, absent: 0, late: 0, leave: 0 };
    for (const rec of allRecords) {
      const sid = rec.student_id.toString();
      if (!studentPresent[sid]) studentPresent[sid] = 0;
      if (isPresentForStats(rec.status)) studentPresent[sid]++;
      if (totals[rec.status] !== undefined) totals[rec.status]++;
    }

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
      for (const sid of sids) presentSum += studentPresent[sid] || 0;
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
        totals,
        totalRecords: allRecords.length,
      },
    });
  } catch (err) {
    console.error('Attendance report error:', err);
    res.status(500).json({ success: false, error: 'Failed to load report.' });
  }
});

// ─── GET /student-monthly ── Per-day records for one student in a month ──────
router.get('/student-monthly', authMiddleware, requireRole('admin', 'staff', 'teacher'), async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { month, student_id, class: cls, section, shift, search } = req.query;

    if (!month) {
      return res.status(400).json({ success: false, error: 'month (YYYY-MM) is required.' });
    }

    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, mon - 1, 1));
    const endDate = new Date(Date.UTC(year, mon, 0));

    let students = [];
    if (student_id && mongoose.isValidObjectId(student_id)) {
      const s = await Student.findOne({ _id: student_id, school_id: schoolId })
        .select('name rollNo class section shift studentId')
        .lean();
      if (s) students = [s];
    } else {
      const filter = { school_id: schoolId, status: 'active' };
      if (cls) filter.class = cls;
      if (section) filter.section = section;
      if (shift) filter.shift = shift;
      if (search) {
        const rx = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ name: rx }, { rollNo: rx }, { studentId: rx }, { contact: rx }];
      }
      students = await Student.find(filter)
        .select('name rollNo class section shift studentId')
        .sort({ class: 1, section: 1, rollNo: 1, name: 1 })
        .limit(500)
        .lean();
    }

    if (students.length === 0) {
      return res.json({ success: true, data: { students: [], totals: { present: 0, absent: 0, late: 0, leave: 0 }, totalDays: 0 } });
    }

    const studentIds = students.map((s) => s._id);
    const records = await Attendance.find({
      school_id: schoolId,
      student_id: { $in: studentIds },
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    const lookup = {};
    const daysWithData = new Set();
    for (const rec of records) {
      const sid = rec.student_id.toString();
      if (!lookup[sid]) lookup[sid] = {};
      const day = new Date(rec.date).getUTCDate();
      lookup[sid][day] = statusToCode(rec.status);
      daysWithData.add(day);
    }

    let totals = { present: 0, absent: 0, late: 0, leave: 0 };
    const out = students.map((s) => {
      const sid = s._id.toString();
      const days = lookup[sid] || {};
      let p = 0, a = 0, l = 0, lv = 0;
      for (const code of Object.values(days)) {
        if (code === 'P') p++;
        else if (code === 'A') a++;
        else if (code === 'L') l++;
        else if (code === 'Lv') lv++;
      }
      totals.present += p; totals.absent += a; totals.late += l; totals.leave += lv;
      const recorded = p + a + l + lv;
      const percentage = recorded > 0 ? Math.round(((p + l) / recorded) * 1000) / 10 : 0;
      return {
        _id: sid,
        studentId: s.studentId || '',
        name: s.name,
        rollNo: s.rollNo || '',
        class: s.class || '',
        section: s.section || '',
        days,
        totalPresent: p,
        totalAbsent: a,
        totalLate: l,
        totalLeave: lv,
        recorded,
        percentage,
      };
    });

    res.json({
      success: true,
      data: {
        students: out,
        totals,
        totalRecords: totals.present + totals.absent + totals.late + totals.leave,
        totalDays: daysWithData.size,
        daysInMonth: endDate.getUTCDate(),
        month,
      },
    });
  } catch (err) {
    console.error('Student monthly error:', err);
    res.status(500).json({ success: false, error: 'Failed to load student monthly report.' });
  }
});

// ─── GET /student-yearly ── Per-month totals for one student in a year ───────
router.get('/student-yearly', authMiddleware, requireRole('admin', 'staff', 'teacher'), async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { year, student_id, class: cls, section, shift, search } = req.query;

    if (!year) {
      return res.status(400).json({ success: false, error: 'year is required.' });
    }
    const yr = Number(year);
    const startDate = new Date(Date.UTC(yr, 0, 1));
    const endDate = new Date(Date.UTC(yr, 11, 31, 23, 59, 59, 999));

    let students = [];
    if (student_id && mongoose.isValidObjectId(student_id)) {
      const s = await Student.findOne({ _id: student_id, school_id: schoolId })
        .select('name rollNo class section shift studentId')
        .lean();
      if (s) students = [s];
    } else {
      const filter = { school_id: schoolId, status: 'active' };
      if (cls) filter.class = cls;
      if (section) filter.section = section;
      if (shift) filter.shift = shift;
      if (search) {
        const rx = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ name: rx }, { rollNo: rx }, { studentId: rx }, { contact: rx }];
      }
      students = await Student.find(filter)
        .select('name rollNo class section shift studentId')
        .sort({ class: 1, section: 1, rollNo: 1, name: 1 })
        .limit(500)
        .lean();
    }

    if (students.length === 0) {
      return res.json({ success: true, data: { students: [], totals: { present: 0, absent: 0, late: 0, leave: 0 } } });
    }

    const studentIds = students.map((s) => s._id);
    const records = await Attendance.find({
      school_id: schoolId,
      student_id: { $in: studentIds },
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    // Build: studentId -> month(1..12) -> {p,a,l,lv}
    const lookup = {};
    for (const rec of records) {
      const sid = rec.student_id.toString();
      const m = new Date(rec.date).getUTCMonth() + 1;
      if (!lookup[sid]) lookup[sid] = {};
      if (!lookup[sid][m]) lookup[sid][m] = { p: 0, a: 0, l: 0, lv: 0 };
      const code = statusToCode(rec.status);
      if (code === 'P') lookup[sid][m].p++;
      else if (code === 'A') lookup[sid][m].a++;
      else if (code === 'L') lookup[sid][m].l++;
      else if (code === 'Lv') lookup[sid][m].lv++;
    }

    let totals = { present: 0, absent: 0, late: 0, leave: 0 };
    const out = students.map((s) => {
      const sid = s._id.toString();
      const monthlyData = lookup[sid] || {};
      const months = [];
      let yp = 0, ya = 0, yl = 0, ylv = 0;
      for (let m = 1; m <= 12; m++) {
        const md = monthlyData[m] || { p: 0, a: 0, l: 0, lv: 0 };
        const recorded = md.p + md.a + md.l + md.lv;
        const pct = recorded > 0 ? Math.round(((md.p + md.l) / recorded) * 1000) / 10 : 0;
        months.push({ month: m, present: md.p, absent: md.a, late: md.l, leave: md.lv, recorded, percentage: pct });
        yp += md.p; ya += md.a; yl += md.l; ylv += md.lv;
      }
      totals.present += yp; totals.absent += ya; totals.late += yl; totals.leave += ylv;
      const yearRecorded = yp + ya + yl + ylv;
      const yearPct = yearRecorded > 0 ? Math.round(((yp + yl) / yearRecorded) * 1000) / 10 : 0;
      return {
        _id: sid,
        studentId: s.studentId || '',
        name: s.name,
        rollNo: s.rollNo || '',
        class: s.class || '',
        section: s.section || '',
        months,
        yearPresent: yp,
        yearAbsent: ya,
        yearLate: yl,
        yearLeave: ylv,
        yearRecorded,
        yearPercentage: yearPct,
      };
    });

    res.json({
      success: true,
      data: {
        students: out,
        totals,
        totalRecords: totals.present + totals.absent + totals.late + totals.leave,
        year: yr,
      },
    });
  } catch (err) {
    console.error('Student yearly error:', err);
    res.status(500).json({ success: false, error: 'Failed to load student yearly report.' });
  }
});

// ─── DELETE /clear ── Remove all attendance records for a date/class ─────────
router.delete('/clear', authMiddleware, requireRole('admin', 'staff', 'teacher'), async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { date, class: cls, section, shift } = req.query;

    if (!date || !cls) {
      return res.status(400).json({ success: false, error: 'date and class are required.' });
    }

    const dateObj = new Date(date + 'T00:00:00.000Z');

    const filter = { school_id: schoolId, status: 'active', class: cls };
    if (section) filter.section = section;
    if (shift) filter.shift = shift;

    const students = await Student.find(filter, { _id: 1 }).lean();
    const studentIds = students.map((s) => s._id);

    const result = await Attendance.deleteMany({
      school_id: schoolId,
      date: dateObj,
      student_id: { $in: studentIds },
    });

    res.json({ success: true, data: { deleted: result.deletedCount, date, class: cls } });
  } catch (err) {
    console.error('Attendance clear error:', err);
    res.status(500).json({ success: false, error: 'Failed to clear attendance.' });
  }
});

module.exports = router;
