/**
 * Creates or updates the super admin account.
 * Usage:
 *   node scripts/createSuperAdmin.js
 *   node scripts/createSuperAdmin.js --email admin@myapp.com --name "Jane Doe" --password SecurePass123
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const SuperAdmin = require('../src/models/SuperAdmin');

const args = process.argv.slice(2);
function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

const email = getArg('--email') || 'superadmin@school-erp.com';
const name = getArg('--name') || 'Super Admin';
const password = getArg('--password') || 'SuperAdmin@123';

async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/school-erp');
  console.log('Connected to MongoDB');

  const existing = await SuperAdmin.findOne({ email });
  if (existing) {
    existing.passwordHash = password;
    existing.name = name;
    await existing.save();
    console.log(`\nSuper admin updated: ${email}`);
  } else {
    await SuperAdmin.create({ email, passwordHash: password, name });
    console.log(`\nSuper admin created: ${email}`);
  }

  console.log(`  Email   : ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Name    : ${name}`);
  console.log('\nLogin at /super-admin/login\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
