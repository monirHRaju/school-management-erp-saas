'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  setupTestEnvironment,
  teardownTestEnvironment,
  api,
  createTestSchoolAndAdmin,
} = require('./helpers');
const Income = require('../src/models/Income');
const FeePayment = require('../src/models/FeePayment');

describe('Fees & Payments Module', () => {
  let schoolA;
  let schoolB;
  let student1;
  let student2;

  before(async () => {
    await setupTestEnvironment();
    schoolA = await createTestSchoolAndAdmin('FeesSchoolA');
    schoolB = await createTestSchoolAndAdmin('FeesSchoolB');

    const s1 = await api(
      'POST',
      '/api/students',
      {
        name: 'Rahim Uddin',
        class: 'Class 9',
        section: 'A',
        rollNo: '101',
        monthlyFee: 1000,
      },
      schoolA.token
    );
    assert.equal(s1.status, 201);
    student1 = s1.body.data;

    const s2 = await api(
      'POST',
      '/api/students',
      {
        name: 'Karim Ahmed',
        class: 'Class 9',
        section: 'A',
        rollNo: '102',
        monthlyFee: 1500,
      },
      schoolA.token
    );
    assert.equal(s2.status, 201);
    student2 = s2.body.data;
  });

  after(async () => {
    await teardownTestEnvironment();
  });

  it('generates monthly fees and is idempotent on re-run', async () => {
    const gen1 = await api(
      'POST',
      '/api/fees/generate-month',
      { month: '2026-01' },
      schoolA.token
    );
    assert.equal(gen1.status, 200);
    assert.equal(gen1.body.data.created, 2);
    assert.equal(gen1.body.data.updated, 0);

    const gen2 = await api(
      'POST',
      '/api/fees/generate-month',
      { month: '2026-01' },
      schoolA.token
    );
    assert.equal(gen2.status, 200);
    assert.equal(gen2.body.data.created, 0);
    assert.equal(gen2.body.data.updated, 2);

    const list = await api('GET', '/api/fees?month=2026-01', null, schoolA.token);
    assert.equal(list.status, 200);
    assert.equal(list.body.data.length, 2);
    assert.equal(list.body.summary.totalDue, 2500);
  });

  it('applies discount to due_amount (due = total - paid - discount) and reaches paid status', async () => {
    const list = await api(
      'GET',
      `/api/fees?month=2026-01&student_id=${student1._id}`,
      null,
      schoolA.token
    );
    const fee = list.body.data[0];
    assert.equal(fee.total_fee, 1000);
    assert.equal(fee.due_amount, 1000);

    // Partial payment: 400 paid + 100 discount => 500 due remaining
    const pay1 = await api(
      'POST',
      `/api/fees/${fee._id}/collect`,
      { amount: 400, discount: 100, note: 'First installment with scholarship discount' },
      schoolA.token
    );
    assert.equal(pay1.status, 201);
    assert.equal(pay1.body.data.fee.paid_amount, 400);
    assert.equal(pay1.body.data.fee.due_amount, 500);
    assert.equal(pay1.body.data.fee.status, 'partial');

    // Re-running generate-month preserves both paid_amount and discount_amount
    await api('POST', '/api/fees/generate-month', { month: '2026-01' }, schoolA.token);
    const afterRegen = await api(
      'GET',
      `/api/fees?month=2026-01&student_id=${student1._id}`,
      null,
      schoolA.token
    );
    assert.equal(afterRegen.body.data[0].due_amount, 500);
    assert.equal(afterRegen.body.data[0].status, 'partial');

    // Second payment: pay remaining 500 => 0 due, status 'paid'
    const pay2 = await api(
      'POST',
      `/api/fees/${fee._id}/collect`,
      { amount: 500, discount: 0, note: 'Final installment' },
      schoolA.token
    );
    assert.equal(pay2.status, 201);
    assert.equal(pay2.body.data.fee.paid_amount, 900);
    assert.equal(pay2.body.data.fee.due_amount, 0);
    assert.equal(pay2.body.data.fee.status, 'paid');

    // Verify Income records total 900 (actual cash collected, not 1000)
    const incomes = await Income.find({ fee_id: fee._id }).lean();
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    assert.equal(totalIncome, 900);
  });

  it('rejects paying an already paid fee with 400', async () => {
    const list = await api(
      'GET',
      `/api/fees?month=2026-01&student_id=${student1._id}`,
      null,
      schoolA.token
    );
    const fee = list.body.data[0];
    assert.equal(fee.status, 'paid');

    const res = await api(
      'POST',
      `/api/fees/${fee._id}/collect`,
      { amount: 100 },
      schoolA.token
    );
    assert.equal(res.status, 400);
  });

  it('rejects overpayment (amount > due_amount or amount + discount > due_amount) with 400', async () => {
    const list = await api(
      'GET',
      `/api/fees?month=2026-01&student_id=${student2._id}`,
      null,
      schoolA.token
    );
    const fee = list.body.data[0];
    assert.equal(fee.due_amount, 1500);

    // Overpay by raw amount (2000 > 1500)
    const over1 = await api(
      'POST',
      `/api/fees/${fee._id}/collect`,
      { amount: 2000 },
      schoolA.token
    );
    assert.equal(over1.status, 400);

    // Overpay by amount + discount (1400 + 200 = 1600 > 1500)
    const over2 = await api(
      'POST',
      `/api/fees/${fee._id}/collect`,
      { amount: 1400, discount: 200 },
      schoolA.token
    );
    assert.equal(over2.status, 400);

    // Ensure no Income or FeePayment was created for rejected overpayments
    const payments = await FeePayment.find({ fee_id: fee._id }).lean();
    assert.equal(payments.length, 0);
  });

  it('supports collect-multi with discount and rejects overpayment in collect-multi with 400', async () => {
    // Generate 2026-02 fees
    await api('POST', '/api/fees/generate-month', { month: '2026-02' }, schoolA.token);
    const list = await api('GET', '/api/fees?month=2026-02', null, schoolA.token);
    assert.equal(list.body.data.length, 2);

    const [feeA, feeB] = list.body.data;

    // Try collect-multi with an overpaying item -> should reject with 400
    const badMulti = await api(
      'POST',
      '/api/fees/collect-multi',
      {
        items: [
          { fee_id: feeA._id, amount: feeA.due_amount + 500, discount: 0 },
        ],
      },
      schoolA.token
    );
    assert.equal(badMulti.status, 400);

    // Valid collect-multi with discount on feeA
    const goodMulti = await api(
      'POST',
      '/api/fees/collect-multi',
      {
        items: [
          { fee_id: feeA._id, amount: feeA.due_amount - 100, discount: 100, note: 'Multi 1' },
          { fee_id: feeB._id, amount: 500, discount: 0, note: 'Multi 2' },
        ],
      },
      schoolA.token
    );
    assert.equal(goodMulti.status, 201);
    assert.equal(goodMulti.body.data.count, 2);

    const updatedFeeA = goodMulti.body.data.results.find((r) => r.fee._id === feeA._id).fee;
    assert.equal(updatedFeeA.due_amount, 0);
    assert.equal(updatedFeeA.status, 'paid');
  });

  it('validates invalid student_id ObjectId with 400 on /one-time and /pay', async () => {
    const badOneTime = await api(
      'POST',
      '/api/fees/one-time',
      { student_id: 'not-an-object-id', fee_type: 'exam', amount: 500 },
      schoolA.token
    );
    assert.equal(badOneTime.status, 400);

    const badPay = await api(
      'POST',
      '/api/fees/pay',
      { student_id: 'not-an-object-id', month: '2026-02', amount: 100 },
      schoolA.token
    );
    assert.equal(badPay.status, 400);
  });

  it('enforces cross-tenant isolation and cleans up payments/income on fee delete', async () => {
    const createExtra = await api(
      'POST',
      '/api/fees/additional',
      {
        category: 'exam_fee',
        description: 'Midterm Exam Fee',
        month: '2026-03',
        amount: 600,
        student_id: student1._id,
      },
      schoolA.token
    );
    assert.equal(createExtra.status, 201);
    const feeId = createExtra.body.data[0]._id;

    // Pay 300
    const payRes = await api(
      'POST',
      `/api/fees/${feeId}/pay`,
      { amount: 300 },
      schoolA.token
    );
    assert.equal(payRes.status, 201);

    // School B cannot view history, pay, or delete School A's fee
    const bHistory = await api('GET', `/api/fees/${feeId}/history`, null, schoolB.token);
    assert.equal(bHistory.status, 404);

    const bPay = await api('POST', `/api/fees/${feeId}/collect`, { amount: 100 }, schoolB.token);
    assert.equal(bPay.status, 404);

    const bDel = await api('DELETE', `/api/fees/${feeId}`, null, schoolB.token);
    assert.equal(bDel.status, 404);

    // School A deletes the fee -> Fee, FeePayment, and Income are all removed
    const aDel = await api('DELETE', `/api/fees/${feeId}`, null, schoolA.token);
    assert.equal(aDel.status, 200);

    const remainingPayments = await FeePayment.countDocuments({ fee_id: feeId });
    const remainingIncomes = await Income.countDocuments({ fee_id: feeId });
    assert.equal(remainingPayments, 0);
    assert.equal(remainingIncomes, 0);
  });
});
