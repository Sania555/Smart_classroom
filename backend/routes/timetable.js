const router = require('express').Router();
const { createTimetable, getTimetable, getMyTimetable, getTodayClasses, updateTimetable, deleteTimetable } = require('../controllers/timetableController');
const { protect, teacherOnly } = require('../middleware/auth');

router.get('/my', protect, getMyTimetable);
router.get('/today', protect, getTodayClasses);
router.get('/', protect, getTimetable);
router.post('/', protect, teacherOnly, createTimetable);
router.put('/:id', protect, teacherOnly, updateTimetable);
router.delete('/:id', protect, teacherOnly, deleteTimetable);

module.exports = router;
