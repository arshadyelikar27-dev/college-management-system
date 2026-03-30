const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Course name is required'],
    trim: true,
  },
  code: {
    type: String,
    required: [true, 'Course code is required'],
    unique: true,
  },
  description: String,
  duration: String,
  fee: {
    type: Number,
    required: [true, 'Course fee is required'],
  },
}, { timestamps: true });

courseSchema.index({ name: 'text', code: 'text' });

module.exports = mongoose.model('Course', courseSchema);
