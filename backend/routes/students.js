const router = require('express').Router();
const { getAllStudents, getStudentById, updateStudent, saveFaceDescriptor, deleteStudent, updateNotificationPreferences } = require('../controllers/studentController');
const { protect, teacherOnly, studentOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', protect, teacherOnly, getAllStudents);
router.get('/:id', protect, getStudentById);
router.put('/notification-preferences', protect, studentOnly, updateNotificationPreferences);
router.put('/:id', protect, upload.single('photo'), updateStudent);
router.put('/:id/face-descriptor', protect, saveFaceDescriptor);
router.delete('/:id', protect, teacherOnly, deleteStudent);

module.exports = router;
