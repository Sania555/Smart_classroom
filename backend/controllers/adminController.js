const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const Timetable = require('../models/Timetable');
const jwt = require('jsonwebtoken');

const signToken = (id) =>
  jwt.sign({ id, type: 'admin' }, process.env.JWT_SECRET || 'secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

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

    // Department breakdown
    const departments = await Student.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Batch breakdown
    const batches = await Student.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$batch', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Attendance trend last 7 days
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const trend = await Attendance.aggregate([
      { $match: { date: { $gte: weekAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, total: { $sum: 1 }, present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({ totalStudents, totalTeachers, totalClasses, totalAttendance, todayAttendance, todayPresent, departments, batches, trend });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const { search, department, batch, class: cls } = req.query;
    const filter = {};
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }, { rollNumber: new RegExp(search, 'i') }];
    if (department) filter.department = department;
    if (batch) filter.batch = batch;
    if (cls) filter.class = cls;
    const students = await Student.find(filter).select('-password -faceDescriptor').sort({ name: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllTeachers = async (req, res) => {
  try {
    const { search, department } = req.query;
    const filter = {};
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    if (department) filter.department = department;
    const teachers = await Teacher.find(filter).select('-password').sort({ name: 1 });
    res.json(teachers);
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
