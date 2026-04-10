const Attendance = require('../models/Attendance');
const Timetable = require('../models/Timetable');
const Student = require('../models/Student');
const OTP = require('../models/OTP');
const { notifyStudent, notifyTeacher } = require('../services/notificationService');

const timeToMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

exports.markAttendance = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { timetableId, method, faceMatchScore: rawScore, location, otp, liveDescriptor, selfieSnapshot, qrToken } = req.body;
    let faceMatchScore = rawScore;
    const studentId = req.userId;

    const cls = await Timetable.findById(timetableId);
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const startMins = timeToMinutes(cls.startTime);
    const diff = currentMins - startMins;

    // Time window: -10 to +15 minutes
    if (diff < -10) return res.status(400).json({ message: 'Attendance window not open yet. Opens 10 minutes before class.' });
    if (diff > 15) return res.status(400).json({ message: 'Attendance window closed. You have been marked absent.' });

    const status = diff <= 0 ? 'present' : diff <= 15 ? 'late' : 'absent';

    // GPS validation — required if teacher set a location
    let locationValid = false;
    if (cls.location?.latitude && cls.location?.longitude) {
      if (!location) {
        return res.status(400).json({ message: 'Location is required for this class. Please enable GPS and try again.' });
      }
      const dist = getDistanceMeters(location.latitude, location.longitude, cls.location.latitude, cls.location.longitude);
      locationValid = dist <= 200;
      if (!locationValid) {
        // Mark student absent for being outside radius
        const today2 = new Date(now); today2.setHours(0, 0, 0, 0);
        await Attendance.findOneAndUpdate(
          { studentId, timetableId, date: today2 },
          { status: 'absent', method, markedAt: now, location, locationValid: false, faceMatchScore: 0 },
          { upsert: true, new: true }
        );
        const teacher = await require('../models/Teacher').findById(cls.teacherId);
        if (teacher) {
          await notifyTeacher(io, teacher, 'teacher_alert',
            `📍 Location Mismatch`,
            `A student is outside classroom radius for ${cls.subject} (${Math.round(dist)}m away). Marked absent.`,
            { studentId, timetableId, distance: Math.round(dist) }
          );
        }
        return res.status(400).json({ message: `You are ${Math.round(dist)}m away from the classroom. Must be within 200m. Marked absent.` });
      }
    }

    // Cooldown: 60 seconds between failed attempts
    const cooldownRecord = await Attendance.findOne({ studentId, timetableId, date: today });
    if (cooldownRecord?.lastAttemptAt) {
      const secsSince = (now - new Date(cooldownRecord.lastAttemptAt)) / 1000;
      if (secsSince < 60 && cooldownRecord.failedAttempts >= 3) {
        return res.status(429).json({ message: `Too many failed attempts. Please wait ${Math.ceil(60 - secsSince)} seconds.` });
      }
    }

    // QR validation
    if (method === 'qr') {
      if (!qrToken) return res.status(400).json({ message: 'QR token missing' });
      const qrRecord = await OTP.findOne({ timetableId, otp: qrToken, date: today, isUsed: false, isQR: true });
      if (!qrRecord || qrRecord.expiresAt < now) {
        return res.status(400).json({ message: 'Invalid or expired QR code' });
      }
      // QR is shared — don't mark as used (multiple students can scan)
    }

    // OTP validation
    if (method === 'otp') {
      const otpRecord = await OTP.findOne({ timetableId, otp, date: today, isUsed: false });
      if (!otpRecord || otpRecord.expiresAt < now) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }
      await OTP.findByIdAndUpdate(otpRecord._id, { isUsed: true });
    }

    // Face validation — backend independently re-verifies using stored descriptor
    if (method === 'face') {
      const student = await Student.findById(studentId);

      if (!student.faceDescriptor || student.faceDescriptor.length === 0) {
        return res.status(400).json({ message: 'Face not registered. Please register your face first or use OTP.' });
      }

      // If live descriptor sent, do server-side euclidean distance check
      if (liveDescriptor && Array.isArray(liveDescriptor) && liveDescriptor.length === 128) {
        const stored = new Float32Array(student.faceDescriptor);
        const live = new Float32Array(liveDescriptor);

        // Compute euclidean distance server-side
        let sum = 0;
        for (let i = 0; i < stored.length; i++) {
          sum += (stored[i] - live[i]) ** 2;
        }
        const distance = Math.sqrt(sum);
        const serverScore = Math.max(0, 1 - distance);

        console.log(`Server face check — distance: ${distance.toFixed(3)}, score: ${(serverScore * 100).toFixed(1)}%`);

        if (distance >= 0.5) {
          // Track failed attempt for cooldown
          await Attendance.findOneAndUpdate(
            { studentId, timetableId, date: today },
            { $inc: { failedAttempts: 1 }, lastAttemptAt: now },
            { upsert: true }
          );
          // Alert teacher about failed attempt
          const teacher = await require('../models/Teacher').findById(cls.teacherId);
          if (teacher) {
            await notifyTeacher(io, teacher, 'teacher_alert',
              `🚨 Proxy Attendance Attempt`,
              `Face verification FAILED for a student in ${cls.subject}. Distance: ${distance.toFixed(2)}. Possible proxy attendance.`,
              { studentId, timetableId, distance, score: serverScore }
            );
          }
          return res.status(400).json({
            message: `Face verification failed (distance: ${distance.toFixed(2)}). This attempt has been logged and your teacher has been notified.`
          });
        }

        // Warn teacher if borderline match
        if (distance >= 0.4) {
          const teacher = await require('../models/Teacher').findById(cls.teacherId);
          if (teacher) {
            await notifyTeacher(io, teacher, 'teacher_alert',
              `⚠️ Low Face Match`,
              `Low confidence face match (distance: ${distance.toFixed(2)}) for a student in ${cls.subject}.`,
              { studentId, timetableId, distance, score: serverScore }
            );
          }
        }

        faceMatchScore = serverScore; // use server-computed score for storage
      } else {
        // No live descriptor sent — reject, don't trust client-only score
        return res.status(400).json({ message: 'Face descriptor missing. Please try again.' });
      }
    }

    const existing = await Attendance.findOne({ studentId, timetableId, date: today });
    if (existing && existing.status !== 'absent') {
      return res.status(400).json({ message: 'Attendance already marked' });
    }

    const attendance = await Attendance.findOneAndUpdate(
      { studentId, timetableId, date: today },
      { status, method, markedAt: now, location, locationValid, faceMatchScore: faceMatchScore || 0, selfieSnapshot: selfieSnapshot || '', failedAttempts: 0, lastAttemptAt: now },
      { upsert: true, new: true }
    );

    const student = await Student.findById(studentId);
    await notifyStudent(io, student, 'attendance_confirmed',
      `✅ Attendance Marked: ${cls.subject}`,
      `Your attendance for ${cls.subject} has been marked as ${status} at ${now.toLocaleTimeString()}.`,
      { timetableId, subject: cls.subject, status, time: now.toISOString() }
    );

    res.json({ attendance, status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAttendanceByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { days = 30 } = req.query;
    const from = new Date(); from.setDate(from.getDate() - parseInt(days));

    const records = await Attendance.find({ studentId, date: { $gte: from } })
      .populate('timetableId', 'subject startTime endTime classroom dayOfWeek')
      .sort({ date: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAttendanceByClass = async (req, res) => {
  try {
    const { timetableId } = req.params;
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const cls = await Timetable.findById(timetableId);
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    const students = await Student.find({ class: cls.class, section: cls.section, isActive: true }).select('-password -faceDescriptor');
    const records = await Attendance.find({ timetableId, date: targetDate });

    const result = students.map((s) => {
      const record = records.find((r) => r.studentId.toString() === s._id.toString());
      return {
        student: s,
        status: record?.status || 'absent',
        markedAt: record?.markedAt || null,
        method: record?.method || null,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAttendanceStats = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.userId;
    const records = await Attendance.find({ studentId }).populate('timetableId', 'subject');

    const subjectMap = {};
    for (const r of records) {
      const subj = r.timetableId?.subject || 'Unknown';
      if (!subjectMap[subj]) subjectMap[subj] = { present: 0, late: 0, absent: 0, total: 0 };
      subjectMap[subj][r.status]++;
      subjectMap[subj].total++;
    }

    const stats = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      ...data,
      percentage: Math.round(((data.present + data.late) / data.total) * 100),
    }));

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.submitAbsentReason = async (req, res) => {
  try {
    const { attendanceId, reason } = req.body;
    const record = await Attendance.findByIdAndUpdate(attendanceId, { absentReason: reason }, { new: true });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.generateOTP = async (req, res) => {
  try {
    const { timetableId } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 20 * 60 * 1000); // 20 min
    const today = new Date(now); today.setHours(0, 0, 0, 0);

    await OTP.findOneAndDelete({ timetableId, date: today });
    const otpRecord = await OTP.create({ timetableId, teacherId: req.userId, otp, date: today, expiresAt });

    res.json({ otp: otpRecord.otp, expiresAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.generateQR = async (req, res) => {
  try {
    const QRCode = require('qrcode');
    const { timetableId } = req.body;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 20 * 60 * 1000);
    const today = new Date(now); today.setHours(0, 0, 0, 0);

    // Reuse OTP record as QR token
    const token = require('uuid').v4();
    await OTP.findOneAndDelete({ timetableId, date: today });
    await OTP.create({ timetableId, teacherId: req.userId, otp: token, date: today, expiresAt, isQR: true });

    const qrData = JSON.stringify({ timetableId, token, expiresAt });
    const qrImage = await QRCode.toDataURL(qrData);
    res.json({ qrImage, token, expiresAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.manualMarkAttendance = async (req, res) => {
  try {
    const { studentId, timetableId, status, date } = req.body;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const record = await Attendance.findOneAndUpdate(
      { studentId, timetableId, date: targetDate },
      { status, method: 'manual', markedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAttendanceHeatmap = async (req, res) => {
  try {
    const studentId = req.userId;
    const { months = 3 } = req.query;
    const from = new Date();
    from.setMonth(from.getMonth() - parseInt(months));

    const records = await Attendance.find({ studentId, date: { $gte: from } })
      .populate('timetableId', 'subject')
      .select('date status timetableId');

    // Group by date
    const map = {};
    for (const r of records) {
      const key = r.date.toISOString().split('T')[0];
      if (!map[key]) map[key] = { date: key, present: 0, late: 0, absent: 0, total: 0 };
      map[key][r.status]++;
      map[key].total++;
    }
    res.json(Object.values(map));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getSubjectTrend = async (req, res) => {
  try {
    const { class: cls, section } = req.query;
    const timetables = await Timetable.find({ teacherId: req.userId, isActive: true, ...(cls && { class: cls }), ...(section && { section }) });

    const result = [];
    for (const t of timetables) {
      const records = await Attendance.find({ timetableId: t._id }).sort({ date: 1 });
      const byDate = {};
      for (const r of records) {
        const key = r.date.toISOString().split('T')[0];
        if (!byDate[key]) byDate[key] = { date: key, present: 0, total: 0 };
        if (r.status !== 'absent') byDate[key].present++;
        byDate[key].total++;
      }
      result.push({ subject: t.subject, timetableId: t._id, trend: Object.values(byDate) });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.sendBulkReminder = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { timetableId, date } = req.body;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const cls = await Timetable.findById(timetableId);
    const students = await Student.find({ class: cls.class, section: cls.section, isActive: true });
    const records = await Attendance.find({ timetableId, date: targetDate });
    const markedIds = records.filter(r => r.status !== 'absent').map(r => r.studentId.toString());

    const absent = students.filter(s => !markedIds.includes(s._id.toString()));
    for (const student of absent) {
      await notifyStudent(io, student, 'attendance_reminder',
        `⏰ Attendance Reminder`,
        `Please mark your attendance for ${cls.subject} class.`,
        { timetableId }
      );
    }

    res.json({ sent: absent.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
