const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    email: { type: String, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ['admin', 'staff', 'accountant', 'guardian', 'teacher'], default: 'staff' },
    student_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    // Profile fields
    photoUrl: { type: String, trim: true },
    address: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'], trim: true },
    religion: { type: String, trim: true },
    designation: { type: String, trim: true },
    qualification: { type: String, trim: true },
    experience: { type: String, trim: true },
    subjects: [{ type: String, trim: true }],
    joiningDate: { type: Date },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

userSchema.index({ school_id: 1 });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index(
  { school_id: 1, phone: 1 },
  { unique: true, sparse: true, partialFilterExpression: { phone: { $exists: true, $ne: '' } } }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);
