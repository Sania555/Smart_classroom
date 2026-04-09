const router = require('express').Router();
const {
  submitLeave, getMyLeaves, getClassLeaves, reviewLeave,
  submitDispute, getMyDisputes, getClassDisputes, reviewDispute
} = require('../controllers/leaveController');
const { protect, teacherOnly, studentOnly } = require('../middleware/auth');

// Leave requests
router.post('/leave', protect, studentOnly, submitLeave);
router.get('/leave/my', protect, studentOnly, getMyLeaves);
router.get('/leave/class', protect, teacherOnly, getClassLeaves);
router.put('/leave/:id/review', protect, teacherOnly, reviewLeave);

// Attendance disputes
router.post('/dispute', protect, studentOnly, submitDispute);
router.get('/dispute/my', protect, studentOnly, getMyDisputes);
router.get('/dispute/class', protect, teacherOnly, getClassDisputes);
router.put('/dispute/:id/review', protect, teacherOnly, reviewDispute);

module.exports = router;
