const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Holiday = require('../models/Holiday');

const router = express.Router();
router.use(authMiddleware);

// GET /api/holidays?month=YYYY-MM  (returns all holidays for that month)
// GET /api/holidays?year=YYYY      (returns all holidays for that year)
router.get('/', requireRole('admin', 'staff', 'teacher', 'accountant'), async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { month, year } = req.query;

    const filter = { school_id: schoolId };

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number);
      filter.date = {
        $gte: new Date(Date.UTC(y, m - 1, 1)),
        $lte: new Date(Date.UTC(y, m, 0)),
      };
    } else if (year && /^\d{4}$/.test(year)) {
      const y = Number(year);
      filter.date = {
        $gte: new Date(Date.UTC(y, 0, 1)),
        $lte: new Date(Date.UTC(y, 11, 31)),
      };
    }

    const holidays = await Holiday.find(filter).sort({ date: 1 }).lean();
    res.json({ success: true, data: holidays });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/holidays — create a holiday
router.post('/', requireRole('admin', 'staff'), async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { date, name, description } = req.body;

    if (!date || !name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'date and name are required' });
    }

    const dateObj = new Date(date + 'T00:00:00.000Z');

    const holiday = await Holiday.findOneAndUpdate(
      { school_id: schoolId, date: dateObj },
      { $set: { name: name.trim(), description: (description || '').trim() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, data: holiday });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/holidays/:id
router.delete('/:id', requireRole('admin', 'staff'), async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const result = await Holiday.deleteOne({ _id: id, school_id: schoolId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Holiday not found' });
    }

    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
