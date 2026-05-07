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
      .select('name nameBn slug contact address logoUrl')
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
    const { name, nameBn, contact, address, logoUrl } = req.body;
    const update = {};
    if (name !== undefined && name.trim()) update.name = name.trim();
    if (nameBn !== undefined) update.nameBn = nameBn ? nameBn.trim() : '';
    if (contact !== undefined) update.contact = contact ? contact.trim() : '';
    if (address !== undefined) update.address = address ? address.trim() : '';
    if (logoUrl !== undefined) update.logoUrl = logoUrl ? logoUrl.trim() : '';

    const school = await School.findByIdAndUpdate(
      req.schoolId,
      { $set: update },
      { new: true, runValidators: true }
    ).select('name nameBn slug contact address logoUrl').lean();

    if (!school) return res.status(404).json({ success: false, error: 'School not found' });
    res.json({ success: true, data: school });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/settings/categories — return fee and expense categories for this school
router.get('/categories', async (req, res) => {
  try {
    const school = await School.findById(req.schoolId)
      .select('feeCategories expenseCategories')
      .lean();
    if (!school) return res.status(404).json({ success: false, error: 'School not found' });
    res.json({
      success: true,
      data: {
        feeCategories: school.feeCategories?.length ? school.feeCategories : [
          'Student Fee', 'Exam Fee', 'Book Fee', 'Stationery', 'Library Fee', 'Sports Fee',
          'Transport Fee', 'Admission Fee', 'Fine', 'Other',
        ],
        expenseCategories: school.expenseCategories?.length ? school.expenseCategories : [
          'Teachers Salary', 'Rents', 'Hospitality', 'Printing', 'Stationary',
          'Furniture', 'Repair', 'Entertainment', 'Advertisement', 'Other',
        ],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/settings/categories — update fee and expense categories (admin only)
router.put('/categories', requireRole('admin'), async (req, res) => {
  try {
    const { feeCategories, expenseCategories } = req.body;
    const update = {};
    if (Array.isArray(feeCategories)) {
      update.feeCategories = feeCategories.map((c) => String(c).trim()).filter(Boolean);
    }
    if (Array.isArray(expenseCategories)) {
      update.expenseCategories = expenseCategories.map((c) => String(c).trim()).filter(Boolean);
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: 'feeCategories or expenseCategories required' });
    }
    const school = await School.findByIdAndUpdate(
      req.schoolId,
      { $set: update },
      { new: true, runValidators: false }
    ).select('feeCategories expenseCategories').lean();
    if (!school) return res.status(404).json({ success: false, error: 'School not found' });
    res.json({ success: true, data: { feeCategories: school.feeCategories, expenseCategories: school.expenseCategories } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
