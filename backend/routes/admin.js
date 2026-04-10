const router = require('express').Router();
const {
  registerAdmin, loginAdmin, getAdminMe, getSystemStats,
  getAllStudents, updateStudent, deleteStudent, toggleStudentStatus,
  getAllTeachers, updateTeacher, toggleTeacherStatus,
  getAllTimetables, deleteTimetable,
  getAllAttendance, overrideAttendance,
  getAllLeaves, getAllDisputes, adminReviewLeave, adminReviewDispute,
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');

const adminOnly = (req, res, next) => {
  if (req.userType !== 'admin') return res.status(403).json({ message: 'Admin access only' });
  next();
};

router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.get('/me', protect, adminOnly, getAdminMe);
router.get('/stats', protect, adminOnly, getSystemStats);

// Students
router.get('/students', protect, adminOnly, getAllStudents);
router.put('/students/:id', protect, adminOnly, updateStudent);
router.put('/students/:id/toggle', protect, adminOnly, toggleStudentStatus);
router.delete('/students/:id', protect, adminOnly, deleteStudent);

// Teachers
router.get('/teachers', protect, adminOnly, getAllTeachers);
router.put('/teachers/:id', protect, adminOnly, updateTeacher);
router.put('/teachers/:id/toggle', protect, adminOnly, toggleTeacherStatus);

// Timetable
router.get('/timetables', protect, adminOnly, getAllTimetables);
router.delete('/timetables/:id', protect, adminOnly, deleteTimetable);

// Attendance
router.get('/attendance', protect, adminOnly, getAllAttendance);
router.put('/attendance/:id/override', protect, adminOnly, overrideAttendance);

// Leave & Disputes
router.get('/leaves', protect, adminOnly, getAllLeaves);
router.put('/leaves/:id/review', protect, adminOnly, adminReviewLeave);
router.get('/disputes', protect, adminOnly, getAllDisputes);
router.put('/disputes/:id/review', protect, adminOnly, adminReviewDispute);

module.exports = router;
