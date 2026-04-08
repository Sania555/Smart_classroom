const Notification = require('../models/Notification');
const { sendEmail, emailTemplates } = require('./emailService');
const { sendPushNotification } = require('./pushService');

const createNotification = async (io, { userId, userType, type, title, message, metadata = {} }) => {
  const notif = await Notification.create({ userId, userType, type, title, message, metadata });
  // Emit real-time via socket
  if (io) io.to(userId.toString()).emit('notification', notif);
  return notif;
};

const notifyStudent = async (io, student, type, title, message, metadata = {}) => {
  await createNotification(io, { userId: student._id, userType: 'student', type, title, message, metadata });

  if (student.notificationPreferences?.push && student.pushSubscription) {
    await sendPushNotification(student.pushSubscription, { title, body: message, data: metadata });
  }

  if (student.notificationPreferences?.email && student.email) {
    await sendEmail({ to: student.email, subject: title, html: `<p>${message}</p>` });
  }
};

const notifyTeacher = async (io, teacher, type, title, message, metadata = {}) => {
  await createNotification(io, { userId: teacher._id, userType: 'teacher', type, title, message, metadata });

  if (teacher.notificationPreferences?.push && teacher.pushSubscription) {
    await sendPushNotification(teacher.pushSubscription, { title, body: message, data: metadata });
  }

  if (teacher.notificationPreferences?.email && teacher.email) {
    await sendEmail({ to: teacher.email, subject: title, html: `<p>${message}</p>` });
  }
};

module.exports = { createNotification, notifyStudent, notifyTeacher };
