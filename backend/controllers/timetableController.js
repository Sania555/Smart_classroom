const Timetable = require('../models/Timetable');

const timeToMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

const hasConflict = async (entry, excludeId = null) => {
  const filter = {
    teacherId: entry.teacherId,
    dayOfWeek: entry.dayOfWeek,
    isActive: true,
  };
  if (excludeId) filter._id = { $ne: excludeId };

  const existing = await Timetable.find(filter);
  const newStart = timeToMinutes(entry.startTime);
  const newEnd = timeToMinutes(entry.endTime);

  for (const cls of existing) {
    const s = timeToMinutes(cls.startTime);
    const e = timeToMinutes(cls.endTime);
    if (newStart < e && newEnd > s) return true;
  }

  // Also check classroom conflict
  const roomFilter = { classroom: entry.classroom, dayOfWeek: entry.dayOfWeek, isActive: true };
  if (excludeId) roomFilter._id = { $ne: excludeId };
  const roomClasses = await Timetable.find(roomFilter);
  for (const cls of roomClasses) {
    const s = timeToMinutes(cls.startTime);
    const e = timeToMinutes(cls.endTime);
    if (newStart < e && newEnd > s) return 'room';
  }
  return false;
};

exports.createTimetable = async (req, res) => {
  try {
    const conflict = await hasConflict(req.body);
    if (conflict === true) return res.status(400).json({ message: 'Teacher has a conflicting class at this time' });
    if (conflict === 'room') return res.status(400).json({ message: 'Classroom is already booked at this time' });

    const entry = await Timetable.create(req.body);
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTimetable = async (req, res) => {
  try {
    const { class: cls, section, teacherId, day } = req.query;
    const filter = { isActive: true };
    if (cls) filter.class = cls.trim().toUpperCase();
    if (section) filter.section = section.trim().toUpperCase();
    if (teacherId) filter.teacherId = teacherId;
    if (day) filter.dayOfWeek = day;

    const entries = await Timetable.find(filter).sort({ dayOfWeek: 1, startTime: 1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyTimetable = async (req, res) => {
  try {
    let filter = { isActive: true };
    if (req.userType === 'student') {
      filter.class = req.user.class.trim().toUpperCase();
      filter.section = req.user.section.trim().toUpperCase();
    } else {
      filter.teacherId = req.userId;
    }
    const entries = await Timetable.find(filter).sort({ dayOfWeek: 1, startTime: 1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTodayClasses = async (req, res) => {
  try {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    let filter = { dayOfWeek: today, isActive: true };

    if (req.userType === 'student') {
      filter.class = req.user.class.trim().toUpperCase();
      filter.section = req.user.section.trim().toUpperCase();
    } else {
      filter.teacherId = req.userId;
    }

    const entries = await Timetable.find(filter).sort({ startTime: 1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateTimetable = async (req, res) => {
  try {
    const conflict = await hasConflict({ ...req.body, teacherId: req.body.teacherId }, req.params.id);
    if (conflict === true) return res.status(400).json({ message: 'Teacher has a conflicting class at this time' });
    if (conflict === 'room') return res.status(400).json({ message: 'Classroom is already booked at this time' });

    const entry = await Timetable.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteTimetable = async (req, res) => {
  try {
    await Timetable.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Timetable entry removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
