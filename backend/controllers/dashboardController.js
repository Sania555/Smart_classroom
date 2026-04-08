const Attendance = require('../models/Attendance');
const Timetable = require('../models/Timetable');
const Student = require('../models/Student');
const Notification = require('../models/Notification');

exports.getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.userId;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];

    const todayClasses = await Timetable.find({
      class: req.user.class,
      section: req.user.section,
      dayOfWeek: todayName,
      isActive: true,
    }).sort({ startTime: 1 });

    const todayAttendance = await Attendance.find({ studentId, date: today });

    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAttendance = await Attendance.find({ studentId, date: { $gte: thirtyDaysAgo } })
      .populate('timetableId', 'subject startTime endTime classroom')
      .sort({ date: -1 });

    const total = recentAttendance.length;
    const present = recentAttendance.filter(r => r.status === 'present').length;
    const late = recentAttendance.filter(r => r.status === 'late').length;
    const absent = recentAttendance.filter(r => r.status === 'absent').length;

    const unreadNotifs = await Notification.countDocuments({ userId: studentId, isRead: false });

    res.json({
      todayClasses,
      todayAttendance,
      recentAttendance,
      stats: { total, present, late, absent, percentage: total ? Math.round(((present + late) / total) * 100) : 0 },
      unreadNotifications: unreadNotifs,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTeacherDashboard = async (req, res) => {
  try {
    const teacherId = req.userId;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];

    const todayClasses = await Timetable.find({ teacherId, dayOfWeek: todayName, isActive: true }).sort({ startTime: 1 });

    const classStats = [];
    for (const cls of todayClasses) {
      const students = await Student.countDocuments({ class: cls.class, section: cls.section, isActive: true });
      const records = await Attendance.find({ timetableId: cls._id, date: today });
      const present = records.filter(r => r.status === 'present').length;
      const late = records.filter(r => r.status === 'late').length;
      classStats.push({ class: cls, totalStudents: students, present, late, absent: students - present - late });
    }

    const unreadNotifs = await Notification.countDocuments({ userId: teacherId, isRead: false });

    res.json({ todayClasses, classStats, unreadNotifications: unreadNotifs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
