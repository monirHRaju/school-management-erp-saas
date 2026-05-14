const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    date: { type: Date, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

holidaySchema.index({ school_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Holiday', holidaySchema);
