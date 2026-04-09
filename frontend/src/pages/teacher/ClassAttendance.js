import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import styles from './ClassAttendance.module.css';

const statusColor = { present: '#16a34a', late: '#d97706', absent: '#dc2626' };

export default function ClassAttendance() {
  const { id } = useParams();
  const [records, setRecords] = useState([]);
  const [cls, setCls] = useState(null);
  const [otp, setOtp] = useState(null);
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [attRes, clsRes] = await Promise.all([
        api.get(`/attendance/class/${id}?date=${date}`),
        api.get(`/timetable/my`),
      ]);
      setRecords(attRes.data);
      const found = clsRes.data.find(c => c._id === id);
      setCls(found);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id, date]);

  const generateOTP = async () => {
    try {
      const { data } = await api.post('/attendance/otp/generate', { timetableId: id });
      setOtp(data);
      setQr(null);
      toast.success(`OTP: ${data.otp}`);
    } catch { toast.error('Failed to generate OTP'); }
  };

  const generateQR = async () => {
    try {
      const { data } = await api.post('/attendance/qr/generate', { timetableId: id });
      setQr(data);
      setOtp(null);
      toast.success('QR code generated');
    } catch { toast.error('Failed to generate QR'); }
  };

  const sendReminder = async () => {
    try {
      const { data } = await api.post('/attendance/bulk-reminder', { timetableId: id, date });
      toast.success(`Reminder sent to ${data.sent} students`);
    } catch { toast.error('Failed to send reminders'); }
  };

  const manualMark = async (studentId, status) => {
    try {
      await api.post('/attendance/manual', { studentId, timetableId: id, status, date });
      toast.success(`Marked ${status}`);
      fetchData();
    } catch { toast.error('Failed to mark attendance'); }
  };

  const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const absent = records.filter(r => r.status === 'absent').length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h2>{cls?.subject || 'Class Attendance'}</h2>
          <p>{cls?.startTime} – {cls?.endTime} · {cls?.classroom} · Class {cls?.class}{cls?.section}</p>
        </div>
        <input type="date" className={styles.dateInput} value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryItem} style={{ color: '#16a34a' }}>✅ Present: {present}</div>
        <div className={styles.summaryItem} style={{ color: '#dc2626' }}>❌ Absent: {absent}</div>
        <div className={styles.summaryItem} style={{ color: '#64748b' }}>Total: {records.length}</div>
      </div>

      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={generateOTP}>🔑 Generate OTP</button>
        <button className={styles.actionBtn} onClick={generateQR}>📱 Generate QR</button>
        <button className={`${styles.actionBtn} ${styles.reminderBtn}`} onClick={sendReminder}>📢 Send Reminders</button>
      </div>

      {otp && (
        <div className={styles.otpDisplay}>
          <span>OTP: <strong>{otp.otp}</strong></span>
          <span>Expires: {new Date(otp.expiresAt).toLocaleTimeString()}</span>
        </div>
      )}

      {qr && (
        <div className={styles.qrDisplay}>
          <p>Show this QR to students — expires {new Date(qr.expiresAt).toLocaleTimeString()}</p>
          <img src={qr.qrImage} alt="QR Code" className={styles.qrImage} />
        </div>
      )}

      {loading ? <div className={styles.loading}>Loading...</div> : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Student</span><span>Roll No</span><span>Status</span><span>Method</span><span>Time</span><span>Actions</span>
          </div>
          {records.map(({ student, status, markedAt, method }) => (
            <div key={student._id} className={styles.tableRow}>
              <span className={styles.studentName}>{student.name}</span>
              <span>{student.rollNumber}</span>
              <span>
                <span className={styles.statusBadge} style={{ background: statusColor[status] }}>{status}</span>
              </span>
              <span>{method || '—'}</span>
              <span>{markedAt ? new Date(markedAt).toLocaleTimeString() : '—'}</span>
              <span className={styles.manualBtns}>
                {['present', 'late', 'absent'].map(s => (
                  <button key={s} className={`${styles.manualBtn} ${status === s ? styles.activeManual : ''}`}
                    style={{ '--c': statusColor[s] }} onClick={() => manualMark(student._id, s)}>
                    {s[0].toUpperCase()}
                  </button>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
