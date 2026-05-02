const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);

    // Drop legacy unique index that prevented multiple fees per student per month
    // (e.g. March Student Fee + March Exam Fee for same student)
    try {
      const Fee = require('../models/Fee');
      await Fee.collection.dropIndex('school_id_1_student_id_1_month_1');
      console.log('Dropped legacy fee index school_id_1_student_id_1_month_1');
    } catch (e) {
      if (e.code !== 27 && e.codeName !== 'IndexNotFound') {
        console.warn('Fee index drop (optional):', e.message);
      }
    }

    // Drop legacy compound unique index on (school_id, email) — non-sparse, so it
    // treats email:null as a value and blocks multiple guardian users without email.
    try {
      const User = require('../models/User');
      await User.collection.dropIndex('school_id_1_email_1');
      console.log('Dropped legacy user index school_id_1_email_1');
    } catch (e) {
      if (e.code !== 27 && e.codeName !== 'IndexNotFound') {
        console.warn('User index drop (optional):', e.message);
      }
    }

    // Drop sparse email_1 index so it can be rebuilt as a partial-filter index.
    // Sparse indexes still index docs where the field is explicitly set to null,
    // which causes E11000 collisions for guardian users that have email:null.
    try {
      const User = require('../models/User');
      // Unset null/empty emails before recreating the index so existing docs don't collide.
      await User.collection.updateMany(
        { $or: [{ email: null }, { email: '' }] },
        { $unset: { email: '' } }
      );
      await User.collection.dropIndex('email_1');
      console.log('Dropped legacy user index email_1 (will be rebuilt as partial-filter)');
    } catch (e) {
      if (e.code !== 27 && e.codeName !== 'IndexNotFound') {
        console.warn('User email index drop (optional):', e.message);
      }
    }
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
