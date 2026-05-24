const express = require('express');
const router = express.Router();
const ExamResult = require('../models/ExamResult');
const GradeScale = require('../models/GradeScale');
const ResultSettings = require('../models/ResultSettings');
const Exam = require('../models/Exam');
const { calcGrade } = require('../utils/gradeCalc');
const { authMiddleware, requireRole } = require('../middleware/auth');

const canRead = requireRole(['admin', 'staff', 'teacher']);
const canWrite = requireRole(['admin', 'staff']);

async function getGrades(school_id) {
  const scale = await GradeScale.findOne({ school_id });
  return scale ? scale.grades : [];
}

// GET /api/results — list with filters
router.get('/', authMiddleware, canRead, async (req, res) => {
  try {
    const { session, class: cls, section, exam_id, subject, student_id, grade } = req.query;
    const filter = { school_id: req.user.school_id };
    if (session) filter.session = session;
    if (cls) filter.class = cls;
    if (section) filter.section = section;
    if (exam_id) filter.exam_id = exam_id;
    if (subject) filter.subject = subject;
    if (student_id) filter.student_id = student_id;
    if (grade) filter.grade = grade;

    const results = await ExamResult.find(filter)
      .populate('student_id', 'name rollNumber admissionId photo')
      .populate('exam_id', 'name term')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/results/entry — bulk upsert
router.post('/entry', authMiddleware, canWrite, async (req, res) => {
  try {
    const { exam_id, session, class: cls, section, subject, entries } = req.body;
    if (!exam_id || !subject || !Array.isArray(entries)) {
      return res.status(400).json({ success: false, message: 'exam_id, subject, and entries[] are required' });
    }

    const grades = await getGrades(req.user.school_id);

    const ops = entries.map((e) => {
      const written = Number(e.writtenMark) || 0;
      const mcq = Number(e.mcqMark) || 0;
      const practical = Number(e.practicalMark) || 0;
      const total = written + mcq + practical;
      const { grade, gradePoint, isFail } = calcGrade(total, grades);

      return {
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
      };
    });

    const result = await ExamResult.bulkWrite(ops);
    res.json({ success: true, data: { upserted: result.upsertedCount, modified: result.modifiedCount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/results/:id — update single mark record
router.patch('/:id', authMiddleware, canWrite, async (req, res) => {
  try {
    const record = await ExamResult.findOne({ _id: req.params.id, school_id: req.user.school_id });
    if (!record) return res.status(404).json({ success: false, message: 'Result not found' });

    const grades = await getGrades(req.user.school_id);
    if (req.body.writtenMark !== undefined) record.writtenMark = Number(req.body.writtenMark) || 0;
    if (req.body.mcqMark !== undefined) record.mcqMark = Number(req.body.mcqMark) || 0;
    if (req.body.practicalMark !== undefined) record.practicalMark = Number(req.body.practicalMark) || 0;

    record.totalMark = record.writtenMark + record.mcqMark + record.practicalMark;
    const { grade, gradePoint, isFail } = calcGrade(record.totalMark, grades);
    record.grade = grade;
    record.gradePoint = gradePoint;
    record.isFail = isFail;

    await record.save();
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/results/:id
router.delete('/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const record = await ExamResult.findOneAndDelete({ _id: req.params.id, school_id: req.user.school_id });
    if (!record) return res.status(404).json({ success: false, message: 'Result not found' });
    res.json({ success: true, message: 'Result deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
    if (exam_id) filter.exam_id = exam_id;

    const results = await ExamResult.find(filter)
      .populate('student_id', 'name rollNumber admissionId')
      .sort({ subject: 1 });

    // Pivot: { studentId: { student, subjects: { [subjectName]: result } } }
    const studentMap = {};
    const subjectSet = new Set();

    for (const r of results) {
      const sid = r.student_id?._id?.toString();
      if (!sid) continue;
      subjectSet.add(r.subject);
      if (!studentMap[sid]) {
        studentMap[sid] = { student: r.student_id, subjects: {}, total: 0, gradePoints: [] };
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
    }

    const subjects = [...subjectSet].sort();
    const rows = Object.values(studentMap).map((s) => ({
      student: s.student,
      subjects: s.subjects,
      total: s.total,
      gpa: s.gradePoints.length ? (s.gradePoints.reduce((a, b) => a + b, 0) / s.gradePoints.length).toFixed(2) : '0.00',
    }));

    // Rank by total desc
    rows.sort((a, b) => b.total - a.total);
    rows.forEach((r, i) => { r.rank = i + 1; });

    res.json({ success: true, data: { subjects, rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
    if (exam_id) filter.exam_id = exam_id;

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
    res.status(500).json({ success: false, message: err.message });
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
    if (exam_id) filter.exam_id = exam_id;

    const results = await ExamResult.find(filter)
      .populate('student_id', 'name rollNumber admissionId');

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

    const rows = Object.values(studentMap).sort((a, b) => b.total - a.total);
    const highest = rows.length ? rows[0].total : 0;
    rows.forEach((r, i) => { r.rank = i + 1; r.highestMark = highest; });

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
    const includeOptional = settings?.includeOptionalSubjects || false;
    const finalExamName = settings?.finalExamName || 'Final';

    // Get all exams for the school matching session/class
    const examFilter = { school_id: req.user.school_id };
    if (session) examFilter.session = session;
    if (cls) examFilter.class = cls;
    const exams = await Exam.find(examFilter);
    const examMap = {};
    for (const e of exams) examMap[e._id.toString()] = e;

    const results = await ExamResult.find(filter)
      .populate('student_id', 'name rollNumber admissionId session class');

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
      } else if (method === 'weighted' && settings?.examWeights?.length) {
        // Use weights
      }

      const allSubjects = examList.flatMap((e) => e.subjects);
      const gpa = allSubjects.length
        ? (allSubjects.reduce((acc, sub) => acc + sub.gradePoint, 0) / allSubjects.length).toFixed(2)
        : '0.00';
      const total = allSubjects.reduce((acc, sub) => acc + sub.totalMark, 0);

      return {
        student: s.student,
        total,
        gpa,
        hasFail: s.hasFail,
        result: s.hasFail ? 'FAIL' : 'PASS',
      };
    });

    rows.sort((a, b) => b.total - a.total);
    rows.forEach((r, i) => { r.rank = i + 1; });

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/results/student/:studentId?session=&examId=
router.get('/student/:studentId', authMiddleware, canRead, async (req, res) => {
  try {
    const { session, examId } = req.query;
    const filter = {
      school_id: req.user.school_id,
      student_id: req.params.studentId,
    };
    if (session) filter.session = session;
    if (examId) filter.exam_id = examId;

    const results = await ExamResult.find(filter)
      .populate('exam_id', 'name term examDate')
      .sort({ subject: 1 });

    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
