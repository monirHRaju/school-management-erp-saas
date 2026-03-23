const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    target: { type: String, required: true }, // 'all' or school ObjectId string
    type: { type: String, enum: ['auto', 'manual'], default: 'manual' },
    from: { type: String, enum: ['super_admin', 'system'], default: 'super_admin' },
    read_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'School' }],
  },
  { timestamps: true }
);

noticeSchema.index({ target: 1, createdAt: -1 });
noticeSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notice', noticeSchema);
