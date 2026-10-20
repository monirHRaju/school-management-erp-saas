const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const studentsRoutes = require('./routes/students');
const dashboardRoutes = require('./routes/dashboard');
const studentPhotoRoutes = require('./routes/studentPhoto');
const feesRoutes = require('./routes/fees');
const incomeRoutes = require('./routes/income');
const transactionsRoutes = require('./routes/transactions');
const superAdminRoutes = require('./routes/superAdmin');
const subscriptionRoutes = require('./routes/subscription');
const attendanceRoutes   = require('./routes/attendance');
const smsRoutes          = require('./routes/sms');
const smsOrderRoutes     = require('./routes/smsOrder');
const noticeRoutes       = require('./routes/notice');
const guardianRoutes     = require('./routes/guardian');
const usersRoutes        = require('./routes/users');
const schoolNoticeRoutes = require('./routes/schoolNotice');
const academicConfigRoutes = require('./routes/academicConfig');
const academicRoutes = require('./routes/academic');
const homeworkRoutes = require('./routes/homework');
const holidayRoutes = require('./routes/holiday');
const settingsRoutes = require('./routes/settings');
const profileRoutes = require('./routes/profile');
const demoRoutes = require('./routes/demo');
const examRoutes = require('./routes/exams');
const gradingRoutes = require('./routes/grading');
const resultsRoutes = require('./routes/results');
const resultSettingsRoutes = require('./routes/resultSettings');

const app = express();

// Security headers
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// In development, allow common dev origins so "Failed to fetch" from CORS is avoided
const corsOrigin = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? false : true);
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '5mb' }));

// Rate limiters for sensitive auth & OTP endpoints (disabled in test env unless X-Test-Rate-Limit header is set)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit'],
  message: { success: false, error: 'Too many authentication attempts, please try again later.' },
});

const demoOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit'],
  message: { success: false, error: 'Too many OTP requests, please try again later.' },
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/super-admin/login', authLimiter);
app.use('/api/demo/request', demoOtpLimiter);
app.use('/api/demo/verify', demoOtpLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students/photo', studentPhotoRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/attendance',   attendanceRoutes);
app.use('/api/sms',          smsRoutes);
app.use('/api/sms-order',   smsOrderRoutes);
app.use('/api/notices',     noticeRoutes);
app.use('/api/guardian',   guardianRoutes);
app.use('/api/users',      usersRoutes);
app.use('/api/school-notices', schoolNoticeRoutes);
app.use('/api/academic-config', academicConfigRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/grading', gradingRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/result-settings', resultSettingsRoutes);

module.exports = app;
