const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  timetableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable', required: true },
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ['present', 'late', 'absent'],
    default: 'absent',
  },
  markedAt: { type: Date },
  method: {
    type: String,
    enum: ['face', 'otp', 'qr', 'manual'],
    default: 'manual',
  },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  locationValid: { type: Boolean, default: false },
  faceMatchScore: { type: Number, default: 0 },
  absentReason: { type: String, default: '' },
  otpUsed: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

// Compound index to prevent duplicate attendance per student per class per day
attendanceSchema.index({ studentId: 1, timetableId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
