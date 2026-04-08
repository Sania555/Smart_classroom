const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');

const signToken = (id, type) =>
  jwt.sign({ id, type }, process.env.JWT_SECRET || 'secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

exports.registerStudent = async (req, res) => {
  try {
    const { name, email, phone, password, class: cls, section, rollNumber, parentEmail, parentPhone } = req.body;
    const exists = await Student.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const student = await Student.create({
      name, email, phone, password, class: cls, section, rollNumber, parentEmail, parentPhone,
      photo: req.file ? `/uploads/${req.file.filename}` : '',
    });

    const token = signToken(student._id, 'student');
    res.status(201).json({ token, user: { ...student.toObject(), password: undefined }, userType: 'student' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.registerTeacher = async (req, res) => {
  try {
    const { name, email, phone, password, subject, employeeId } = req.body;
    const exists = await Teacher.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const teacher = await Teacher.create({ name, email, phone, password, subject, employeeId });
    const token = signToken(teacher._id, 'teacher');
    res.status(201).json({ token, user: { ...teacher.toObject(), password: undefined }, userType: 'teacher' });
  } catch (err) {
    console.error('Teacher register error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, userType } = req.body;
    const Model = userType === 'teacher' ? Teacher : Student;
    const user = await Model.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!user.isActive) return res.status(403).json({ message: 'Account deactivated' });

    const token = signToken(user._id, userType);
    res.json({ token, user: { ...user.toObject(), password: undefined }, userType });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({ user: req.user, userType: req.userType });
};

exports.updatePushSubscription = async (req, res) => {
  try {
    const { subscription } = req.body;
    const Model = req.userType === 'teacher' ? Teacher : Student;
    await Model.findByIdAndUpdate(req.userId, { pushSubscription: subscription });
    res.json({ message: 'Push subscription saved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
