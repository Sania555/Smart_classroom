const LeaveRequest = require('../models/LeaveRequest');
const AttendanceDispute = require('../models/AttendanceDispute');
const Attendance = require('../models/Attendance');
const Timetable = require('../models/Timetable');
const { notifyTeacher, notifyStudent } = require('../services/notificationService');

// ── Leave Requests ──────────────────────────────────────────────

exports.submitLeave = async (req, res) => {
  try {
    const { timetableId, date, reason } = req.body;
    const existing = await LeaveRequest.findOne({ studentId: req.userId, timetableId, date: new Date(date) });
    if (existing) return res.status(400).json({ message: 'Leave already submitted for this class' });

    const leave = await LeaveRequest.create({ studentId: req.userId, timetableId, date: new Date(date), reason });

    const cls = await Timetable.findById(timetableId);
    const Teacher = require('../models/Teacher');
    const teacher = cls ? await Teacher.findById(cls.teacherId) : null;
    if (teacher) {
      const io = req.app.get('io');
      await notifyTeacher(io, teacher, 'teacher_alert',
        '📋 Leave Request',
        `A student has submitted a leave request for ${cls.subject} on ${new Date(date).toLocaleDateString()}.`,
        { leaveId: leave._id, timetableId }
      );
    }
    res.status(201).json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ studentId: req.userId })
      .populate('timetableId', 'subject startTime classroom')
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getClassLeaves = async (req, res) => {
  try {
    const timetables = await Timetable.find({ teacherId: req.userId, isActive: true });
    const ids = timetables.map(t => t._id);
    const leaves = await LeaveRequest.find({ timetableId: { $in: ids } })
      .populate('studentId', 'name rollNumber class section')
      .populate('timetableId', 'subject startTime classroom')
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.reviewLeave = async (req, res) => {
  try {
    const { status, teacherComment } = req.body;
    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status, teacherComment, reviewedBy: req.userId, reviewedAt: new Date() },
      { new: true }
    ).populate('studentId').populate('timetableId', 'subject');

    const io = req.app.get('io');
    const Student = require('../models/Student');
    const student = await Student.findById(leave.studentId);
    if (student) {
      await notifyStudent(io, student, 'attendance_confirmed',
        `📋 Leave ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        `Your leave request for ${leave.timetableId?.subject} has been ${status}.${teacherComment ? ' Comment: ' + teacherComment : ''}`,
        { leaveId: leave._id }
      );
    }
    res.json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Attendance Disputes ─────────────────────────────────────────

exports.submitDispute = async (req, res) => {
  try {
    const { attendanceId, reason } = req.body;
    const attendance = await Attendance.findById(attendanceId).populate('timetableId');
    if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });

    const existing = await AttendanceDispute.findOne({ attendanceId });
    if (existing) return res.status(400).json({ message: 'Dispute already submitted for this record' });

    const dispute = await AttendanceDispute.create({
      studentId: req.userId,
      attendanceId,
      timetableId: attendance.timetableId._id,
      date: attendance.date,
      reason,
    });

    const Teacher = require('../models/Teacher');
    const teacher = await Teacher.findById(attendance.timetableId.teacherId);
    if (teacher) {
      const io = req.app.get('io');
      await notifyTeacher(io, teacher, 'teacher_alert',
        '⚠️ Attendance Dispute',
        `A student has raised a dispute for ${attendance.timetableId.subject} on ${new Date(attendance.date).toLocaleDateString()}.`,
        { disputeId: dispute._id }
      );
    }
    res.status(201).json(dispute);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyDisputes = async (req, res) => {
  try {
    const disputes = await AttendanceDispute.find({ studentId: req.userId })
      .populate('timetableId', 'subject startTime')
      .populate('attendanceId', 'status date')
      .sort({ createdAt: -1 });
    res.json(disputes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getClassDisputes = async (req, res) => {
  try {
    const timetables = await Timetable.find({ teacherId: req.userId, isActive: true });
    const ids = timetables.map(t => t._id);
    const disputes = await AttendanceDispute.find({ timetableId: { $in: ids } })
      .populate('studentId', 'name rollNumber class section')
      .populate('timetableId', 'subject startTime')
      .populate('attendanceId', 'status date')
      .sort({ createdAt: -1 });
    res.json(disputes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.reviewDispute = async (req, res) => {
  try {
    const { status, teacherComment } = req.body;
    const dispute = await AttendanceDispute.findByIdAndUpdate(
      req.params.id,
      { status, teacherComment, reviewedBy: req.userId, reviewedAt: new Date() },
      { new: true }
    ).populate('studentId').populate('timetableId', 'subject');

    // If approved, update attendance to present
    if (status === 'approved') {
      await Attendance.findByIdAndUpdate(dispute.attendanceId, { status: 'present', method: 'manual' });
    }

    const io = req.app.get('io');
    const Student = require('../models/Student');
    const student = await Student.findById(dispute.studentId);
    if (student) {
      await notifyStudent(io, student, 'attendance_confirmed',
        `⚠️ Dispute ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        `Your attendance dispute for ${dispute.timetableId?.subject} has been ${status}.${teacherComment ? ' Comment: ' + teacherComment : ''}`,
        { disputeId: dispute._id }
      );
    }
    res.json(dispute);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
