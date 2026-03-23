'use strict';

const mongoose = require('mongoose');
const { sendSMS, sendBulkSMS } = require('./sms');
const School = require('../models/School');
const Student = require('../models/Student');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SmsLog = require('../models/SmsLog');

// ─── Feature gate: check if school's plan allows SMS ─────────────────────────
async function canSendSMS(schoolId) {
  const school = await School.findById(schoolId).lean();
  if (!school) return false;
  const plan = await SubscriptionPlan.findOne({ slug: school.plan_slug, isActive: true }).lean();
  if (!plan) return false;
  return !!plan.features?.smsNotifications;
}

// ─── Log SMS to database ─────────────────────────────────────────────────────
async function logSMS(schoolId, type, recipients, message, result) {
  try {
    await SmsLog.create({
      school_id: schoolId,
      type,
      recipients,
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

  const dateStr = new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  let totalSent = 0;
  let totalFailed = 0;

  // Send individual messages (personalized per student)
  for (const s of students) {
    const msg = `Dear ${s.guardianName || 'Guardian'}, your ward ${s.name} (Roll: ${s.rollNo || 'N/A'}, Class: ${className}) was ABSENT on ${dateStr}. - ${schoolName}`;
    const result = await sendSMS(s.guardianPhone, msg);
    if (result.success) totalSent++;
    else totalFailed++;
  }

  await logSMS(schoolId, 'attendance_absent', students.length, `Absence notification for ${className} on ${dateStr}`, { sent: totalSent, failed: totalFailed });

  return { sent: totalSent, failed: totalFailed, total: students.length };
}

// ─── Fee: notify guardian when fee is generated ──────────────────────────────
async function notifyFeeGenerated(schoolId, studentId, amount, month, description) {
  if (!(await canSendSMS(schoolId))) return { sent: 0 };

  const student = await Student.findById(studentId).select('name guardianPhone guardianName class').lean();
  if (!student?.guardianPhone) return { sent: 0 };

  const school = await School.findById(schoolId).select('name').lean();
  const schoolName = school?.name || 'School';

  const msg = `Dear ${student.guardianName || 'Guardian'}, a fee of ৳${amount} has been generated for ${student.name} (Class: ${student.class})${month ? ` for ${month}` : ''}${description ? ` — ${description}` : ''}. Please pay on time. - ${schoolName}`;
  const result = await sendSMS(student.guardianPhone, msg);

  await logSMS(schoolId, 'fee_generated', 1, msg, result);
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

  const msg = `Dear ${student.guardianName || 'Guardian'}, the fee due for ${student.name} (Class: ${student.class})${month ? ` for ${month}` : ''} is ৳${dueAmount}. Please pay at your earliest. - ${schoolName}`;
  const result = await sendSMS(student.guardianPhone, msg);

  await logSMS(schoolId, 'fee_due_reminder', 1, msg, result);
  return result;
}

// ─── Payment: send payment confirmation ──────────────────────────────────────
async function notifyPaymentReceived(schoolId, studentId, amount, trxId, feeCategory) {
  if (!(await canSendSMS(schoolId))) return { sent: 0 };

  const student = await Student.findById(studentId).select('name guardianPhone guardianName class').lean();
  if (!student?.guardianPhone) return { sent: 0 };

  const school = await School.findById(schoolId).select('name').lean();
  const schoolName = school?.name || 'School';

  const msg = `Dear ${student.guardianName || 'Guardian'}, payment of ৳${amount} received for ${student.name} (Class: ${student.class}).${trxId ? ` TrxID: ${trxId}` : ''} Thank you! - ${schoolName}`;
  const result = await sendSMS(student.guardianPhone, msg);

  await logSMS(schoolId, 'payment_received', 1, msg, result);
  return result;
}

// ─── Payment Link: send payment link via SMS ─────────────────────────────────
async function notifyPaymentLink(schoolId, studentId, amount, paymentUrl) {
  if (!(await canSendSMS(schoolId))) return { sent: 0 };

  const student = await Student.findById(studentId).select('name guardianPhone guardianName class').lean();
  if (!student?.guardianPhone) return { sent: 0 };

  const school = await School.findById(schoolId).select('name').lean();
  const schoolName = school?.name || 'School';

  const msg = `Dear ${student.guardianName || 'Guardian'}, pay ৳${amount} for ${student.name} (Class: ${student.class}) using this link: ${paymentUrl} - ${schoolName}`;
  const result = await sendSMS(student.guardianPhone, msg);

  await logSMS(schoolId, 'payment_link', 1, msg, result);
  return result;
}

module.exports = {
  canSendSMS,
  notifyAbsentStudents,
  notifyFeeGenerated,
  notifyBulkFeesGenerated,
  notifyFeeDue,
  notifyPaymentReceived,
  notifyPaymentLink,
};
