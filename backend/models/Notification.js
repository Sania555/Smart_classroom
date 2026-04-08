const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userType: { type: String, enum: ['student', 'teacher'], required: true },
  type: {
    type: String,
    enum: [
      'class_reminder',
      'attendance_reminder',
      'late_warning',
      'attendance_confirmed',
      'absent_alert',
      'teacher_alert',
      'daily_summary',
      'weekly_report',
      'otp_generated',
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  metadata: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);
