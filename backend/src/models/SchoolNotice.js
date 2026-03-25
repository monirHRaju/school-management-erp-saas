'use strict';

const mongoose = require('mongoose');

const schoolNoticeSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['manual', 'auto'], default: 'manual' },
    target_type: { type: String, enum: ['all', 'role', 'students', 'users'], required: true },
    target_roles: [{ type: String, enum: ['admin', 'staff', 'accountant', 'guardian'] }],
    target_students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    target_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    read_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

schoolNoticeSchema.index({ school_id: 1, createdAt: -1 });
schoolNoticeSchema.index({ school_id: 1, target_students: 1 });

module.exports = mongoose.model('SchoolNotice', schoolNoticeSchema);
