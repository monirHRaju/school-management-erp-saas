'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const app = require('../src/app');
const SubscriptionPlan = require('../src/models/SubscriptionPlan');
const School = require('../src/models/School');

let server = null;
let baseUrl = '';

function getTestMongoUri() {
  if (process.env.MONGODB_URI_TEST) {
    return process.env.MONGODB_URI_TEST;
  }
  const raw = process.env.MONGODB_URI;
  if (!raw) {
    throw new Error('MONGODB_URI is not set in environment');
  }
  const parsed = new URL(raw);
  parsed.pathname = '/db_school_mgmt_erp_test';
  return parsed.toString();
}

async function clearTestDatabase() {
  if (!mongoose.connection.name || !mongoose.connection.name.endsWith('_test')) {
    throw new Error(`Refusing to clear non-test database: ${mongoose.connection.name}`);
  }
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((col) => col.deleteMany({})));
}

async function setupTestEnvironment() {
  const testUri = getTestMongoUri();
  const parsed = new URL(testUri);
  if (!parsed.pathname.endsWith('_test')) {
    throw new Error(`Refusing to run tests on non-test database: ${parsed.pathname}`);
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(testUri);
  }
  await clearTestDatabase();

  // Seed a Pro plan with all features enabled for testing gated routes
  await SubscriptionPlan.findOneAndUpdate(
    { slug: 'pro' },
    {
      name: 'Pro Plan',
      slug: 'pro',
      price: 999,
      maxStudents: -1,
      maxAdmins: -1,
      features: {
        bulkFeeGeneration: true,
        smsNotifications: false,
        incomeExpenseTracking: true,
        multipleRoles: true,
        guardianAccess: true,
        exportReports: true,
        autoIncomeTracking: true,
      },
    },
    { upsert: true }
  );

  await SubscriptionPlan.findOneAndUpdate(
    { slug: 'free' },
    {
      name: 'Free Plan',
      slug: 'free',
      price: 0,
      maxStudents: 50,
      maxAdmins: 2,
      features: {
        bulkFeeGeneration: true,
        smsNotifications: false,
        incomeExpenseTracking: true,
        multipleRoles: true,
        guardianAccess: false,
        exportReports: false,
        autoIncomeTracking: true,
      },
    },
    { upsert: true }
  );

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  return { baseUrl };
}

async function teardownTestEnvironment() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }
  if (mongoose.connection.readyState !== 0) {
    await clearTestDatabase();
    await mongoose.disconnect();
  }
}

async function api(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, body: data };
}

let schoolCounter = 0;
async function createTestSchoolAndAdmin(label = 'School') {
  schoolCounter += 1;
  const suffix = `${Date.now()}_${schoolCounter}`;
  const email = `admin_${suffix}@test.local`;
  const password = 'Password123!';
  const slug = `school-${suffix}`;

  const reg = await api('POST', '/api/auth/register', {
    schoolName: `${label} ${suffix}`,
    slug,
    name: `Admin ${label}`,
    email,
    password,
  });

  if (reg.status !== 201) {
    throw new Error(`Failed to register test school: ${JSON.stringify(reg.body)}`);
  }

  const token = reg.body.data.token;
  const schoolId = reg.body.data.school._id;

  // Ensure school is on 'pro' plan so all features work
  await School.findByIdAndUpdate(schoolId, { $set: { plan_slug: 'pro' } });

  return { token, schoolId, user: reg.body.data.user, school: reg.body.data.school };
}

module.exports = {
  setupTestEnvironment,
  teardownTestEnvironment,
  api,
  createTestSchoolAndAdmin,
};
