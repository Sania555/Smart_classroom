const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return res.status(401).json({ message: 'Not authorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.id;
    req.userType = decoded.type;

    if (decoded.type === 'student') {
      req.user = await Student.findById(decoded.id).select('-password');
    } else if (decoded.type === 'teacher') {
      req.user = await Teacher.findById(decoded.id).select('-password');
    }

    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid' });
  }
};

const teacherOnly = (req, res, next) => {
  if (req.userType !== 'teacher') {
    return res.status(403).json({ message: 'Teacher access only' });
  }
  next();
};

const studentOnly = (req, res, next) => {
  if (req.userType !== 'student') {
    return res.status(403).json({ message: 'Student access only' });
  }
  next();
};

module.exports = { protect, teacherOnly, studentOnly };
