'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  setupTestEnvironment,
  teardownTestEnvironment,
  api,
  createTestSchoolAndAdmin,
} = require('./helpers');

describe('Attendance & Income/Expense Modules', () => {
  let schoolA;
  let schoolB;
  let stu1;
  let stu2;
  let stu3;
  let stuSchoolB;

  before(async () => {
    await setupTestEnvironment();
    schoolA = await createTestSchoolAndAdmin('AttFinSchoolA');
    schoolB = await createTestSchoolAndAdmin('AttFinSchoolB');

    const s1 = await api(
      'POST',
      '/api/students',
      { name: 'Farhan Sadik', class: 'Class 8', section: 'A', rollNo: '01', monthlyFee: 1200 },
      schoolA.token
    );
    stu1 = s1.body.data;

    const s2 = await api(
      'POST',
      '/api/students',
      { name: 'Nusrat Jahan', class: 'Class 8', section: 'A', rollNo: '02', monthlyFee: 1200 },
      schoolA.token
    );
    stu2 = s2.body.data;

    const s3 = await api(
      'POST',
      '/api/students',
      { name: 'Mehedi Hasan', class: 'Class 8', section: 'A', rollNo: '03', monthlyFee: 1200 },
      schoolA.token
    );
    stu3 = s3.body.data;

    const sb = await api(
      'POST',
      '/api/students',
      { name: 'School B Student', class: 'Class 8', section: 'A', rollNo: '01', monthlyFee: 1000 },
      schoolB.token
    );
    stuSchoolB = sb.body.data;
  });

  after(async () => {
    await teardownTestEnvironment();
  });

  it('marks daily attendance, updates on re-mark, and computes monthly/yearly stats accurately', async () => {
    // Day 1: 2026-03-01 -> stu1 present, stu2 late, stu3 absent
    const mark1 = await api(
      'POST',
      '/api/attendance/mark',
      {
        date: '2026-03-01',
        class: 'Class 8',
        section: 'A',
        records: [
          { student_id: stu1._id, status: 'present' },
          { student_id: stu2._id, status: 'late' },
          { student_id: stu3._id, status: 'absent' },
        ],
      },
      schoolA.token
    );
    assert.equal(mark1.status, 200);
    assert.equal(mark1.body.data.marked, 3);

    // Day 2: 2026-03-02 -> stu1 present, stu2 present, stu3 leave
    const mark2 = await api(
      'POST',
      '/api/attendance/mark',
      {
        date: '2026-03-02',
        class: 'Class 8',
        section: 'A',
        records: [
          { student_id: stu1._id, status: 'present' },
          { student_id: stu2._id, status: 'present' },
          { student_id: stu3._id, status: 'leave' },
        ],
      },
      schoolA.token
    );
    assert.equal(mark2.status, 200);

    // Verify GET /api/attendance/daily for 2026-03-01
    const daily = await api(
      'GET',
      `/api/attendance/daily?date=2026-03-01&class=${encodeURIComponent('Class 8')}&section=A`,
      null,
      schoolA.token
    );
    assert.equal(daily.status, 200);
    const dMap = Object.fromEntries(daily.body.data.students.map((s) => [s.student_id, s.status]));
    assert.equal(dMap[stu1._id], 'present');
    assert.equal(dMap[stu2._id], 'late');
    assert.equal(dMap[stu3._id], 'absent');

    // Verify GET /api/attendance/monthly for 2026-03
    // Late counts as Present; Leave counts as Absent
    const monthly = await api(
      'GET',
      `/api/attendance/monthly?month=2026-03&class=${encodeURIComponent('Class 8')}&section=A`,
      null,
      schoolA.token
    );
    assert.equal(monthly.status, 200);
    assert.equal(monthly.body.data.totalDays, 2);

    const mStu1 = monthly.body.data.students.find((s) => s._id === stu1._id);
    const mStu2 = monthly.body.data.students.find((s) => s._id === stu2._id);
    const mStu3 = monthly.body.data.students.find((s) => s._id === stu3._id);

    assert.equal(mStu1.percentage, 100);
    assert.equal(mStu2.effectivePresent, 2); // 1 present + 1 late
    assert.equal(mStu2.percentage, 100);
    assert.equal(mStu3.effectivePresent, 0); // 1 absent + 1 leave
    assert.equal(mStu3.percentage, 0);

    // Verify student-yearly
    const yearly = await api(
      'GET',
      `/api/attendance/student-yearly?year=2026&student_id=${stu2._id}`,
      null,
      schoolA.token
    );
    assert.equal(yearly.status, 200);
    assert.equal(yearly.body.data.students[0].yearPresent, 1);
    assert.equal(yearly.body.data.students[0].yearLate, 1);
    assert.equal(yearly.body.data.students[0].yearPercentage, 100);
  });

  it('rejects invalid student_id, invalid date, and cross-tenant student_id on /api/attendance/mark', async () => {
    // Invalid student_id ObjectId -> 400 (not 500)
    const badId = await api(
      'POST',
      '/api/attendance/mark',
      {
        date: '2026-03-03',
        class: 'Class 8',
        records: [{ student_id: 'not-an-id', status: 'present' }],
      },
      schoolA.token
    );
    assert.equal(badId.status, 400);

    // Invalid date -> 400
    const badDate = await api(
      'POST',
      '/api/attendance/mark',
      {
        date: 'not-a-date',
        class: 'Class 8',
        records: [{ student_id: stu1._id, status: 'present' }],
      },
      schoolA.token
    );
    assert.equal(badDate.status, 400);

    // Cross-tenant student_id (School A trying to mark School B's student) -> 404
    const crossTenant = await api(
      'POST',
      '/api/attendance/mark',
      {
        date: '2026-03-03',
        class: 'Class 8',
        records: [{ student_id: stuSchoolB._id, status: 'absent' }],
      },
      schoolA.token
    );
    assert.equal(crossTenant.status, 404);
  });

  it('clears attendance for a specific date without affecting other dates', async () => {
    const clearRes = await api(
      'DELETE',
      `/api/attendance/clear?date=2026-03-02&class=${encodeURIComponent('Class 8')}&section=A`,
      null,
      schoolA.token
    );
    assert.equal(clearRes.status, 200);
    assert.equal(clearRes.body.data.deleted, 3);

    const monthly = await api(
      'GET',
      `/api/attendance/monthly?month=2026-03&class=${encodeURIComponent('Class 8')}&section=A`,
      null,
      schoolA.token
    );
    assert.equal(monthly.body.data.totalDays, 1);
  });

  it('tracks fee income, manual income, and expenses in ledger and includes full end-date in /api/income', async () => {
    // 1. Generate fee and collect payment with mid-day timestamp on 2026-03-15
    const extraFee = await api(
      'POST',
      '/api/fees/additional',
      {
        category: 'student_fee',
        description: 'March Tuition',
        month: '2026-03',
        amount: 1200,
        student_id: stu1._id,
      },
      schoolA.token
    );
    assert.equal(extraFee.status, 201);
    const feeId = extraFee.body.data[0]._id;

    const collectRes = await api(
      'POST',
      `/api/fees/${feeId}/collect`,
      {
        amount: 1200,
        payment_date: '2026-03-15T14:30:00.000Z',
      },
      schoolA.token
    );
    assert.equal(collectRes.status, 201);

    // 2. Query /api/income with from=2026-03-15&to=2026-03-15 -> must include the 14:30 UTC payment!
    const incList = await api(
      'GET',
      '/api/income?from=2026-03-15&to=2026-03-15',
      null,
      schoolA.token
    );
    assert.equal(incList.status, 200);
    assert.equal(incList.body.total, 1);
    assert.equal(incList.body.data[0].amount, 1200);

    // 3. Create manual income and expense on 2026-03-15
    const manInc = await api(
      'POST',
      '/api/transactions/income',
      {
        date: '2026-03-15T15:00:00.000Z',
        title: 'Annual Donation',
        category: 'Receive Donation',
        amount: 5000,
        note: 'Alumni contribution',
      },
      schoolA.token
    );
    assert.equal(manInc.status, 201);

    const exp = await api(
      'POST',
      '/api/transactions/expense',
      {
        date: '2026-03-15T16:00:00.000Z',
        title: 'March Electricity Bill',
        category: 'Other',
        amount: 1800,
      },
      schoolA.token
    );
    assert.equal(exp.status, 201);

    // Reject whitespace-only title on expense -> 400
    const blankTitle = await api(
      'POST',
      '/api/transactions/expense',
      {
        date: '2026-03-15',
        title: '   ',
        category: 'Other',
        amount: 100,
      },
      schoolA.token
    );
    assert.equal(blankTitle.status, 400);

    // 4. Verify merged ledger GET /api/transactions?from=2026-03-15&to=2026-03-15
    const ledger = await api(
      'GET',
      '/api/transactions?from=2026-03-15&to=2026-03-15',
      null,
      schoolA.token
    );
    assert.equal(ledger.status, 200);
    assert.equal(ledger.body.data.length, 3);

    const sources = ledger.body.data.map((r) => r.source);
    assert.deepEqual(sources, ['fee', 'manual_income', 'expense']);

    // 5. Cross-tenant isolation: School B cannot delete School A's manual income or expense
    const bDelInc = await api(
      'DELETE',
      `/api/transactions/income/${manInc.body.data._id}`,
      null,
      schoolB.token
    );
    assert.equal(bDelInc.status, 404);

    const bDelExp = await api(
      'DELETE',
      `/api/transactions/expense/${exp.body.data._id}`,
      null,
      schoolB.token
    );
    assert.equal(bDelExp.status, 404);
  });

  it('aggregates todayAttendancePercent (including late) and totalIncome/totalExpense in /api/dashboard', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);

    // Mark today's attendance: 1 present, 1 late, 1 absent => 2/3 effective present = 67%
    await api(
      'POST',
      '/api/attendance/mark',
      {
        date: todayStr,
        class: 'Class 8',
        section: 'A',
        records: [
          { student_id: stu1._id, status: 'present' },
          { student_id: stu2._id, status: 'late' },
          { student_id: stu3._id, status: 'absent' },
        ],
      },
      schoolA.token
    );

    const dash = await api('GET', '/api/dashboard', null, schoolA.token);
    assert.equal(dash.status, 200);
    assert.equal(dash.body.data.totalStudents, 3);
    assert.equal(dash.body.data.todayAttendancePercent, 67);
    assert.equal(dash.body.data.totalIncome, 6200); // 1200 fee + 5000 manual income
    assert.equal(dash.body.data.totalExpense, 1800);
  });
});
