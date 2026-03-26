const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    class: { type: String, required: true, trim: true },
    section: { type: String, trim: true, default: '' },
    group: { type: String, trim: true, default: '' },
    due_date: { type: Date, required: true },
    assigned_date: { type: Date, default: Date.now },
    attachment_url: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  { timestamps: true }
);

homeworkSchema.index({ school_id: 1, class: 1, section: 1 });
homeworkSchema.index({ school_id: 1, due_date: 1 });
homeworkSchema.index({ school_id: 1, status: 1 });

module.exports = mongoose.model('Homework', homeworkSchema);
