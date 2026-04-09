const router = require('express').Router();
const {
  registerAdmin, loginAdmin, getSystemStats,
  getAllStudents, getAllTeachers, toggleStudentStatus, toggleTeacherStatus
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');

const adminOnly = (req, res, next) => {
  if (req.userType !== 'admin') return res.status(403).json({ message: 'Admin access only' });
  next();
};

router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.get('/stats', protect, adminOnly, getSystemStats);
router.get('/students', protect, adminOnly, getAllStudents);
router.get('/teachers', protect, adminOnly, getAllTeachers);
router.put('/students/:id/toggle', protect, adminOnly, toggleStudentStatus);
router.put('/teachers/:id/toggle', protect, adminOnly, toggleTeacherStatus);

module.exports = router;
