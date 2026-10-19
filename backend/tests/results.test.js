'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  setupTestEnvironment,
  teardownTestEnvironment,
  api,
  createTestSchoolAndAdmin,
} = require('./helpers');

describe('Results & Grading Module', () => {
  let schoolA;
  let schoolB;
  let stuPass1;
  let stuPass2Tied;
  let stuFail;
  let stuSchoolB;
  let examA;

  before(async () => {
    await setupTestEnvironment();
    schoolA = await createTestSchoolAndAdmin('ResultsSchoolA');
    schoolB = await createTestSchoolAndAdmin('ResultsSchoolB');

    const s1 = await api(
      'POST',
      '/api/students',
      { name: 'Ayesha Siddiqua', class: 'Class 10', section: 'A', rollNo: '01', session: '2026' },
      schoolA.token
    );
    stuPass1 = s1.body.data;

    const s2 = await api(
      'POST',
      '/api/students',
      { name: 'Tanvir Hasan', class: 'Class 10', section: 'A', rollNo: '02', session: '2026' },
      schoolA.token
    );
    stuPass2Tied = s2.body.data;

    const s3 = await api(
      'POST',
      '/api/students',
      { name: 'Nabil Khan', class: 'Class 10', section: 'A', rollNo: '03', session: '2026' },
      schoolA.token
    );
    stuFail = s3.body.data;

    const sb = await api(
      'POST',
      '/api/students',
      { name: 'Other School Student', class: 'Class 10', section: 'A', rollNo: '99', session: '2026' },
      schoolB.token
    );
    stuSchoolB = sb.body.data;

    const ex = await api(
      'POST',
      '/api/exams',
      { name: 'Final', session: '2026', class: 'Class 10', term: 'Final' },
      schoolA.token
    );
    assert.equal(ex.status, 201);
    examA = ex.body.data;
  });

  after(async () => {
    await teardownTestEnvironment();
  });

  it('auto-uses default Bangladesh grade scale even before visiting /api/grading and enters marks', async () => {
    // Enter marks for Mathematics:
    // stuPass1: 85 (A+, 5.0)
    // stuPass2Tied: 85 (A+, 5.0)
    // stuFail: 95 (A+, 5.0)
    const mathEntry = await api(
      'POST',
      '/api/results/entry',
      {
        exam_id: examA._id,
        session: '2026',
        class: 'Class 10',
        section: 'A',
        subject: 'Mathematics',
        entries: [
          { student_id: stuPass1._id, writtenMark: 60, mcqMark: 25, practicalMark: 0 },
          { student_id: stuPass2Tied._id, writtenMark: 60, mcqMark: 25, practicalMark: 0 },
          { student_id: stuFail._id, writtenMark: 70, mcqMark: 25, practicalMark: 0 },
        ],
      },
      schoolA.token
    );
    assert.equal(mathEntry.status, 200);
    assert.equal(mathEntry.body.data.upserted, 3);

    // Enter marks for English:
    // stuPass1: 75 (A, 4.0) -> Total = 160, GPA = 4.50
    // stuPass2Tied: 75 (A, 4.0) -> Total = 160, GPA = 4.50 (tied with stuPass1!)
    // stuFail: 25 (F, 0.0, isFail: true) -> Total = 120, GPA must be 0.00!
    const engEntry = await api(
      'POST',
      '/api/results/entry',
      {
        exam_id: examA._id,
        session: '2026',
        class: 'Class 10',
        section: 'A',
        subject: 'English',
        entries: [
          { student_id: stuPass1._id, writtenMark: 50, mcqMark: 25, practicalMark: 0 },
          { student_id: stuPass2Tied._id, writtenMark: 50, mcqMark: 25, practicalMark: 0 },
          { student_id: stuFail._id, writtenMark: 15, mcqMark: 10, practicalMark: 0 },
        ],
      },
      schoolA.token
    );
    assert.equal(engEntry.status, 200);
  });

  it('populates rollNo/rollNumber and studentId/admissionId in results list', async () => {
    const res = await api('GET', `/api/results?exam_id=${examA._id}`, null, schoolA.token);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 6);

    const sample = res.body.data.find((r) => r.student_id._id === stuPass1._id);
    assert.ok(sample);
    assert.equal(sample.student_id.rollNo, '01');
    assert.equal(sample.student_id.rollNumber, '01');
    assert.equal(sample.student_id.studentId, stuPass1.studentId);
    assert.equal(sample.student_id.admissionId, stuPass1.studentId);
  });

  it('computes GPA 0.00 when any subject is failed and assigns tied ranks in tabulation', async () => {
    const tab = await api(
      'GET',
      `/api/results/tabulation?session=2026&class=${encodeURIComponent('Class 10')}&exam_id=${examA._id}`,
      null,
      schoolA.token
    );
    assert.equal(tab.status, 200);
    const { rows } = tab.body.data;
    assert.equal(rows.length, 3);

    const rowPass1 = rows.find((r) => r.student._id === stuPass1._id);
    const rowPass2 = rows.find((r) => r.student._id === stuPass2Tied._id);
    const rowFail = rows.find((r) => r.student._id === stuFail._id);

    // Both passing students have 160 total and GPA 4.50, and share rank 1
    assert.equal(rowPass1.total, 160);
    assert.equal(rowPass1.gpa, '4.50');
    assert.equal(rowPass1.rank, 1);
    assert.equal(rowPass1.student.rollNumber, '01');

    assert.equal(rowPass2.total, 160);
    assert.equal(rowPass2.gpa, '4.50');
    assert.equal(rowPass2.rank, 1);
    assert.equal(rowPass2.student.rollNumber, '02');

    // Failing student has 95 in Math (5.0) + 25 in English (F) -> GPA MUST be '0.00', not '2.50'
    assert.equal(rowFail.total, 120);
    assert.equal(rowFail.gpa, '0.00');
    assert.equal(rowFail.rank, 3);
  });

  it('computes GPA 0.00 for failing student in annual report and populates student rollNumber', async () => {
    const annual = await api(
      'GET',
      `/api/results/report/annual?session=2026&class=${encodeURIComponent('Class 10')}`,
      null,
      schoolA.token
    );
    assert.equal(annual.status, 200);
    const rows = annual.body.data;
    assert.equal(rows.length, 3);

    const rowFail = rows.find((r) => r.student._id === stuFail._id);
    assert.equal(rowFail.hasFail, true);
    assert.equal(rowFail.result, 'FAIL');
    assert.equal(rowFail.gpa, '0.00');
    assert.equal(rowFail.student.rollNumber, '03');
  });

  it('validates exam_id, student_id ownership, and negative marks on /api/results/entry', async () => {
    // Invalid exam_id ObjectId -> 400 (with error field)
    const badExamId = await api(
      'POST',
      '/api/results/entry',
      {
        exam_id: 'invalid-id',
        subject: 'Math',
        entries: [{ student_id: stuPass1._id, writtenMark: 50 }],
      },
      schoolA.token
    );
    assert.equal(badExamId.status, 400);
    assert.ok(badExamId.body.error);

    // Cross-tenant student_id (School A trying to enter marks for School B's student) -> 400/404
    const crossStudent = await api(
      'POST',
      '/api/results/entry',
      {
        exam_id: examA._id,
        subject: 'Math',
        entries: [{ student_id: stuSchoolB._id, writtenMark: 50 }],
      },
      schoolA.token
    );
    assert.ok(crossStudent.status === 400 || crossStudent.status === 404);

    // Cross-tenant exam_id (School B trying to enter marks on School A's exam) -> 404
    const crossExam = await api(
      'POST',
      '/api/results/entry',
      {
        exam_id: examA._id,
        subject: 'Math',
        entries: [{ student_id: stuSchoolB._id, writtenMark: 50 }],
      },
      schoolB.token
    );
    assert.equal(crossExam.status, 404);

    // Negative marks -> 400
    const negMarks = await api(
      'POST',
      '/api/results/entry',
      {
        exam_id: examA._id,
        subject: 'Math',
        entries: [{ student_id: stuPass1._id, writtenMark: -10 }],
      },
      schoolA.token
    );
    assert.equal(negMarks.status, 400);
  });
});
