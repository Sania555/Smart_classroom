const router = require('express').Router();
const {
  markAttendance, getAttendanceByStudent, getAttendanceByClass,
  getAttendanceStats, submitAbsentReason, generateOTP, manualMarkAttendance, sendBulkReminder
} = require('../controllers/attendanceController');
const { protect, teacherOnly, studentOnly } = require('../middleware/auth');

router.post('/mark', protect, studentOnly, markAttendance);
router.post('/otp/generate', protect, teacherOnly, generateOTP);
router.post('/manual', protect, teacherOnly, manualMarkAttendance);
router.post('/bulk-reminder', protect, teacherOnly, sendBulkReminder);
router.post('/absent-reason', protect, studentOnly, submitAbsentReason);
router.get('/student/:studentId', protect, getAttendanceByStudent);
router.get('/class/:timetableId', protect, teacherOnly, getAttendanceByClass);
router.get('/stats/:studentId', protect, getAttendanceStats);
router.get('/my-stats', protect, studentOnly, (req, res, next) => {
  req.params.studentId = req.userId;
  next();
}, getAttendanceStats);

module.exports = router;
