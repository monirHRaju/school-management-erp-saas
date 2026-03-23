'use strict';

const mongoose = require('mongoose');
const { sendSMS, sendBulkSMS } = require('./sms');
const School = require('../models/School');
const Student = require('../models/Student');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SmsLog = require('../models/SmsLog');

// ─── Feature gate: check if school's plan allows SMS AND has balance ─────────
async function canSendSMS(schoolId) {
  const school = await School.findById(schoolId).lean();
  if (!school) return false;
  const plan = await SubscriptionPlan.findOne({ slug: school.plan_slug, isActive: true }).lean();
  if (!plan) return false;
  if (!plan.features?.smsNotifications) return false;
  return school.sms_balance > 0;
}

// ─── Atomically deduct SMS balance (returns true if successful) ──────────────
async function deductSmsBalance(schoolId, count = 1) {
  const result = await School.findOneAndUpdate(
    { _id: schoolId, sms_balance: { $gte: count } },
    { $inc: { sms_balance: -count } },
    { new: true }
  );
  return !!result;
}

// ─── Log SMS to database ─────────────────────────────────────────────────────
async function logSMS(schoolId, type, recipients, message, result, to = '') {
  try {
    await SmsLog.create({
      school_id: schoolId,
      type,
      recipients,
      to,
      message,
      sent: result.sent || (result.success ? 1 : 0),
      failed: result.failed || (result.success ? 0 : 1),
    });
  } catch (err) {
    console.error('[SMS Log] Failed to save:', err.message);
  }
}

// ─── Attendance: notify guardians of absent students ─────────────────────────
async function notifyAbsentStudents(schoolId, absentStudentIds, date, className) {
  if (!absentStudentIds.length) return { sent: 0 };
  if (!(await canSendSMS(schoolId))) return { sent: 0, skipped: 'plan' };

  const school = await School.findById(schoolId).select('name').lean();
  const schoolName = school?.name || 'School';

  const students = await Student.find({
    _id: { $in: absentStudentIds.map((id) => new mongoose.Types.ObjectId(id)) },
    guardianPhone: { $exists: true, $ne: '' },
  })
    .select('name guardianPhone guardianName rollNo')
    .lean();

  if (!students.length) return { sent: 0, skipped: 'no_phones' };

  // Deduct balance for all students upfront
  const deducted = await deductSmsBalance(schoolId, students.length);
  if (!deducted) return { sent: 0, skipped: 'no_balance' };

  const dateStr = new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  let totalSent = 0;
  let totalFailed = 0;

  // Send individual messages (personalized per student) — Bangla
  for (const s of students) {
    const msg = `আপনার সন্তান ${s.name} আজকে (${dateStr}) স্কুলে অনুপস্থিত। - ${schoolName}`;
    const result = await sendSMS(s.guardianPhone, msg);
    if (result.success) totalSent++;
    else totalFailed++;
  }

  // Restore balance for failed sends
  if (totalFailed > 0) {
    await School.findByIdAndUpdate(schoolId, { $inc: { sms_balance: totalFailed } });
  }

  const phones = students.map((s) => s.guardianPhone).join(',');
  await logSMS(schoolId, 'attendance_absent', students.length, `অনুপস্থিতি বিজ্ঞপ্তি — ${className}, ${dateStr}`, { sent: totalSent, failed: totalFailed }, phones);

  return { sent: totalSent, failed: totalFailed, total: students.length };
}

// ─── Fee: notify guardian when fee is generated ──────────────────────────────
async function notifyFeeGenerated(schoolId, studentId, amount, month, description) {
  if (!(await canSendSMS(schoolId))) return { sent: 0 };

  const student = await Student.findById(studentId).select('name guardianPhone guardianName class').lean();
  if (!student?.guardianPhone) return { sent: 0 };

  const school = await School.findById(schoolId).select('name').lean();
  const schoolName = school?.name || 'School';

  if (!(await deductSmsBalance(schoolId, 1))) return { sent: 0, skipped: 'no_balance' };

  const msg = `আপনার সন্তান ${student.name} (${student.class}) এর${month ? ` ${month}` : ''} ফি ${amount} টাকা নির্ধারণ করা হয়েছে। দ্রুত পরিশোধ করুন। - ${schoolName}`;
  const result = await sendSMS(student.guardianPhone, msg);

  // Restore if failed
  if (!result.success) await School.findByIdAndUpdate(schoolId, { $inc: { sms_balance: 1 } });

  await logSMS(schoolId, 'fee_generated', 1, msg, result, student.guardianPhone);
  return result;
}

// ─── Fee: notify when fees generated in bulk (monthly/yearly) ────────────────
async function notifyBulkFeesGenerated(schoolId, month, studentCount) {
  if (!(await canSendSMS(schoolId))) return { sent: 0 };

  // For bulk, we don't SMS every student — just log it.
  // Individual SMS for bulk generation would be too expensive.
  // Instead, schools can use the manual "Send Due Reminder" feature.
  return { sent: 0, note: 'bulk_fees_logged_only' };
}

// ─── Fee: send due reminder to a specific student ────────────────────────────
async function notifyFeeDue(schoolId, studentId, amount, dueAmount, month, description) {
  if (!(await canSendSMS(schoolId))) return { sent: 0 };

  const student = await Student.findById(studentId).select('name guardianPhone guardianName class').lean();
  if (!student?.guardianPhone) return { sent: 0 };

  const school = await School.findById(schoolId).select('name').lean();
  const schoolName = school?.name || 'School';

  if (!(await deductSmsBalance(schoolId, 1))) return { sent: 0, skipped: 'no_balance' };

  const msg = `আপনার সন্তান ${student.name} (${student.class}) এর${month ? ` ${month}` : ''} ফি ${dueAmount} টাকা বাকী। দ্রুত পরিশোধ করুন। - ${schoolName}`;
  const result = await sendSMS(student.guardianPhone, msg);

  if (!result.success) await School.findByIdAndUpdate(schoolId, { $inc: { sms_balance: 1 } });

  await logSMS(schoolId, 'fee_due_reminder', 1, msg, result, student.guardianPhone);
  return result;
}

// ─── Payment: send payment confirmation ──────────────────────────────────────
async function notifyPaymentReceived(schoolId, studentId, amount, trxId, feeCategory) {
  if (!(await canSendSMS(schoolId))) return { sent: 0 };

  const student = await Student.findById(studentId).select('name guardianPhone guardianName class').lean();
  if (!student?.guardianPhone) return { sent: 0 };

  const school = await School.findById(schoolId).select('name').lean();
  const schoolName = school?.name || 'School';

  if (!(await deductSmsBalance(schoolId, 1))) return { sent: 0, skipped: 'no_balance' };

  const msg = `পেমেন্ট গ্রহণ করা হয়েছে ${amount} টাকা — ${student.name} (${student.class})।${trxId ? ` TrxID: ${trxId}` : ''} ধন্যবাদ! - ${schoolName}`;
  const result = await sendSMS(student.guardianPhone, msg);

  if (!result.success) await School.findByIdAndUpdate(schoolId, { $inc: { sms_balance: 1 } });

  await logSMS(schoolId, 'payment_received', 1, msg, result, student.guardianPhone);
  return result;
}

// ─── Payment Link: send payment link via SMS ─────────────────────────────────
async function notifyPaymentLink(schoolId, studentId, amount, paymentUrl) {
  if (!(await canSendSMS(schoolId))) return { sent: 0 };

  const student = await Student.findById(studentId).select('name guardianPhone guardianName class').lean();
  if (!student?.guardianPhone) return { sent: 0 };

  const school = await School.findById(schoolId).select('name').lean();
  const schoolName = school?.name || 'School';

  if (!(await deductSmsBalance(schoolId, 1))) return { sent: 0, skipped: 'no_balance' };

  const msg = `${student.name} (${student.class}) এর ${amount} টাকা ফি পরিশোধ করুন এই লিংক থেকে: ${paymentUrl} - ${schoolName}`;
  const result = await sendSMS(student.guardianPhone, msg);

  if (!result.success) await School.findByIdAndUpdate(schoolId, { $inc: { sms_balance: 1 } });

  await logSMS(schoolId, 'payment_link', 1, msg, result, student.guardianPhone);
  return result;
}

module.exports = {
  canSendSMS,
  deductSmsBalance,
  notifyAbsentStudents,
  notifyFeeGenerated,
  notifyBulkFeesGenerated,
  notifyFeeDue,
  notifyPaymentReceived,
  notifyPaymentLink,
};
