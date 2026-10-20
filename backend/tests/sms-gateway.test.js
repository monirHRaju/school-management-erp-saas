'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const School = require('../src/models/School');
const SubscriptionPlan = require('../src/models/SubscriptionPlan');
const SuperAdmin = require('../src/models/SuperAdmin');
const {
  setupTestEnvironment,
  teardownTestEnvironment,
  api,
  createTestSchoolAndAdmin,
} = require('./helpers');

describe('SMS Gateway & Manual SMS Order Hardening (Priority 4)', () => {
  let originalFetch;
  let originalSmsToken;
  let providerCalls = [];
  let mockProviderStatus = 'SENT';

  before(async () => {
    await setupTestEnvironment();
    // Enable smsNotifications on 'pro' plan for SMS tests
    await SubscriptionPlan.findOneAndUpdate(
      { slug: 'pro' },
      { $set: { 'features.smsNotifications': true } }
    );

    originalSmsToken = process.env.SMS_TOKEN;
    process.env.SMS_TOKEN = 'test-mock-sms-token';

    originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      const urlStr = String(url);
      if (urlStr.includes('api.bdbulksms.net')) {
        const body = options?.body ? JSON.parse(options.body) : {};
        providerCalls.push({ url: urlStr, body });
        if (urlStr.includes('balance')) {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify([{ response: '99999' }]),
          };
        }
        const smsdata = body.smsdata || [];
        return {
          ok: true,
          status: 200,
          json: async () =>
            smsdata.map((item) => ({
              status: mockProviderStatus,
              statusmsg: mockProviderStatus === 'SENT' ? 'SMS Sent' : 'Provider Error',
              to: item.to,
            })),
        };
      }
      return originalFetch(url, options);
    };
  });

  after(async () => {
    global.fetch = originalFetch;
    if (originalSmsToken === undefined) delete process.env.SMS_TOKEN;
    else process.env.SMS_TOKEN = originalSmsToken;
    await teardownTestEnvironment();
  });

  it('does not leak platform provider balance in GET /api/sms/balance', async () => {
    const school = await createTestSchoolAndAdmin('SmsBalanceSchool');
    await School.findByIdAndUpdate(school.schoolId, { $set: { sms_balance: 120 } });

    providerCalls = [];
    const res = await api('GET', '/api/sms/balance', null, school.token);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.sms_balance, 120);
    assert.equal(res.body.data.balance, undefined, 'Platform provider balance must not be exposed to school admins');
    assert.equal(providerCalls.length, 0, 'GET /api/sms/balance should not query external provider');
  });

  it('strictly validates Bangladeshi phone numbers and does not deduct balance on invalid numbers', async () => {
    const school = await createTestSchoolAndAdmin('SmsValidationSchool');
    await School.findByIdAndUpdate(school.schoolId, { $set: { sms_balance: 10 } });

    providerCalls = [];
    // Invalid operator prefix (011 is not a valid BD mobile operator)
    const bad1 = await api('POST', '/api/sms/send', {
      to: '01112345678',
      message: 'Test invalid operator',
    }, school.token);
    assert.equal(bad1.status, 400);

    // Too short
    const bad2 = await api('POST', '/api/sms/send', {
      to: '01712345',
      message: 'Test short number',
    }, school.token);
    assert.equal(bad2.status, 400);

    // Balance must still be 10 and provider must not have been called
    const schoolAfterBad = await School.findById(school.schoolId).lean();
    assert.equal(schoolAfterBad.sms_balance, 10);
    assert.equal(providerCalls.length, 0);

    // Valid +88017... number should normalize to 017..., deduct 1 credit, and call provider
    mockProviderStatus = 'SENT';
    const good = await api('POST', '/api/sms/send', {
      to: '+880 1712-345678',
      message: 'Hello Guardian',
    }, school.token);
    assert.equal(good.status, 200);
    assert.equal(good.body.data.success, true);
    assert.equal(providerCalls.length, 1);
    assert.equal(providerCalls[0].body.smsdata[0].to, '01712345678');

    const schoolAfterGood = await School.findById(school.schoolId).lean();
    assert.equal(schoolAfterGood.sms_balance, 9);

    // Provider failure should automatically refund the deducted SMS credit
    mockProviderStatus = 'FAILED';
    const failedSend = await api('POST', '/api/sms/send', {
      to: '01812345678',
      message: 'Should refund on failure',
    }, school.token);
    assert.equal(failedSend.status, 200);
    assert.equal(failedSend.body.data.success, false);

    const schoolAfterRefund = await School.findById(school.schoolId).lean();
    assert.equal(schoolAfterRefund.sms_balance, 9, 'Balance must be restored when provider fails');
    mockProviderStatus = 'SENT';
  });

  it('rejects duplicate manual TrxID when pending/approved, allows re-submission if rejected, and prevents double approval race', async () => {
    const school = await createTestSchoolAndAdmin('SmsOrderSchool');

    const sa = await SuperAdmin.create({
      name: 'Order Approver',
      email: `sa_order_${Date.now()}@test.local`,
      passwordHash: 'SuperSecret123!',
    });
    const saToken = jwt.sign(
      { superAdminId: sa._id.toString(), role: 'super_admin' },
      process.env.JWT_SUPER_ADMIN_SECRET || process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 1. Create a manual SMS order
    const order1 = await api('POST', '/api/sms-order/create-manual', {
      smsCount: 500,
      sender_last4: '3378',
      trxid: 'TRX1001XYZ',
    }, school.token);
    assert.equal(order1.status, 201);
    const order1Id = order1.body.data._id;

    // 2. Submitting the same TrxID (even lowercase) while pending must fail with 400
    const dupPending = await api('POST', '/api/sms-order/create-manual', {
      smsCount: 500,
      sender_last4: '3378',
      trxid: 'trx1001xyz',
    }, school.token);
    assert.equal(dupPending.status, 400);

    // 3. Super admin rejects order1
    const rejectRes = await api('PUT', `/api/super-admin/sms-orders/${order1Id}/reject`, {
      reason: 'Typo in amount',
    }, saToken);
    assert.equal(rejectRes.status, 200);

    // 4. Re-submitting the same TrxID after rejection is allowed
    const order2 = await api('POST', '/api/sms-order/create-manual', {
      smsCount: 600,
      sender_last4: '3378',
      trxid: 'TRX1001XYZ',
    }, school.token);
    assert.equal(order2.status, 201);
    const order2Id = order2.body.data._id;

    // 5. Concurrent double-approval by Super Admin must credit balance ONLY ONCE
    const [approveA, approveB] = await Promise.all([
      api('PUT', `/api/super-admin/sms-orders/${order2Id}/approve`, {}, saToken),
      api('PUT', `/api/super-admin/sms-orders/${order2Id}/approve`, {}, saToken),
    ]);

    const statuses = [approveA.status, approveB.status].sort();
    assert.deepEqual(statuses, [200, 400], 'Exactly one approve must succeed (200) and the second must fail (400)');

    const updatedSchool = await School.findById(school.schoolId).lean();
    assert.equal(updatedSchool.sms_balance, 600, 'SMS balance must be credited once (600), not twice (1200)');

    // 6. Submitting the same TrxID after approval must also be rejected with 400
    const dupApproved = await api('POST', '/api/sms-order/create-manual', {
      smsCount: 500,
      sender_last4: '3378',
      trxid: 'TRX1001XYZ',
    }, school.token);
    assert.equal(dupApproved.status, 400);
  });
});
