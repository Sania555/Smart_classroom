const router = require('express').Router();
const { getAttendanceReport, getSubjectWiseReport } = require('../controllers/reportController');
const { protect, teacherOnly } = require('../middleware/auth');

router.get('/attendance', protect, teacherOnly, getAttendanceReport);
router.get('/subject-wise', protect, teacherOnly, getSubjectWiseReport);

module.exports = router;
