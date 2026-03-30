const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentName: String,
  title: {
    type: String,
    required: [true, 'Title is required'],
  },
  description: String,
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  fileUrl: String,
  status: {
    type: String,
    enum: ['Submitted', 'Graded', 'Pending'],
    default: 'Submitted',
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  feedback: String,
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema);
