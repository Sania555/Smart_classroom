const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  timetableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  otp: { type: String, required: true },
  date: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  isUsed: { type: Boolean, default: false },
  isQR: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('OTP', otpSchema);
