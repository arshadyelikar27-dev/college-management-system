const mongoose = require('mongoose');

const personalDetailsSchema = new mongoose.Schema({
  fullName: String,
  mobile: String,
  email: String,
  gender: String,
  dob: String,
  bloodGroup: String,
  parentName: String,
  parentMobile: String,
  address: String,
  tenthMarks: String,
  twelfthMarks: String,
});

const admissionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentName: String,
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  courseName: String,
  personalDetails: personalDetailsSchema,
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Paid'],
    default: 'Pending',
  },
  appliedAt: {
    type: Date,
    default: Date.now,
  },
  paymentId: String,
}, { timestamps: true });

admissionSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Admission', admissionSchema);
