'use strict';

const express = require('express');
const mongoose = require('mongoose');
const School = require('../models/School');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
router.use(authMiddleware);

// GET /api/settings — return school profile for current school
router.get('/', async (req, res) => {
  try {
    const school = await School.findById(req.schoolId)
      .select('name slug contact logoUrl')
      .lean();
    if (!school) return res.status(404).json({ success: false, error: 'School not found' });
    res.json({ success: true, data: school });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/settings — update school profile (admin only)
router.patch('/', requireRole('admin'), async (req, res) => {
  try {
    const { name, contact, logoUrl } = req.body;
    const update = {};
    if (name !== undefined && name.trim()) update.name = name.trim();
    if (contact !== undefined) update.contact = contact ? contact.trim() : '';
    if (logoUrl !== undefined) update.logoUrl = logoUrl ? logoUrl.trim() : '';

    const school = await School.findByIdAndUpdate(
      req.schoolId,
      { $set: update },
      { new: true, runValidators: true }
    ).select('name slug contact logoUrl').lean();

    if (!school) return res.status(404).json({ success: false, error: 'School not found' });
    res.json({ success: true, data: school });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
