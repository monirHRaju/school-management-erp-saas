'use strict';

const User = require('../models/User');
const School = require('../models/School');
const { sendSMS } = require('./sms');

/**
 * Find or create a guardian user by phone number within a school.
 * If a guardian already exists for that phone+school, returns them.
 * Otherwise creates a new guardian and SMS their credentials.
 *
 * @returns {{ user: Object, created: boolean, password?: string }}
 */
async function findOrCreateGuardian(schoolId, phone, name) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;

  // Check for existing guardian with this phone in this school
  let user = await User.findOne({
    school_id: schoolId,
    phone: normalizedPhone,
    role: 'guardian',
  });

  if (user) return { user, created: false };

  const school = await School.findById(schoolId).select('name').lean();
  const schoolName = school?.name || 'School';

  // Default password = phone number itself
  user = await User.create({
    school_id: schoolId,
    phone: normalizedPhone,
    name: name || 'Guardian',
    role: 'guardian',
    passwordHash: normalizedPhone, // pre-save hook will hash it
  });

  // SMS credentials to guardian
  const msg = `আপনার অভিভাবক অ্যাকাউন্ট তৈরি হয়েছে। ফোন: ${normalizedPhone}, পাসওয়ার্ড: আপনার ফোন নম্বর — ${schoolName}`;
  sendSMS(normalizedPhone, msg).catch(() => {}); // fire-and-forget

  return { user, created: true };
}

/**
 * Link a student to a guardian user.
 */
async function linkStudent(guardianUserId, studentId) {
  await User.findByIdAndUpdate(guardianUserId, {
    $addToSet: { student_ids: studentId },
  });
}

/**
 * Unlink a student from a guardian user.
 */
async function unlinkStudent(guardianUserId, studentId) {
  await User.findByIdAndUpdate(guardianUserId, {
    $pull: { student_ids: studentId },
  });
}

/**
 * Normalize Bangladeshi phone numbers.
 * Accepts: 01712345678, +8801712345678, 8801712345678
 * Returns: 01712345678 (local format) or null if invalid.
 */
function normalizePhone(phone) {
  if (!phone) return null;
  let p = String(phone).replace(/[\s\-()]/g, '');
  if (p.startsWith('+880')) p = '0' + p.slice(4);
  else if (p.startsWith('880')) p = '0' + p.slice(3);
  // Must be 11 digits starting with 01
  if (/^01\d{9}$/.test(p)) return p;
  return null;
}

module.exports = {
  findOrCreateGuardian,
  linkStudent,
  unlinkStudent,
  normalizePhone,
};
