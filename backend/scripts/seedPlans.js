/**
 * Seed subscription plans into MongoDB.
 * Run: node scripts/seedPlans.js
 * Options: --fresh  → drops existing plans before seeding
 */
require('dotenv').config();
const mongoose = require('mongoose');
const SubscriptionPlan = require('../src/models/SubscriptionPlan');

const plans = [
  {
    name: 'Free',
    slug: 'free',
    price: 0,
    currency: 'BDT',
    maxStudents: 50,
    maxAdmins: 1,
    features: {
      bulkFeeGeneration:     false,
      smsNotifications:      false,
      incomeExpenseTracking: false,
      multipleRoles:         false,
      guardianAccess:        false,
      exportReports:         false,
      autoIncomeTracking:    false,
    },
    isActive: true,
    order: 0,
  },
  {
    name: 'Standard',
    slug: 'standard',
    price: 700,
    currency: 'BDT',
    maxStudents: 200,
    maxAdmins: 3,
    features: {
      bulkFeeGeneration:     true,
      smsNotifications:      true,
      incomeExpenseTracking: true,
      multipleRoles:         true,
      guardianAccess:        true,
      exportReports:         false,
      autoIncomeTracking:    true,
    },
    isActive: true,
    order: 1,
  },
  {
    name: 'Pro',
    slug: 'pro',
    price: 1200,
    currency: 'BDT',
    maxStudents: 600,
    maxAdmins: -1, // unlimited
    features: {
      bulkFeeGeneration:     true,
      smsNotifications:      true,
      incomeExpenseTracking: true,
      multipleRoles:         true,
      guardianAccess:        true,
      exportReports:         true,
      autoIncomeTracking:    true,
    },
    isActive: true,
    order: 2,
  },
];

async function run() {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/school_management';
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  if (process.argv.includes('--fresh')) {
    await SubscriptionPlan.deleteMany({});
    console.log('Existing plans removed.');
  }

  for (const plan of plans) {
    await SubscriptionPlan.updateOne(
      { slug: plan.slug },
      { $set: plan },
      { upsert: true }
    );
    console.log(`✓ Upserted plan: ${plan.name} (৳${plan.price}/mo)`);
  }

  console.log('\nDone! 3 plans seeded.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
