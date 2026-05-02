'use strict';

const School = require('../models/School');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Student = require('../models/Student');
const User = require('../models/User');

async function getSchoolPlan(schoolId) {
  const school = await School.findById(schoolId).lean();
  if (!school) return { school: null, plan: null };
  const plan = await SubscriptionPlan.findOne({ slug: school.plan_slug || 'free' }).lean();
  return { school, plan };
}

function effectiveLimits(school, plan) {
  return {
    maxStudents: school.custom_limits?.maxStudents != null
      ? school.custom_limits.maxStudents
      : (plan?.maxStudents ?? 100),
    maxAdmins: school.custom_limits?.maxAdmins != null
      ? school.custom_limits.maxAdmins
      : (plan?.maxAdmins ?? 2),
  };
}

function isExpired(school) {
  if (!school.subscription_expiry) return false;
  return new Date() > new Date(school.subscription_expiry);
}

// Middleware: block if plan does not include a feature (also blocks on expiry)
function requireFeature(featureKey) {
  return (req, res, next) => {
    getSchoolPlan(req.schoolId).then(({ school, plan }) => {
      if (!school) return res.status(404).json({ success: false, error: 'School not found' });
      if (isExpired(school)) {
        return res.status(403).json({
          success: false,
          error: 'Subscription expired. Please contact your administrator to renew.',
          code: 'SUBSCRIPTION_EXPIRED',
        });
      }
      if (!plan?.features?.[featureKey]) {
        return res.status(403).json({
          success: false,
          error: 'This feature is not available on your current plan. Please upgrade to access it.',
          code: 'PLAN_FEATURE_REQUIRED',
          feature: featureKey,
        });
      }
      next();
    }).catch(next);
  };
}

// Check student count against the plan limit before adding `addCount` new students.
// Returns { allowed, error?, used?, max?, remaining? }
async function checkStudentLimit(schoolId, addCount = 1) {
  const { school, plan } = await getSchoolPlan(schoolId);
  if (!school) return { allowed: false, error: 'School not found' };
  if (isExpired(school)) {
    return { allowed: false, error: 'Subscription expired. Please renew to add students.' };
  }
  const limits = effectiveLimits(school, plan);
  if (limits.maxStudents === -1) return { allowed: true };
  const currentCount = await Student.countDocuments({ school_id: schoolId, status: { $ne: 'left' } });
  const remaining = limits.maxStudents - currentCount;
  if (remaining <= 0) {
    return {
      allowed: false,
      used: currentCount,
      max: limits.maxStudents,
      remaining: 0,
      error: `Student limit reached (${currentCount}/${limits.maxStudents}). Upgrade your plan to add more students.`,
    };
  }
  if (addCount > remaining) {
    return {
      allowed: false,
      used: currentCount,
      max: limits.maxStudents,
      remaining,
      error: `Cannot add ${addCount} student(s). Only ${remaining} slot(s) remaining (${currentCount}/${limits.maxStudents}). Upgrade your plan or reduce the count.`,
    };
  }
  return { allowed: true, used: currentCount, max: limits.maxStudents, remaining };
}

// Check staff account count against the plan limit.
async function checkStaffLimit(schoolId) {
  const { school, plan } = await getSchoolPlan(schoolId);
  if (!school) return { allowed: false, error: 'School not found' };
  if (isExpired(school)) {
    return { allowed: false, error: 'Subscription expired. Please renew to add staff accounts.' };
  }
  const limits = effectiveLimits(school, plan);
  if (limits.maxAdmins === -1) return { allowed: true };
  const count = await User.countDocuments({
    school_id: schoolId,
    role: { $in: ['admin', 'staff', 'accountant', 'teacher'] },
  });
  if (count >= limits.maxAdmins) {
    return {
      allowed: false,
      used: count,
      max: limits.maxAdmins,
      error: `Staff account limit reached (${count}/${limits.maxAdmins}). Upgrade your plan to add more staff accounts.`,
    };
  }
  return { allowed: true, used: count, max: limits.maxAdmins };
}

// Returns true if the school's current plan has the given feature enabled (and is not expired).
async function hasFeature(schoolId, featureKey) {
  const { school, plan } = await getSchoolPlan(schoolId);
  if (!school || isExpired(school)) return false;
  return !!(plan?.features?.[featureKey]);
}

// Guardian accounts are capped at the same number as the student limit.
async function checkGuardianLimit(schoolId) {
  const { school, plan } = await getSchoolPlan(schoolId);
  if (!school) return { allowed: false, error: 'School not found' };
  if (isExpired(school)) {
    return { allowed: false, error: 'Subscription expired. Please renew to add guardians.' };
  }
  const limits = effectiveLimits(school, plan);
  if (limits.maxStudents === -1) return { allowed: true };
  const count = await User.countDocuments({ school_id: schoolId, role: 'guardian' });
  if (count >= limits.maxStudents) {
    return {
      allowed: false,
      used: count,
      max: limits.maxStudents,
      error: `Guardian account limit reached (${count}/${limits.maxStudents}). Upgrade your plan to add more.`,
    };
  }
  return { allowed: true, used: count, max: limits.maxStudents };
}

module.exports = { requireFeature, checkStudentLimit, checkStaffLimit, checkGuardianLimit, hasFeature };
