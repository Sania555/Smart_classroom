const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  teacherName: { type: String, required: true },
  class: { type: String, required: true, trim: true, uppercase: true },
  section: { type: String, default: 'A', trim: true, uppercase: true },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    required: true,
  },
  startTime: { type: String, required: true }, // "HH:MM" 24h format
  endTime: { type: String, required: true },
  duration: { type: Number, required: true }, // minutes
  classroom: { type: String, required: true },
  location: {
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Timetable', timetableSchema);
