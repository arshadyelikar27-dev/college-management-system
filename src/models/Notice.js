const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
  },
  type: {
    type: String,
    enum: ['Info', 'Urgent', 'Holiday', 'Exam'],
    default: 'Info',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  author: String,
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);
