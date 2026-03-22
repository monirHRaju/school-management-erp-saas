const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    price: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'BDT' },
    maxStudents: { type: Number, default: 50 }, // -1 = unlimited
    maxAdmins: { type: Number, default: 1 },    // -1 = unlimited
    features: {
      bulkFeeGeneration:    { type: Boolean, default: false },
      smsNotifications:     { type: Boolean, default: false },
      incomeExpenseTracking:{ type: Boolean, default: false },
      multipleRoles:        { type: Boolean, default: false }, // teacher, accountant roles
      guardianAccess:       { type: Boolean, default: false },
      exportReports:        { type: Boolean, default: false },
      autoIncomeTracking:   { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }, // display ordering (ascending)
  },
  { timestamps: true }
);

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
