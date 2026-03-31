const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    contact: { type: String, trim: true },
    // plan_slug references SubscriptionPlan.slug (e.g. 'free', 'standard', 'pro')
    plan_slug: { type: String, default: 'free' },
    subscription_expiry: { type: Date },
    // Custom per-school limits set by super admin (overrides plan defaults when set)
    custom_limits: {
      maxStudents: { type: Number, default: null },
      maxAdmins:   { type: Number, default: null },
    },
    sms_balance: { type: Number, default: 0 },
    logoUrl: { type: String, trim: true },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('School', schoolSchema);
