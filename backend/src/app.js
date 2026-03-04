const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const studentsRoutes = require('./routes/students');

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

module.exports = app;
