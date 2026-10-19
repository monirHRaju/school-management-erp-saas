const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const ExamResult = require('../models/ExamResult');
const GradeScale = require('../models/GradeScale');
const ResultSettings = require('../models/ResultSettings');
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const { calcGrade, DEFAULT_GRADES } = require('../utils/gradeCalc');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const canRead = requireRole('admin', 'staff', 'teacher');
const canWrite = requireRole('admin', 'staff');

function sendError(res, status, msg) {
  return res.status(status).json({ success: false, error: msg, message: msg });
}

async function getGrades(school_id) {
  const scale = await GradeScale.findOne({ school_id });
  return scale && Array.isArray(scale.grades) && scale.grades.length > 0
    ? scale.grades
    : DEFAULT_GRADES;
}

function parseMark(val, fieldName) {
  if (val === undefined || val === null || val === '') return { ok: true, value: 0 };
  const num = Number(val);
  if (isNaN(num) || num < 0) {
    return { ok: false, error: `${fieldName} must be a non-negative number` };
  }
  return { ok: true, value: num };
}

function assignTieAwareRanks(rows) {
  rows.sort((a, b) => (Number(Boolean(a.hasFail)) - Number(Boolean(b.hasFail))) || (b.total - a.total));
  rows.forEach((r, i) => {
    if (
      i > 0 &&
      r.total === rows[i - 1].total &&
      Boolean(r.hasFail) === Boolean(rows[i - 1].hasFail)
    ) {
      r.rank = rows[i - 1].rank;
    } else {
      r.rank = i + 1;
    }
  });
}

// GET /api/results — list with filters
router.get('/', authMiddleware, canRead, async (req, res) => {
  try {
    const { session, class: cls, section, exam_id, subject, student_id, grade } = req.query;
    const filter = { school_id: req.user.school_id };
    if (session) filter.session = session;
    if (cls) filter.class = cls;
    if (section) filter.section = section;
    if (exam_id) {
      if (!mongoose.isValidObjectId(exam_id)) return sendError(res, 400, 'Invalid exam_id');
      filter.exam_id = exam_id;
    }
    if (subject) filter.subject = subject;
    if (student_id) {
      if (!mongoose.isValidObjectId(student_id)) return sendError(res, 400, 'Invalid student_id');
      filter.student_id = student_id;
    }
    if (grade) filter.grade = grade;

    const results = await ExamResult.find(filter)
      .populate('student_id', 'name rollNo studentId photoUrl session class')
      .populate('exam_id', 'name term')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: results });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

// POST /api/results/entry — bulk upsert
router.post('/entry', authMiddleware, canWrite, async (req, res) => {
  try {
    const { exam_id, session, class: cls, section, subject, entries } = req.body;
    if (!exam_id || !subject || !Array.isArray(entries)) {
      return sendError(res, 400, 'exam_id, subject, and entries[] are required');
    }
    if (!mongoose.isValidObjectId(exam_id)) {
      return sendError(res, 400, 'Invalid exam_id');
    }

    const exam = await Exam.findOne({ _id: exam_id, school_id: req.user.school_id }).lean();
    if (!exam) {
      return sendError(res, 404, 'Exam not found');
    }

    if (entries.length === 0) {
      return res.json({ success: true, data: { upserted: 0, modified: 0 } });
    }

    const uniqueStudentIds = [];
    const seenIds = new Set();
    for (const e of entries) {
      if (!e || !mongoose.isValidObjectId(e.student_id)) {
        return sendError(res, 400, 'Invalid student_id in entries');
      }
      const sid = e.student_id.toString();
      if (!seenIds.has(sid)) {
        seenIds.add(sid);
        uniqueStudentIds.push(new mongoose.Types.ObjectId(sid));
      }
    }

    const validStudentCount = await Student.countDocuments({
      _id: { $in: uniqueStudentIds },
      school_id: req.user.school_id,
    });
    if (validStudentCount !== uniqueStudentIds.length) {
      return sendError(res, 404, 'One or more students not found in this school');
    }

    const grades = await getGrades(req.user.school_id);
    const ops = [];

    for (const e of entries) {
      const wRes = parseMark(e.writtenMark, 'writtenMark');
      if (!wRes.ok) return sendError(res, 400, wRes.error);
      const mRes = parseMark(e.mcqMark, 'mcqMark');
      if (!mRes.ok) return sendError(res, 400, mRes.error);
      const pRes = parseMark(e.practicalMark, 'practicalMark');
      if (!pRes.ok) return sendError(res, 400, pRes.error);

      const written = wRes.value;
      const mcq = mRes.value;
      const practical = pRes.value;
      const total = written + mcq + practical;
      const { grade, gradePoint, isFail } = calcGrade(total, grades);

      ops.push({
        updateOne: {
          filter: {
            school_id: req.user.school_id,
            exam_id,
            student_id: e.student_id,
            subject,
          },
          update: {
            $set: {
              school_id: req.user.school_id,
              exam_id,
              student_id: e.student_id,
              session: session || '',
              class: cls || '',
              section: section || '',
              subject,
              writtenMark: written,
              mcqMark: mcq,
              practicalMark: practical,
              totalMark: total,
              grade,
              gradePoint,
              isFail,
            },
          },
          upsert: true,
        },
      });
    }

    const result = await ExamResult.bulkWrite(ops);
    res.json({ success: true, data: { upserted: result.upsertedCount, modified: result.modifiedCount } });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

// PATCH /api/results/:id — update single mark record
router.patch('/:id', authMiddleware, canWrite, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid result id');
    }
    const record = await ExamResult.findOne({ _id: req.params.id, school_id: req.user.school_id });
    if (!record) return sendError(res, 404, 'Result not found');

    const grades = await getGrades(req.user.school_id);
    if (req.body.writtenMark !== undefined) {
      const wRes = parseMark(req.body.writtenMark, 'writtenMark');
      if (!wRes.ok) return sendError(res, 400, wRes.error);
      record.writtenMark = wRes.value;
    }
    if (req.body.mcqMark !== undefined) {
      const mRes = parseMark(req.body.mcqMark, 'mcqMark');
      if (!mRes.ok) return sendError(res, 400, mRes.error);
      record.mcqMark = mRes.value;
    }
    if (req.body.practicalMark !== undefined) {
      const pRes = parseMark(req.body.practicalMark, 'practicalMark');
      if (!pRes.ok) return sendError(res, 400, pRes.error);
      record.practicalMark = pRes.value;
    }

    record.totalMark = record.writtenMark + record.mcqMark + record.practicalMark;
    const { grade, gradePoint, isFail } = calcGrade(record.totalMark, grades);
    record.grade = grade;
    record.gradePoint = gradePoint;
    record.isFail = isFail;

    await record.save();
    res.json({ success: true, data: record });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

// DELETE /api/results/:id
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid result id');
    }
    const record = await ExamResult.findOneAndDelete({ _id: req.params.id, school_id: req.user.school_id });
    if (!record) return sendError(res, 404, 'Result not found');
    res.json({ success: true, message: 'Result deleted' });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

// GET /api/results/tabulation?session=&class=&section=&exam_id=
router.get('/tabulation', authMiddleware, canRead, async (req, res) => {
  try {
    const { session, class: cls, section, exam_id } = req.query;
    const filter = { school_id: req.user.school_id };
    if (session) filter.session = session;
    if (cls) filter.class = cls;
    if (section) filter.section = section;
    if (exam_id) {
      if (!mongoose.isValidObjectId(exam_id)) return sendError(res, 400, 'Invalid exam_id');
      filter.exam_id = exam_id;
    }

    const results = await ExamResult.find(filter)
      .populate('student_id', 'name rollNo studentId photoUrl session class')
      .sort({ subject: 1 });

    // Pivot: { studentId: { student, subjects: { [subjectName]: result } } }
    const studentMap = {};
    const subjectSet = new Set();

    for (const r of results) {
      const sid = r.student_id?._id?.toString();
      if (!sid) continue;
      subjectSet.add(r.subject);
      if (!studentMap[sid]) {
        studentMap[sid] = {
          student: r.student_id,
          subjects: {},
          total: 0,
          gradePoints: [],
          hasFail: false,
        };
      }
      studentMap[sid].subjects[r.subject] = {
        writtenMark: r.writtenMark,
        mcqMark: r.mcqMark,
        practicalMark: r.practicalMark,
        totalMark: r.totalMark,
        grade: r.grade,
        gradePoint: r.gradePoint,
        isFail: r.isFail,
      };
      studentMap[sid].total += r.totalMark;
      studentMap[sid].gradePoints.push(r.gradePoint);
      if (r.isFail) studentMap[sid].hasFail = true;
    }

    const subjects = [...subjectSet].sort();
    const rows = Object.values(studentMap).map((s) => ({
      student: s.student,
      subjects: s.subjects,
      total: s.total,
      hasFail: s.hasFail,
      result: s.hasFail ? 'FAIL' : 'PASS',
      gpa:
        s.hasFail || !s.gradePoints.length
          ? '0.00'
          : (s.gradePoints.reduce((a, b) => a + b, 0) / s.gradePoints.length).toFixed(2),
    }));

    assignTieAwareRanks(rows);

    res.json({ success: true, data: { subjects, rows } });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

// GET /api/results/report/summary?session=&class=&section=&exam_id=
router.get('/report/summary', authMiddleware, canRead, async (req, res) => {
  try {
    const { session, class: cls, section, exam_id } = req.query;
    const filter = { school_id: req.user.school_id };
    if (session) filter.session = session;
    if (cls) filter.class = cls;
    if (section) filter.section = section;
    if (exam_id) {
      if (!mongoose.isValidObjectId(exam_id)) return sendError(res, 400, 'Invalid exam_id');
      filter.exam_id = exam_id;
    }

    const results = await ExamResult.find(filter);

    const studentIds = [...new Set(results.map((r) => r.student_id.toString()))];
    const totalStudents = studentIds.length;

    // A student passes if they don't have any failing subject
    const failStudents = new Set();
    for (const r of results) {
      if (r.isFail) failStudents.add(r.student_id.toString());
    }

    const totalPass = totalStudents - failStudents.size;
    const totalFail = failStudents.size;
    const marks = results.map((r) => r.totalMark);
    const highest = marks.length ? Math.max(...marks) : 0;
    const average = marks.length ? (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(2) : '0.00';

    res.json({
      success: true,
      data: {
        totalStudents,
        totalParticipant: totalStudents,
        totalPass,
        totalFail,
        passRate: totalStudents ? ((totalPass / totalStudents) * 100).toFixed(1) + '%' : '0%',
        failRate: totalStudents ? ((totalFail / totalStudents) * 100).toFixed(1) + '%' : '0%',
        highestMark: highest,
        averageMark: average,
      },
    });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

// GET /api/results/report/exam-wise?session=&class=&section=&exam_id=
router.get('/report/exam-wise', authMiddleware, canRead, async (req, res) => {
  try {
    const { session, class: cls, section, exam_id } = req.query;
    const filter = { school_id: req.user.school_id };
    if (session) filter.session = session;
    if (cls) filter.class = cls;
    if (section) filter.section = section;
    if (exam_id) {
      if (!mongoose.isValidObjectId(exam_id)) return sendError(res, 400, 'Invalid exam_id');
      filter.exam_id = exam_id;
    }

    const results = await ExamResult.find(filter)
      .populate('student_id', 'name rollNo studentId photoUrl session class');

    const studentMap = {};
    for (const r of results) {
      const sid = r.student_id?._id?.toString();
      if (!sid) continue;
      if (!studentMap[sid]) {
        studentMap[sid] = { student: r.student_id, total: 0, hasFail: false };
      }
      studentMap[sid].total += r.totalMark;
      if (r.isFail) studentMap[sid].hasFail = true;
    }

    const rows = Object.values(studentMap);
    assignTieAwareRanks(rows);
    const highest = rows.length ? Math.max(...rows.map((r) => r.total)) : 0;
    rows.forEach((r) => { r.highestMark = highest; });

    res.json({ success: true, data: rows });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

// GET /api/results/report/annual?session=&class=&section=
router.get('/report/annual', authMiddleware, canRead, async (req, res) => {
  try {
    const { session, class: cls, section } = req.query;
    const filter = { school_id: req.user.school_id };
    if (session) filter.session = session;
    if (cls) filter.class = cls;
    if (section) filter.section = section;

    const settings = await ResultSettings.findOne({ school_id: req.user.school_id });
    const method = settings?.finalResultMethod || 'average_all';
    const finalExamName = settings?.finalExamName || 'Final';

    // Get all exams for the school matching session/class
    const examFilter = { school_id: req.user.school_id };
    if (session) examFilter.session = session;
    if (cls) examFilter.class = cls;
    const exams = await Exam.find(examFilter);
    const examMap = {};
    for (const e of exams) examMap[e._id.toString()] = e;

    const results = await ExamResult.find(filter)
      .populate('student_id', 'name rollNo studentId photoUrl session class');

    const studentMap = {};
    for (const r of results) {
      const sid = r.student_id?._id?.toString();
      if (!sid) continue;
      if (!studentMap[sid]) {
        studentMap[sid] = { student: r.student_id, examSubjects: {}, hasFail: false };
      }
      const examId = r.exam_id.toString();
      const exam = examMap[examId];
      if (!exam) continue;
      if (!studentMap[sid].examSubjects[examId]) {
        studentMap[sid].examSubjects[examId] = { examName: exam.name, subjects: [] };
      }
      studentMap[sid].examSubjects[examId].subjects.push({
        subject: r.subject,
        totalMark: r.totalMark,
        gradePoint: r.gradePoint,
        isFail: r.isFail,
      });
      if (r.isFail) studentMap[sid].hasFail = true;
    }

    // Compute final GPA per student based on method
    const rows = Object.values(studentMap).map((s) => {
      let examList = Object.values(s.examSubjects);

      if (method === 'final_only') {
        examList = examList.filter((e) => e.examName === finalExamName);
      }

      const allSubjects = examList.flatMap((e) => e.subjects);
      const hasFail = allSubjects.length ? allSubjects.some((sub) => sub.isFail) : s.hasFail;

      let gpa = '0.00';
      let total = allSubjects.reduce((acc, sub) => acc + sub.totalMark, 0);

      if (!hasFail && allSubjects.length > 0) {
        if (method === 'weighted' && settings?.examWeights?.length) {
          const weightMap = new Map(settings.examWeights.map((w) => [w.examName, Number(w.weight) || 0]));
          let weightedGpaSum = 0;
          let totalWeight = 0;
          for (const ex of examList) {
            const w = weightMap.get(ex.examName) || 0;
            if (w > 0 && ex.subjects.length > 0) {
              const exGpa = ex.subjects.reduce((a, b) => a + b.gradePoint, 0) / ex.subjects.length;
              weightedGpaSum += exGpa * w;
              totalWeight += w;
            }
          }
          gpa = totalWeight > 0
            ? (weightedGpaSum / totalWeight).toFixed(2)
            : (allSubjects.reduce((acc, sub) => acc + sub.gradePoint, 0) / allSubjects.length).toFixed(2);
        } else {
          gpa = (allSubjects.reduce((acc, sub) => acc + sub.gradePoint, 0) / allSubjects.length).toFixed(2);
        }
      }

      return {
        student: s.student,
        total,
        gpa,
        hasFail,
        result: hasFail ? 'FAIL' : 'PASS',
      };
    });

    assignTieAwareRanks(rows);

    res.json({ success: true, data: rows });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

// GET /api/results/student/:studentId?session=&examId=
router.get('/student/:studentId', authMiddleware, canRead, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.studentId)) {
      return sendError(res, 400, 'Invalid studentId');
    }
    const { session, examId } = req.query;
    const filter = {
      school_id: req.user.school_id,
      student_id: req.params.studentId,
    };
    if (session) filter.session = session;
    if (examId) {
      if (!mongoose.isValidObjectId(examId)) return sendError(res, 400, 'Invalid examId');
      filter.exam_id = examId;
    }

    const results = await ExamResult.find(filter)
      .populate('exam_id', 'name term examDate')
      .sort({ subject: 1 });

    res.json({ success: true, data: results });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

module.exports = router;
