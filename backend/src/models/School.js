const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    contact: { type: String, trim: true },
    subscription_plan: { type: String, enum: ['free', 'pro'], default: 'free' },
    subscription_expiry: { type: Date },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('School', schoolSchema);
