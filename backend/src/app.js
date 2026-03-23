const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const studentsRoutes = require('./routes/students');
const dashboardRoutes = require('./routes/dashboard');
const studentPhotoRoutes = require('./routes/studentPhoto');
const feesRoutes = require('./routes/fees');
const incomeRoutes = require('./routes/income');
const transactionsRoutes = require('./routes/transactions');
const superAdminRoutes = require('./routes/superAdmin');
const subscriptionRoutes = require('./routes/subscription');
const paymentRoutes      = require('./routes/payment');
const attendanceRoutes   = require('./routes/attendance');
const smsRoutes          = require('./routes/sms');
const smsOrderRoutes     = require('./routes/smsOrder');
const noticeRoutes       = require('./routes/notice');

const app = express();

// In development, allow common dev origins so "Failed to fetch" from CORS is avoided
const corsOrigin = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? false : true);
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students/photo', studentPhotoRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/payment',      paymentRoutes);
app.use('/api/attendance',   attendanceRoutes);
app.use('/api/sms',          smsRoutes);
app.use('/api/sms-order',   smsOrderRoutes);
app.use('/api/notices',     noticeRoutes);

module.exports = app;
