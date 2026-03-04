const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ['admin', 'staff', 'accountant'], default: 'staff' },
  },
  { timestamps: true }
);

userSchema.index({ school_id: 1 });
userSchema.index({ school_id: 1, email: 1 }, { unique: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);
