const router = require('express').Router();
const { getStudentDashboard, getTeacherDashboard } = require('../controllers/dashboardController');
const { protect, teacherOnly, studentOnly } = require('../middleware/auth');

router.get('/student', protect, studentOnly, getStudentDashboard);
router.get('/teacher', protect, teacherOnly, getTeacherDashboard);

module.exports = router;
