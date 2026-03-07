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
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
