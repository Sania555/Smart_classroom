const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Timetable = require('../models/Timetable');

exports.getAttendanceReport = async (req, res) => {
  try {
    const { class: cls, section, subject, from, to, format } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    let timetableFilter = { isActive: true };
    if (cls) timetableFilter.class = cls;
    if (section) timetableFilter.section = section;
    if (subject) timetableFilter.subject = subject;
    if (req.userType === 'teacher') timetableFilter.teacherId = req.userId;

    const timetables = await Timetable.find(timetableFilter);
    const timetableIds = timetables.map(t => t._id);

    const attendanceFilter = { timetableId: { $in: timetableIds } };
    if (Object.keys(dateFilter).length) attendanceFilter.date = dateFilter;

    const records = await Attendance.find(attendanceFilter)
      .populate('studentId', 'name rollNumber class section email')
      .populate('timetableId', 'subject startTime endTime classroom dayOfWeek')
      .sort({ date: -1 });

    if (format === 'csv') {
      const csv = [
        'Date,Student,Roll No,Class,Subject,Status,Method,Marked At',
        ...records.map(r =>
          `${r.date.toLocaleDateString()},${r.studentId?.name},${r.studentId?.rollNumber},${r.studentId?.class},${r.timetableId?.subject},${r.status},${r.method},${r.markedAt ? new Date(r.markedAt).toLocaleTimeString() : ''}`
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.csv');
      return res.send(csv);
    }

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getSubjectWiseReport = async (req, res) => {
  try {
    const { class: cls, section } = req.query;
    const students = await Student.find({ class: cls, section, isActive: true }).select('-password -faceDescriptor');
    const timetables = await Timetable.find({ class: cls, section, isActive: true });

    const report = [];
    for (const student of students) {
      const subjectStats = {};
      for (const t of timetables) {
        const records = await Attendance.find({ studentId: student._id, timetableId: t._id });
        const present = records.filter(r => r.status === 'present').length;
        const late = records.filter(r => r.status === 'late').length;
        const total = records.length;
        subjectStats[t.subject] = {
          present, late, absent: total - present - late, total,
          percentage: total ? Math.round(((present + late) / total) * 100) : 0,
        };
      }
      report.push({ student: { name: student.name, rollNumber: student.rollNumber }, subjects: subjectStats });
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
