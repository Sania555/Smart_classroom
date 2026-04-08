const router = require('express').Router();
const { registerStudent, registerTeacher, login, getMe, updatePushSubscription } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/register/student', upload.single('photo'), registerStudent);
router.post('/register/teacher', registerTeacher);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/push-subscription', protect, updatePushSubscription);

module.exports = router;
