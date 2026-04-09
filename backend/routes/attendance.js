const router = require('express').Router();
const {
  markAttendance, getAttendanceByStudent, getAttendanceByClass,
  getAttendanceStats, submitAbsentReason, generateOTP, generateQR, manualMarkAttendance, sendBulkReminder,
  getAttendanceHeatmap, getSubjectTrend
} = require('../controllers/attendanceController');
const { protect, teacherOnly, studentOnly } = require('../middleware/auth');

router.post('/mark', protect, studentOnly, markAttendance);
router.post('/otp/generate', protect, teacherOnly, generateOTP);
router.post('/qr/generate', protect, teacherOnly, generateQR);
router.post('/manual', protect, teacherOnly, manualMarkAttendance);
router.post('/bulk-reminder', protect, teacherOnly, sendBulkReminder);
router.post('/absent-reason', protect, studentOnly, submitAbsentReason);
router.get('/heatmap', protect, studentOnly, getAttendanceHeatmap);
router.get('/subject-trend', protect, teacherOnly, getSubjectTrend);
router.get('/student/:studentId', protect, getAttendanceByStudent);
router.get('/class/:timetableId', protect, teacherOnly, getAttendanceByClass);
router.get('/stats/:studentId', protect, getAttendanceStats);
router.get('/my-stats', protect, studentOnly, (req, res, next) => {
  req.params.studentId = req.userId;
  next();
}, getAttendanceStats);

module.exports = router;
