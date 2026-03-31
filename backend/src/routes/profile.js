'use strict';

const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('../utils/cloudinary');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ── GET /api/profile — get own profile ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.user._id,
      school_id: new mongoose.Types.ObjectId(req.schoolId),
    }).lean();

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    delete user.passwordHash;
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /api/profile — update own profile ───────────────────────────────────
router.patch('/', async (req, res) => {
  try {
    const {
      name, phone, address, dateOfBirth, gender, religion,
      designation, qualification, experience, subjects, joiningDate,
      photoBase64,
    } = req.body;

    const update = {};

    if (name !== undefined && name.trim()) update.name = name.trim();
    if (phone !== undefined) update.phone = phone ? phone.trim() : undefined;
    if (address !== undefined) update.address = address ? address.trim() : undefined;
    if (dateOfBirth !== undefined) update.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
    if (gender !== undefined) update.gender = gender || undefined;
    if (religion !== undefined) update.religion = religion ? religion.trim() : undefined;
    if (designation !== undefined) update.designation = designation ? designation.trim() : undefined;
    if (qualification !== undefined) update.qualification = qualification ? qualification.trim() : undefined;
    if (experience !== undefined) update.experience = experience ? experience.trim() : undefined;
    if (subjects !== undefined) update.subjects = Array.isArray(subjects) ? subjects.filter(Boolean) : [];
    if (joiningDate !== undefined) update.joiningDate = joiningDate ? new Date(joiningDate) : undefined;

    // Photo upload via Cloudinary
    if (photoBase64) {
      if (!process.env.CLOUDINARY_URL) {
        return res.status(500).json({ success: false, error: 'CLOUDINARY_URL is not configured' });
      }
      const result = await cloudinary.uploader.upload(photoBase64, {
        folder: `school-management/profiles/${req.schoolId}`,
        transformation: [
          { width: 400, height: 400, crop: 'limit' },
          { quality: 'auto:low', fetch_format: 'auto' },
        ],
      });
      update.photoUrl = result.secure_url;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: 'Nothing to update' });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.user._id, school_id: new mongoose.Types.ObjectId(req.schoolId) },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    delete user.passwordHash;
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
