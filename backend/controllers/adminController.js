const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const Timetable = require('../models/Timetable');
const LeaveRequest = require('../models/LeaveRequest');
const AttendanceDispute = require('../models/AttendanceDispute');
const jwt = require('jsonwebtoken');

const signToken = (id) =>
  jwt.sign({ id, type: 'admin' }, process.env.JWT_SECRET || 'secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

// ── Auth ────────────────────────────────────────────────────────

exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exists = await Admin.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });
    const admin = await Admin.create({ name, email, password });
    const token = signToken(admin._id);
    res.status(201).json({ token, user: { ...admin.toObject(), password: undefined }, userType: 'admin' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = signToken(admin._id);
    res.json({ token, user: { ...admin.toObject(), password: undefined }, userType: 'admin' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAdminMe = async (req, res) => {
  res.json({ user: req.user, userType: 'admin' });
};

// ── Stats ───────────────────────────────────────────────────────

exports.getSystemStats = async (req, res) => {
  try {
    const [totalStudents, totalTeachers, totalClasses, totalAttendance] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      Teacher.countDocuments({ isActive: true }),
      Timetable.countDocuments({ isActive: true }),
      Attendance.countDocuments(),
    ]);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayAttendance = await Attendance.countDocuments({ date: today });
    const todayPresent = await Attendance.countDocuments({ date: today, status: { $in: ['present', 'late'] } });
    const pendingLeaves = await LeaveRequest.countDocuments({ status: 'pending' });
    const pendingDisputes = await AttendanceDispute.countDocuments({ status: 'pending' });

    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const trend = await Attendance.aggregate([
      { $match: { date: { $gte: weekAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, total: { $sum: 1 }, present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } } } },
      { $sort: { _id: 1 } },
    ]);

    const classDist = await Student.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: { class: '$class', section: '$section' }, count: { $sum: 1 } } },
      { $sort: { '_id.class': 1 } },
    ]);

    res.json({ totalStudents, totalTeachers, totalClasses, totalAttendance, todayAttendance, todayPresent, pendingLeaves, pendingDisputes, trend, classDist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Students ────────────────────────────────────────────────────

exports.getAllStudents = async (req, res) => {
  try {
    const { search, class: cls, section } = req.query;
    const filter = {};
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }, { rollNumber: new RegExp(search, 'i') }];
    if (cls) filter.class = cls.toUpperCase();
    if (section) filter.section = section.toUpperCase();
    const students = await Student.find(filter).select('-password -faceDescriptor').sort({ class: 1, rollNumber: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { name, email, phone, class: cls, section, rollNumber, parentEmail, parentPhone } = req.body;
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, class: cls, section, rollNumber, parentEmail, parentPhone },
      { new: true }
    ).select('-password -faceDescriptor');
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    await Student.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Student deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleStudentStatus = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    student.isActive = !student.isActive;
    await student.save();
    res.json({ isActive: student.isActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Teachers ────────────────────────────────────────────────────

exports.getAllTeachers = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }, { employeeId: new RegExp(search, 'i') }];
    const teachers = await Teacher.find(filter).select('-password').sort({ name: 1 });
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const { name, email, phone, subject, employeeId } = req.body;
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, subject, employeeId },
      { new: true }
    ).select('-password');
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleTeacherStatus = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    teacher.isActive = !teacher.isActive;
    await teacher.save();
    res.json({ isActive: teacher.isActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Timetable ───────────────────────────────────────────────────

exports.getAllTimetables = async (req, res) => {
  try {
    const { class: cls, section, teacherId } = req.query;
    const filter = { isActive: true };
    if (cls) filter.class = cls.toUpperCase();
    if (section) filter.section = section.toUpperCase();
    if (teacherId) filter.teacherId = teacherId;
    const entries = await Timetable.find(filter).sort({ class: 1, dayOfWeek: 1, startTime: 1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteTimetable = async (req, res) => {
  try {
    await Timetable.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Class removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Attendance ──────────────────────────────────────────────────

exports.getAllAttendance = async (req, res) => {
  try {
    const { class: cls, section, date, status } = req.query;
    let timetableFilter = { isActive: true };
    if (cls) timetableFilter.class = cls.toUpperCase();
    if (section) timetableFilter.section = section.toUpperCase();
    const timetables = await Timetable.find(timetableFilter);
    const ids = timetables.map(t => t._id);

    const filter = { timetableId: { $in: ids } };
    if (date) { const d = new Date(date); d.setHours(0,0,0,0); filter.date = d; }
    if (status) filter.status = status;

    const records = await Attendance.find(filter)
      .populate('studentId', 'name rollNumber class section')
      .populate('timetableId', 'subject startTime classroom teacherName')
      .sort({ date: -1 })
      .limit(500);
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.overrideAttendance = async (req, res) => {
  try {
    const { status } = req.body;
    const record = await Attendance.findByIdAndUpdate(req.params.id, { status, method: 'manual' }, { new: true });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Leave & Disputes ────────────────────────────────────────────

exports.getAllLeaves = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const leaves = await LeaveRequest.find(filter)
      .populate('studentId', 'name rollNumber class section')
      .populate('timetableId', 'subject startTime teacherName')
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllDisputes = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const disputes = await AttendanceDispute.find(filter)
      .populate('studentId', 'name rollNumber class section')
      .populate('timetableId', 'subject startTime teacherName')
      .populate('attendanceId', 'status date')
      .sort({ createdAt: -1 });
    res.json(disputes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.adminReviewLeave = async (req, res) => {
  try {
    const { status, teacherComment } = req.body;
    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status, teacherComment, reviewedBy: req.userId, reviewedAt: new Date() },
      { new: true }
    );
    res.json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.adminReviewDispute = async (req, res) => {
  try {
    const { status, teacherComment } = req.body;
    const dispute = await AttendanceDispute.findByIdAndUpdate(
      req.params.id,
      { status, teacherComment, reviewedBy: req.userId, reviewedAt: new Date() },
      { new: true }
    );
    if (status === 'approved') {
      await Attendance.findByIdAndUpdate(dispute.attendanceId, { status: 'present', method: 'manual' });
    }
    res.json(dispute);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
