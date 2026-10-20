'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const Notice = require('../src/models/Notice');
const SuperAdmin = require('../src/models/SuperAdmin');
const {
  setupTestEnvironment,
  teardownTestEnvironment,
  api,
  createTestSchoolAndAdmin,
} = require('./helpers');

describe('Multi-Tenant Security & Role Isolation Audit (Priority 2)', () => {
  before(async () => {
    await setupTestEnvironment();
  });

  after(async () => {
    await teardownTestEnvironment();
  });

  it('prevents School B from reading, updating, or deleting School A resources across modules', async () => {
    const schoolA = await createTestSchoolAndAdmin('TenantA');
    const schoolB = await createTestSchoolAndAdmin('TenantB');

    // 1. Student in School A
    const stuRes = await api('POST', '/api/students', {
      name: 'Alice TenantA',
      class: 'Six',
      section: 'A',
      rollNo: '1',
      monthlyFee: 1000,
    }, schoolA.token);
    assert.equal(stuRes.status, 201);
    const studentAId = stuRes.body.data._id;

    // School B cannot read, patch, or delete Student A
    const getStuB = await api('GET', `/api/students/${studentAId}`, null, schoolB.token);
    assert.equal(getStuB.status, 404);
    const patchStuB = await api('PATCH', `/api/students/${studentAId}`, { name: 'Hacked' }, schoolB.token);
    assert.equal(patchStuB.status, 404);
    const delStuB = await api('DELETE', `/api/students/${studentAId}`, null, schoolB.token);
    assert.equal(delStuB.status, 404);
    const listStuB = await api('GET', '/api/students', null, schoolB.token);
    assert.equal(listStuB.body.data.length, 0);

    // 2. Academic Session & Section cross-tenant reference check
    const sessRes = await api('POST', '/api/academic/sessions', {
      name: '2026 Session A',
      year: '2026',
    }, schoolA.token);
    assert.equal(sessRes.status, 201);
    const sessionAId = sessRes.body.data._id;

    // School B cannot link its section to School A's session
    const secBRes = await api('POST', '/api/academic/sections', {
      name: 'Section B',
      session: sessionAId,
    }, schoolB.token);
    assert.equal(secBRes.status, 404);

    // 3. Homework in School A
    const hwRes = await api('POST', '/api/homework', {
      title: 'Math HW A',
      description: 'Chapter 1',
      subject: 'Math',
      class: 'Six',
      due_date: '2026-11-01',
    }, schoolA.token);
    assert.equal(hwRes.status, 201);
    const hwAId = hwRes.body.data._id;

    // School B cannot update or delete School A's homework
    assert.equal((await api('PATCH', `/api/homework/${hwAId}`, { title: 'Hacked' }, schoolB.token)).status, 404);
    assert.equal((await api('DELETE', `/api/homework/${hwAId}`, null, schoolB.token)).status, 404);

    // 4. Exam in School A
    const examRes = await api('POST', '/api/exams', {
      name: 'Midterm A',
      class: 'Six',
    }, schoolA.token);
    assert.equal(examRes.status, 201);
    const examAId = examRes.body.data._id;

    assert.equal((await api('PATCH', `/api/exams/${examAId}`, { name: 'Hacked' }, schoolB.token)).status, 404);
    assert.equal((await api('DELETE', `/api/exams/${examAId}`, null, schoolB.token)).status, 404);

    // 5. System Notice targeted privately to School A
    const privateNotice = await Notice.create({
      title: 'Private Notice for School A',
      message: 'Confidential',
      target: schoolA.schoolId,
      type: 'manual',
      from: 'super_admin',
    });

    // School B cannot mark School A's private notice as read
    const readNoticeB = await api('POST', `/api/notices/${privateNotice._id}/read`, {}, schoolB.token);
    assert.equal(readNoticeB.status, 404);

    // School A can mark its own notice as read
    const readNoticeA = await api('POST', `/api/notices/${privateNotice._id}/read`, {}, schoolA.token);
    assert.equal(readNoticeA.status, 200);

    // 6. School Notice in School A
    const snRes = await api('POST', '/api/school-notices', {
      title: 'School A Internal Notice',
      message: 'For all in School A',
      target_type: 'all',
    }, schoolA.token);
    assert.equal(snRes.status, 201);
    const schoolNoticeAId = snRes.body.data._id;

    // School B cannot mark School A's school-notice as read or delete it
    assert.equal((await api('POST', `/api/school-notices/${schoolNoticeAId}/read`, {}, schoolB.token)).status, 404);
    assert.equal((await api('DELETE', `/api/school-notices/${schoolNoticeAId}`, null, schoolB.token)).status, 404);
  });

  it('enforces Guardian child isolation and blocks role escalation & inactive accounts', async () => {
    const school = await createTestSchoolAndAdmin('RoleSchool');

    // Create two students with two different guardians
    const s1 = await api('POST', '/api/students', {
      name: 'Child One',
      class: 'Six',
      guardianName: 'Guardian One',
      guardianPhone: '01711111111',
      monthlyFee: 800,
    }, school.token);
    assert.equal(s1.status, 201);
    const child1Id = s1.body.data._id;

    const s2 = await api('POST', '/api/students', {
      name: 'Child Two',
      class: 'Six',
      guardianName: 'Guardian Two',
      guardianPhone: '01822222222',
      monthlyFee: 800,
    }, school.token);
    assert.equal(s2.status, 201);
    const child2Id = s2.body.data._id;

    // Login as Guardian One (password = normalized phone)
    const g1Login = await api('POST', '/api/auth/login', {
      phone: '01711111111',
      password: '01711111111',
    });
    assert.equal(g1Login.status, 200);
    const g1Token = g1Login.body.data.token;

    // Guardian One can view Child One but gets 403 on Child Two
    const ownChild = await api('GET', `/api/guardian/children/${child1Id}`, null, g1Token);
    assert.equal(ownChild.status, 200);

    const otherChild = await api('GET', `/api/guardian/children/${child2Id}`, null, g1Token);
    assert.equal(otherChild.status, 403);

    const otherChildFees = await api('GET', `/api/guardian/children/${child2Id}/fees`, null, g1Token);
    assert.equal(otherChildFees.status, 403);

    // Guardian One cannot access admin/staff endpoints
    assert.equal((await api('GET', '/api/students', null, g1Token)).status, 403);
    assert.equal((await api('GET', '/api/users', null, g1Token)).status, 403);
    assert.equal((await api('PATCH', '/api/settings', { name: 'Hacked' }, g1Token)).status, 403);

    // Create a teacher account, verify teacher cannot access admin-only /api/users or delete exams
    const teacherRes = await api('POST', '/api/users', {
      name: 'Teacher One',
      email: `teacher_${Date.now()}@test.local`,
      password: 'Password123!',
      role: 'teacher',
    }, school.token);
    assert.equal(teacherRes.status, 201);
    const teacherId = teacherRes.body.data._id;

    const teacherLogin = await api('POST', '/api/auth/login', {
      email: teacherRes.body.data.email,
      password: 'Password123!',
    });
    assert.equal(teacherLogin.status, 200);
    const teacherToken = teacherLogin.body.data.token;

    assert.equal((await api('GET', '/api/users', null, teacherToken)).status, 403);
    assert.equal((await api('PATCH', '/api/settings', { name: 'Hacked' }, teacherToken)).status, 403);

    // Deactivate teacher -> existing JWT should immediately be rejected with 401
    const deactivateRes = await api('PATCH', `/api/users/${teacherId}`, { status: 'inactive' }, school.token);
    assert.equal(deactivateRes.status, 200);

    const afterDeactivate = await api('GET', '/api/students', null, teacherToken);
    assert.equal(afterDeactivate.status, 401);
  });

  it('rejects school admin JWT on /api/super-admin routes and sets Helmet security headers', async () => {
    const school = await createTestSchoolAndAdmin('TokenCheck');

    // School Admin JWT must be rejected on super-admin routes
    const saStats = await api('GET', '/api/super-admin/stats', null, school.token);
    assert.equal(saStats.status, 401);

    const saSchools = await api('GET', '/api/super-admin/schools', null, school.token);
    assert.equal(saSchools.status, 401);

    // SuperAdmin JWT must be rejected on school routes
    const sa = await SuperAdmin.create({
      name: 'Root Admin',
      email: `sa_${Date.now()}@test.local`,
      passwordHash: 'SuperSecret123!',
    });
    const saToken = jwt.sign(
      { superAdminId: sa._id.toString(), role: 'super_admin' },
      process.env.JWT_SUPER_ADMIN_SECRET || process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const schoolRouteWithSaToken = await api('GET', '/api/students', null, saToken);
    assert.equal(schoolRouteWithSaToken.status, 401);

    // Check Helmet security header is present
    assert.equal(saStats.headers.get('x-content-type-options'), 'nosniff');
  });
});
