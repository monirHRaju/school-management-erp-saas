/**
 * Seed script for testing
 * Run: node scripts/seed.js
 * Options:
 *   --fresh   Wipe all existing data before seeding
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const School = require('../src/models/School');
const User = require('../src/models/User');
const Student = require('../src/models/Student');
const Fee = require('../src/models/Fee');
const FeePayment = require('../src/models/FeePayment');
const Income = require('../src/models/Income');
const Transaction = require('../src/models/Transaction');

const FRESH = process.argv.includes('--fresh');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function monthStr(offsetMonths = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Seed Data Definitions ───────────────────────────────────────────────────

const SCHOOLS = [
  {
    name: 'Greenfield Academy',
    slug: 'greenfield',
    contact: '+880-1700-111222',
    subscription_plan: 'pro',
  },
  {
    name: 'Sunrise English Medium School',
    slug: 'sunrise-ems',
    contact: '+880-1800-333444',
    subscription_plan: 'free',
  },
];

// Users per school (passwords stored as plain here — bcrypt pre-save hook handles hashing)
const USERS_PER_SCHOOL = [
  { name: 'Admin User',     email: 'admin@school.com',     role: 'admin',     phone: '01700000001', password: 'admin123' },
  { name: 'Staff Member',   email: 'staff@school.com',     role: 'staff',     phone: '01700000002', password: 'staff123' },
  { name: 'Accountant',     email: 'accounts@school.com',  role: 'accountant', phone: '01700000003', password: 'accounts123' },
];

const STUDENT_TEMPLATES = [
  { name: 'Arif Hossain',    fatherName: 'Karim Hossain',   motherName: 'Rina Begum',    guardianName: 'Karim Hossain',   guardianPhone: '01711111111', class: '5', section: 'A', rollNo: '1',  shift: 'Morning', gender: 'Male',   religion: 'Islam',   monthlyFee: 1500, status: 'active' },
  { name: 'Fatema Akter',    fatherName: 'Jalal Akter',     motherName: 'Mina Begum',    guardianName: 'Jalal Akter',     guardianPhone: '01711111112', class: '5', section: 'A', rollNo: '2',  shift: 'Morning', gender: 'Female', religion: 'Islam',   monthlyFee: 1500, status: 'active' },
  { name: 'Rahim Mia',       fatherName: 'Salam Mia',       motherName: 'Rohima Khatun', guardianName: 'Salam Mia',       guardianPhone: '01711111113', class: '5', section: 'B', rollNo: '1',  shift: 'Morning', gender: 'Male',   religion: 'Islam',   monthlyFee: 1500, status: 'active' },
  { name: 'Nadia Islam',     fatherName: 'Nurul Islam',     motherName: 'Nasrin Begum',  guardianName: 'Nurul Islam',     guardianPhone: '01711111114', class: '6', section: 'A', rollNo: '1',  shift: 'Morning', gender: 'Female', religion: 'Islam',   monthlyFee: 1800, status: 'active' },
  { name: 'Tanvir Ahmed',    fatherName: 'Rafiq Ahmed',     motherName: 'Sahana Begum',  guardianName: 'Rafiq Ahmed',     guardianPhone: '01711111115', class: '6', section: 'A', rollNo: '2',  shift: 'Morning', gender: 'Male',   religion: 'Islam',   monthlyFee: 1800, status: 'active' },
  { name: 'Sumaiya Khanam',  fatherName: 'Bashir Khanam',   motherName: 'Laila Khanam',  guardianName: 'Bashir Khanam',   guardianPhone: '01711111116', class: '6', section: 'B', rollNo: '1',  shift: 'Morning', gender: 'Female', religion: 'Islam',   monthlyFee: 1800, status: 'active' },
  { name: 'Karim Uddin',     fatherName: 'Alam Uddin',      motherName: 'Morjina Begum', guardianName: 'Alam Uddin',      guardianPhone: '01711111117', class: '7', section: 'A', rollNo: '1',  shift: 'Morning', gender: 'Male',   religion: 'Islam',   monthlyFee: 2000, status: 'active' },
  { name: 'Roksana Parvin',  fatherName: 'Habib Parvin',    motherName: 'Aleya Begum',   guardianName: 'Habib Parvin',    guardianPhone: '01711111118', class: '7', section: 'A', rollNo: '2',  shift: 'Morning', gender: 'Female', religion: 'Islam',   monthlyFee: 2000, status: 'active' },
  { name: 'Shakib Khan',     fatherName: 'Lutfor Khan',     motherName: 'Shirin Begum',  guardianName: 'Lutfor Khan',     guardianPhone: '01711111119', class: '8', section: 'A', rollNo: '1',  shift: 'Morning', gender: 'Male',   religion: 'Islam',   monthlyFee: 2200, status: 'active' },
  { name: 'Mitu Rani Das',   fatherName: 'Mohan Das',       motherName: 'Puja Das',      guardianName: 'Mohan Das',       guardianPhone: '01711111120', class: '8', section: 'A', rollNo: '2',  shift: 'Morning', gender: 'Female', religion: 'Hindu',   monthlyFee: 2200, status: 'active' },
  { name: 'Sohel Rana',      fatherName: 'Abdur Rana',      motherName: 'Champa Begum',  guardianName: 'Abdur Rana',      guardianPhone: '01711111121', class: '9', section: 'A', rollNo: '1',  shift: 'Morning', gender: 'Male',   religion: 'Islam',   monthlyFee: 2500, status: 'active', group: 'Science' },
  { name: 'Taslima Begum',   fatherName: 'Nazrul Islam',    motherName: 'Firoza Begum',  guardianName: 'Nazrul Islam',    guardianPhone: '01711111122', class: '9', section: 'A', rollNo: '2',  shift: 'Morning', gender: 'Female', religion: 'Islam',   monthlyFee: 2500, status: 'active', group: 'Science' },
  { name: 'Imran Hossain',   fatherName: 'Shafiq Hossain',  motherName: 'Tania Begum',   guardianName: 'Shafiq Hossain',  guardianPhone: '01711111123', class: '9', section: 'B', rollNo: '1',  shift: 'Morning', gender: 'Male',   religion: 'Islam',   monthlyFee: 2500, status: 'active', group: 'Commerce' },
  { name: 'Maria Khatun',    fatherName: 'Siraj Khatun',    motherName: 'Rashida Begum', guardianName: 'Siraj Khatun',    guardianPhone: '01711111124', class: '10', section: 'A', rollNo: '1', shift: 'Morning', gender: 'Female', religion: 'Islam',   monthlyFee: 2800, status: 'active', group: 'Science' },
  { name: 'Rubel Mia',       fatherName: 'Mizan Mia',       motherName: 'Bilkis Begum',  guardianName: 'Mizan Mia',       guardianPhone: '01711111125', class: '10', section: 'A', rollNo: '2', shift: 'Morning', gender: 'Male',   religion: 'Islam',   monthlyFee: 2800, status: 'inactive' },
];

// ─── Main Seed Function ──────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✔ Connected to MongoDB');

  if (FRESH) {
    await Promise.all([
      School.deleteMany({}),
      User.deleteMany({}),
      Student.deleteMany({}),
      Fee.deleteMany({}),
      FeePayment.deleteMany({}),
      Income.deleteMany({}),
      Transaction.deleteMany({}),
    ]);
    console.log('✔ Cleared existing data (--fresh)');
  }

  for (const schoolData of SCHOOLS) {
    // Skip if school slug already exists
    const existing = await School.findOne({ slug: schoolData.slug });
    if (existing) {
      console.log(`  ↷ School "${schoolData.slug}" already exists — skipping`);
      continue;
    }

    // ── Create School ──────────────────────────────────────────────────────
    const school = await School.create(schoolData);
    console.log(`\n✔ Created school: ${school.name} (${school.slug})`);

    // ── Create Users ───────────────────────────────────────────────────────
    const adminUser = await seedUsers(school);

    // ── Create Students ────────────────────────────────────────────────────
    const students = await seedStudents(school);

    // ── Create Fees & Payments ─────────────────────────────────────────────
    await seedFees(school, students, adminUser);

    // ── Create Expense Transactions ────────────────────────────────────────
    await seedExpenses(school);
  }

  console.log('\n✅ Seeding complete!\n');
  console.log('Test accounts (same credentials for both schools, prefix email with school slug if needed):');
  USERS_PER_SCHOOL.forEach(u => {
    console.log(`  ${u.role.padEnd(12)} ${u.email.padEnd(30)} password: ${u.password}`);
  });

  await mongoose.disconnect();
}

// ─── Users ───────────────────────────────────────────────────────────────────

async function seedUsers(school) {
  let adminUser = null;
  for (const u of USERS_PER_SCHOOL) {
    // Make email unique per school: prefix slug for non-first school
    const emailPrefix = school.slug === SCHOOLS[0].slug ? '' : `${school.slug}.`;
    const email = emailPrefix ? u.email.replace('@', `@${school.slug}.`) : u.email;

    const user = new User({
      school_id: school._id,
      email,
      passwordHash: u.password, // pre-save hook hashes this
      name: `${u.name} (${school.name})`,
      phone: u.phone,
      role: u.role,
    });
    await user.save();
    console.log(`  ✔ User: ${email} [${u.role}]`);
    if (u.role === 'admin') adminUser = user;
  }
  return adminUser;
}

// ─── Students ────────────────────────────────────────────────────────────────

async function seedStudents(school) {
  const students = [];
  for (const tmpl of STUDENT_TEMPLATES) {
    const student = await Student.create({
      ...tmpl,
      school_id: school._id,
      admissionDate: daysAgo(Math.floor(Math.random() * 365) + 30),
    });
    students.push(student);
  }
  console.log(`  ✔ Created ${students.length} students`);
  return students;
}

// ─── Fees & Payments ─────────────────────────────────────────────────────────

async function seedFees(school, students, adminUser) {
  const sid = school._id;
  const uid = adminUser._id;
  let feeCount = 0;
  let paymentCount = 0;

  const months = [monthStr(-2), monthStr(-1), monthStr(0)]; // 2 past months + current

  for (const student of students) {
    if (student.status !== 'active') continue;

    for (const month of months) {
      // Monthly student fee
      const fee = await Fee.create({
        school_id: sid,
        student_id: student._id,
        category: 'student_fee',
        month,
        description: `Monthly fee - ${month}`,
        total_fee: student.monthlyFee,
        paid_amount: 0,
        due_amount: student.monthlyFee,
        status: 'unpaid',
      });
      feeCount++;

      // Randomly collect payment for past months (70% chance) or partial (20%)
      const isPastMonth = month !== monthStr(0);
      const rand = Math.random();

      if (isPastMonth && rand < 0.70) {
        // Full payment
        await collectPayment(fee, student.monthlyFee, 0, sid, uid);
        paymentCount++;
      } else if (isPastMonth && rand < 0.90) {
        // Partial payment
        const partial = Math.floor(student.monthlyFee * 0.5);
        await collectPayment(fee, partial, 0, sid, uid);
        paymentCount++;
      }
      // else: leave unpaid
    }

    // One-off exam fee for Class 9 and 10 students
    if (['9', '10'].includes(student.class)) {
      await Fee.create({
        school_id: sid,
        student_id: student._id,
        category: 'exam_fee',
        month: monthStr(-1),
        description: 'Half-yearly examination fee',
        total_fee: 500,
        paid_amount: 0,
        due_amount: 500,
        status: 'unpaid',
      });
      feeCount++;
    }

    // Book fee for Class 5 students (already fully paid)
    if (student.class === '5') {
      const bookFee = await Fee.create({
        school_id: sid,
        student_id: student._id,
        category: 'book_sales',
        month: monthStr(-2),
        description: 'Annual book purchase',
        total_fee: 1200,
        paid_amount: 0,
        due_amount: 1200,
        status: 'unpaid',
      });
      feeCount++;
      await collectPayment(bookFee, 1200, 0, sid, uid);
      paymentCount++;
    }
  }

  console.log(`  ✔ Created ${feeCount} fee records, ${paymentCount} payments`);
}

async function collectPayment(fee, amount, discount, schoolId, userId) {
  const net = amount - discount;

  await FeePayment.create({
    school_id: schoolId,
    fee_id: fee._id,
    amount: net,
    discount,
    payment_date: daysAgo(Math.floor(Math.random() * 20)),
    created_by: userId,
  });

  await Income.create({
    school_id: schoolId,
    category: fee.category,
    amount: net,
    student_id: fee.student_id,
    fee_id: fee._id,
    date: daysAgo(Math.floor(Math.random() * 20)),
    created_by: userId,
  });

  const newPaid = fee.paid_amount + net;
  const newDue = fee.total_fee - newPaid;
  fee.paid_amount = newPaid;
  fee.due_amount = newDue < 0 ? 0 : newDue;
  fee.status = fee.due_amount === 0 ? 'paid' : 'partial';
  await fee.save();

  // Mirror as income transaction
  await Transaction.create({
    school_id: schoolId,
    type: 'income',
    title: `Fee collection - ${fee.category}`,
    category: fee.category,
    amount: net,
    date: daysAgo(Math.floor(Math.random() * 20)),
    related_fee_id: fee._id,
  });
}

// ─── Expense Transactions ─────────────────────────────────────────────────────

async function seedExpenses(school) {
  const sid = school._id;

  const expenses = [
    { title: 'Teachers Salary',  category: 'Teachers Salary',  amount: 45000, daysBack: 5 },
    { title: 'Office Rent',      category: 'Rents',            amount: 15000, daysBack: 8 },
    { title: 'Printer Paper',    category: 'Printing',         amount: 2500,  daysBack: 12 },
    { title: 'Stationery Items', category: 'Stationary',       amount: 1800,  daysBack: 15 },
    { title: 'Teachers Salary',  category: 'Teachers Salary',  amount: 45000, daysBack: 35 },
    { title: 'Office Rent',      category: 'Rents',            amount: 15000, daysBack: 38 },
    { title: 'Chair Repair',     category: 'Repair',           amount: 3500,  daysBack: 42 },
    { title: 'Guest Refreshment',category: 'Hospitality',      amount: 1200,  daysBack: 50 },
    { title: 'Notice Board',     category: 'Furniture',        amount: 4500,  daysBack: 55 },
    { title: 'Exam Advertisement',category: 'Advertisement',   amount: 2000,  daysBack: 60 },
  ];

  for (const exp of expenses) {
    await Transaction.create({
      school_id: sid,
      type: 'expense',
      title: exp.title,
      category: exp.category,
      amount: exp.amount,
      date: daysAgo(exp.daysBack),
      note: 'Seeded expense',
    });
  }

  // Manual income entries (non-fee)
  await Transaction.create({
    school_id: sid,
    type: 'income',
    title: 'Received Donation',
    category: 'other',
    amount: 10000,
    date: daysAgo(20),
    note: 'Annual donor contribution',
  });

  console.log(`  ✔ Created ${expenses.length + 1} expense/manual-income transactions`);
}

// ─── Run ──────────────────────────────────────────────────────────────────────

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
