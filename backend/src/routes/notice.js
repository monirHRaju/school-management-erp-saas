const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const Notice = require('../models/Notice');

const router = express.Router();
router.use(authMiddleware);

// ─── GET /api/notices — notices for this school ──────────────────────────────
router.get('/', async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));

    const filter = { target: { $in: ['all', schoolId] } };
    const total = await Notice.countDocuments(filter);
    const notices = await Notice.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Mark which ones are read by this school
    const oid = new mongoose.Types.ObjectId(schoolId);
    const enriched = notices.map((n) => ({
      ...n,
      isRead: n.read_by?.some((id) => id.equals(oid)) || false,
    }));

    res.json({
      success: true,
      data: enriched,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/notices/unread-count ───────────────────────────────────────────
router.get('/unread-count', async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const oid = new mongoose.Types.ObjectId(schoolId);

    const count = await Notice.countDocuments({
      target: { $in: ['all', schoolId] },
      read_by: { $ne: oid },
    });

    res.json({ success: true, data: { unreadCount: count } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/notices/:id/read — mark notice as read ───────────────────────
router.post('/:id/read', async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const oid = new mongoose.Types.ObjectId(schoolId);

    const notice = await Notice.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { read_by: oid } },
      { new: true }
    );

    if (!notice) return res.status(404).json({ success: false, error: 'Notice not found' });

    res.json({ success: true, data: { isRead: true } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
