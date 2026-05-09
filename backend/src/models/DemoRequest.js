const mongoose = require('mongoose');

const demoRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    occupation: { type: String, trim: true },
    institution: { type: String, trim: true },
    mobile: { type: String, required: true, trim: true, unique: true },
    address: { type: String, trim: true },
    specialRequirements: { type: String, trim: true },
    heardFrom: { type: String, trim: true },
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DemoRequest', demoRequestSchema);
