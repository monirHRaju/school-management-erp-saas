const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    studentId: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    nameBn: { type: String, trim: true },
    bloodGroup: { type: String, trim: true },
    fatherName: { type: String, trim: true },
    motherName: { type: String, trim: true },
    guardianName: { type: String, trim: true },
    guardianPhone: { type: String, trim: true },
    guardianRelation: { type: String, trim: true },
    fatherProfession: { type: String, trim: true },
    motherProfession: { type: String, trim: true },
    fatherMobile: { type: String, trim: true },
    motherMobile: { type: String, trim: true },
    fatherMonthlyIncome: { type: Number, min: 0 },
    motherMonthlyIncome: { type: Number, min: 0 },
    whatsappNumber: { type: String, trim: true },
    address: { type: String, trim: true },
    photoUrl: { type: String, trim: true },
    shift: { type: String, trim: true },
    group: { type: String, trim: true },
    dateOfBirth: { type: Date },
    birthRegNo: { type: String, trim: true },
    gender: { type: String, trim: true },
    religion: { type: String, trim: true },
    class: { type: String, trim: true },
    section: { type: String, trim: true },
    session: { type: String, trim: true, default: '' },
    rollNo: { type: String, trim: true },
    monthlyFee: { type: Number, min: 0 },
    admissionDate: { type: Date },
    status: { type: String, enum: ['active', 'inactive', 'left'], default: 'active' },
    statusChangedAt: { type: Date },
    statusReason: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

studentSchema.virtual('rollNumber').get(function () {
  return this.rollNo;
});

studentSchema.virtual('admissionId').get(function () {
  return this.studentId;
});

studentSchema.virtual('photo').get(function () {
  return this.photoUrl;
});

function attachStudentAliases(doc) {
  if (!doc || typeof doc !== 'object') return;
  if (doc.rollNo !== undefined && doc.rollNumber === undefined) doc.rollNumber = doc.rollNo;
  if (doc.studentId !== undefined && doc.admissionId === undefined) doc.admissionId = doc.studentId;
  if (doc.photoUrl !== undefined && doc.photo === undefined) doc.photo = doc.photoUrl;
}

studentSchema.post('find', function (docs) {
  if (Array.isArray(docs)) docs.forEach(attachStudentAliases);
});

studentSchema.post('findOne', function (doc) {
  attachStudentAliases(doc);
});

studentSchema.index({ school_id: 1 });
studentSchema.index({ school_id: 1, class: 1, section: 1 });
studentSchema.index({ school_id: 1, status: 1 });
studentSchema.index(
  { school_id: 1, studentId: 1 },
  { unique: true, partialFilterExpression: { studentId: { $type: 'string' } } }
);

module.exports = mongoose.model('Student', studentSchema);
