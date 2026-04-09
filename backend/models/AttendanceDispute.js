const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance', required: true },
  timetableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable', required: true },
  date: { type: Date, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  teacherComment: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AttendanceDispute', disputeSchema);
