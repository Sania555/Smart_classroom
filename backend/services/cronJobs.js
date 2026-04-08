const cron = require('node-cron');
const Timetable = require('../models/Timetable');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const { notifyStudent, notifyTeacher } = require('./notificationService');
const { sendEmail, emailTemplates } = require('./emailService');

const getDayName = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
};

const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const getCurrentMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

module.exports = (io) => {
  // Every minute: check for class reminders and attendance windows
  cron.schedule('* * * * *', async () => {
    try {
      const day = getDayName();
      if (day === 'Sunday' || day === 'Saturday') return;

      const currentMins = getCurrentMinutes();
      const classes = await Timetable.find({ dayOfWeek: day, isActive: true });

      for (const cls of classes) {
        const startMins = timeToMinutes(cls.startTime);
        const diff = startMins - currentMins;

        // 30 min before: class reminder
        if (diff === 30) {
          const students = await Student.find({ class: cls.class, section: cls.section, isActive: true });
          const teacher = await Teacher.findById(cls.teacherId);

          for (const student of students) {
            await notifyStudent(io, student, 'class_reminder',
              `📚 Class Reminder: ${cls.subject}`,
              `Your ${cls.subject} class starts in 30 minutes at ${cls.classroom}. Don't forget to mark your attendance!`,
              { timetableId: cls._id, subject: cls.subject, room: cls.classroom, time: cls.startTime }
            );
          }
          if (teacher) {
            await notifyTeacher(io, teacher, 'class_reminder',
              `📚 Upcoming Class: ${cls.subject}`,
              `Your ${cls.subject} class starts in 30 minutes at ${cls.classroom}.`,
              { timetableId: cls._id }
            );
          }
        }

        // 5 min after class starts: attendance reminder
        if (currentMins - startMins === 5) {
          const students = await Student.find({ class: cls.class, section: cls.section, isActive: true });
          const today = new Date(); today.setHours(0, 0, 0, 0);

          for (const student of students) {
            const existing = await Attendance.findOne({ studentId: student._id, timetableId: cls._id, date: today });
            if (!existing || existing.status === 'absent') {
              await notifyStudent(io, student, 'attendance_reminder',
                `⏰ Mark Attendance: ${cls.subject}`,
                `Your ${cls.subject} class started 5 minutes ago. Please mark your attendance now! Window closes in 10 minutes.`,
                { timetableId: cls._id, subject: cls.subject }
              );
            }
          }
        }

        // 10 min after class starts: late warning
        if (currentMins - startMins === 10) {
          const students = await Student.find({ class: cls.class, section: cls.section, isActive: true });
          const today = new Date(); today.setHours(0, 0, 0, 0);

          for (const student of students) {
            const existing = await Attendance.findOne({ studentId: student._id, timetableId: cls._id, date: today });
            if (!existing || existing.status === 'absent') {
              await notifyStudent(io, student, 'late_warning',
                `⚠️ Attendance Window Closing!`,
                `⚠️ Attendance window for ${cls.subject} closes in 5 minutes. Mark your attendance immediately!`,
                { timetableId: cls._id, subject: cls.subject }
              );
            }
          }
        }

        // 15 min after class starts: mark remaining as absent
        if (currentMins - startMins === 15) {
          const students = await Student.find({ class: cls.class, section: cls.section, isActive: true });
          const today = new Date(); today.setHours(0, 0, 0, 0);

          for (const student of students) {
            const existing = await Attendance.findOne({ studentId: student._id, timetableId: cls._id, date: today });
            if (!existing) {
              await Attendance.create({
                studentId: student._id,
                timetableId: cls._id,
                date: today,
                status: 'absent',
              });
              await notifyStudent(io, student, 'absent_alert',
                `❌ Marked Absent: ${cls.subject}`,
                `You were marked absent for ${cls.subject} class. If you have a valid reason, please submit it through the portal.`,
                { timetableId: cls._id, subject: cls.subject }
              );
              // Notify parent via email
              if (student.parentEmail) {
                await sendEmail({
                  to: student.parentEmail,
                  subject: `Absent Alert: ${student.name} - ${cls.subject}`,
                  html: `<p>Dear Parent, <strong>${student.name}</strong> was marked absent for <strong>${cls.subject}</strong> class today.</p>`,
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Cron minute error:', err.message);
    }
  });

  // Daily 8:00 AM: send daily schedule
  cron.schedule('0 8 * * 1-5', async () => {
    try {
      const day = getDayName();
      const classes = await Timetable.find({ dayOfWeek: day, isActive: true });
      const studentMap = {};

      for (const cls of classes) {
        const key = `${cls.class}-${cls.section}`;
        if (!studentMap[key]) {
          studentMap[key] = await Student.find({ class: cls.class, section: cls.section, isActive: true });
        }
        for (const student of studentMap[key]) {
          await notifyStudent(io, student, 'class_reminder',
            `📅 Today's Schedule`,
            `You have ${cls.subject} at ${cls.startTime} in ${cls.classroom}.`,
            { timetableId: cls._id }
          );
        }
      }
    } catch (err) {
      console.error('Cron 8AM error:', err.message);
    }
  });

  // Daily 6:00 PM: send daily attendance summary
  cron.schedule('0 18 * * 1-5', async () => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const students = await Student.find({ isActive: true });

      for (const student of students) {
        const records = await Attendance.find({ studentId: student._id, date: today });
        const present = records.filter(r => r.status === 'present').length;
        const late = records.filter(r => r.status === 'late').length;
        const absent = records.filter(r => r.status === 'absent').length;
        const total = records.length;

        if (total > 0) {
          await notifyStudent(io, student, 'daily_summary',
            `📊 Daily Attendance Summary`,
            `Today: Present: ${present}, Late: ${late}, Absent: ${absent} out of ${total} classes.`,
            { present, late, absent, total }
          );
          if (student.notificationPreferences?.email) {
            const tmpl = emailTemplates.dailySummary(student.name, present, absent, late, total);
            await sendEmail({ to: student.email, ...tmpl });
          }
        }
      }
    } catch (err) {
      console.error('Cron 6PM error:', err.message);
    }
  });

  // Weekly Monday 7:00 AM: weekly report
  cron.schedule('0 7 * * 1', async () => {
    try {
      const today = new Date();
      const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
      const students = await Student.find({ isActive: true });

      for (const student of students) {
        const records = await Attendance.find({ studentId: student._id, date: { $gte: weekAgo, $lte: today } });
        const present = records.filter(r => r.status === 'present').length;
        const late = records.filter(r => r.status === 'late').length;
        const absent = records.filter(r => r.status === 'absent').length;
        const pct = records.length ? Math.round(((present + late) / records.length) * 100) : 0;

        await notifyStudent(io, student, 'weekly_report',
          `📈 Weekly Attendance Report`,
          `This week: ${present} present, ${late} late, ${absent} absent. Attendance: ${pct}%`,
          { present, late, absent, percentage: pct }
        );
      }
    } catch (err) {
      console.error('Cron weekly error:', err.message);
    }
  });

  console.log('Cron jobs started');
};
