const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_USER) {
    console.log('[Email skipped - no config]', subject, 'to', to);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"Smart Classroom" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error('Email error:', err.message);
  }
};

const emailTemplates = {
  classReminder: (studentName, subject, room, time) => ({
    subject: `Reminder: ${subject} class in 30 minutes`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:auto">
      <h2 style="color:#4f46e5">📚 Class Reminder</h2>
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>Your <strong>${subject}</strong> class starts in <strong>30 minutes</strong>.</p>
      <p>📍 Location: <strong>${room}</strong></p>
      <p>⏰ Time: <strong>${time}</strong></p>
      <p>Don't forget to mark your attendance!</p>
    </div>`,
  }),

  attendanceConfirmed: (studentName, subject, status, time) => ({
    subject: `✅ Attendance Marked - ${subject}`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:auto">
      <h2 style="color:#16a34a">✅ Attendance Confirmed</h2>
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>Your attendance for <strong>${subject}</strong> has been marked as <strong>${status}</strong>.</p>
      <p>⏰ Marked at: <strong>${time}</strong></p>
    </div>`,
  }),

  absentAlert: (studentName, subject, date) => ({
    subject: `❌ Absent - ${subject} on ${date}`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:auto">
      <h2 style="color:#dc2626">❌ Absent Alert</h2>
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>You were marked <strong>absent</strong> for <strong>${subject}</strong> on <strong>${date}</strong>.</p>
      <p>If you have a valid reason, please submit it through the portal.</p>
    </div>`,
  }),

  dailySummary: (studentName, present, absent, late, total) => ({
    subject: `📊 Daily Attendance Summary`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:auto">
      <h2 style="color:#4f46e5">📊 Daily Summary</h2>
      <p>Hi <strong>${studentName}</strong>, here's your attendance for today:</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px;border:1px solid #e5e7eb">Present</td><td style="padding:8px;border:1px solid #e5e7eb;color:#16a34a"><strong>${present}</strong></td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb">Late</td><td style="padding:8px;border:1px solid #e5e7eb;color:#d97706"><strong>${late}</strong></td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb">Absent</td><td style="padding:8px;border:1px solid #e5e7eb;color:#dc2626"><strong>${absent}</strong></td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb">Total Classes</td><td style="padding:8px;border:1px solid #e5e7eb"><strong>${total}</strong></td></tr>
      </table>
    </div>`,
  }),
};

module.exports = { sendEmail, emailTemplates };
