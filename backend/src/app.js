const express = require('express');
const authRoutes = require('./routes/auth');

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);

module.exports = app;
