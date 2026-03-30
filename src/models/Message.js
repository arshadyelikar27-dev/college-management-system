const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: String, // Can be studentId or 'ai-bot' or 'admin'
    required: true,
  },
  senderName: String,
  receiverId: {
    type: String, // studentId or 'admin'
    required: true,
  },
  studentId: {
    type: String, // To help with filtering
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
