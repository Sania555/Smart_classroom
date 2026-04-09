import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import styles from './LeaveRequest.module.css';

const statusColor = { pending: '#d97706', approved: '#16a34a', rejected: '#dc2626' };

export default function StudentLeave() {
  const { user } = useAuth();
  const [tab, setTab] = useState('leave');
  const [leaves, setLeaves] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ timetableId: '', date: '', reason: '' });
  const [disputeForm, setDisputeForm] = useState({ attendanceId: '', reason: '' });
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  useEffect(() => {
    api.get('/leave/leave/my').then(r => setLeaves(r.data));
    api.get('/leave/dispute/my').then(r => setDisputes(r.data));
    api.get('/timetable/my').then(r => setClasses(r.data));
    if (user?._id) {
      api.get(`/attendance/student/${user._id}?days=90`).then(r => setAttendance(r.data)).catch(() => {});
    }
  }, [user?._id]);

  const submitLeave = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/leave/leave', form);
      setLeaves(prev => [data, ...prev]);
      setShowForm(false);
      setForm({ timetableId: '', date: '', reason: '' });
      toast.success('Leave request submitted');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const submitDispute = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/leave/dispute', disputeForm);
      setDisputes(prev => [data, ...prev]);
      setShowDisputeForm(false);
      setDisputeForm({ attendanceId: '', reason: '' });
      toast.success('Dispute submitted');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>📋 Leave & Disputes</h2>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'leave' ? styles.active : ''}`} onClick={() => setTab('leave')}>Leave Requests</button>
        <button className={`${styles.tab} ${tab === 'dispute' ? styles.active : ''}`} onClick={() => setTab('dispute')}>Attendance Disputes</button>
      </div>

      {tab === 'leave' && (
        <>
          <button className={styles.addBtn} onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ New Leave Request'}
          </button>
          {showForm && (
            <form className={styles.form} onSubmit={submitLeave}>
              <select className={styles.input} required value={form.timetableId} onChange={e => setForm(f => ({ ...f, timetableId: e.target.value }))}>
                <option value="">Select Class</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.subject} — {c.dayOfWeek} {c.startTime}</option>)}
              </select>
              <input className={styles.input} type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              <textarea className={styles.textarea} placeholder="Reason for leave..." required rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
              <button className={styles.submitBtn} type="submit">Submit Leave</button>
            </form>
          )}
          <div className={styles.list}>
            {leaves.length === 0 ? <div className={styles.empty}>No leave requests</div> : leaves.map(l => (
              <div key={l._id} className={styles.item}>
                <div className={styles.itemInfo}>
                  <strong>{l.timetableId?.subject}</strong>
                  <span>{new Date(l.date).toLocaleDateString()} · {l.timetableId?.startTime}</span>
                  <span className={styles.reason}>{l.reason}</span>
                  {l.teacherComment && <span className={styles.comment}>Teacher: {l.teacherComment}</span>}
                </div>
                <span className={styles.badge} style={{ background: statusColor[l.status] }}>{l.status}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'dispute' && (
        <>
          <button className={styles.addBtn} onClick={() => setShowDisputeForm(!showDisputeForm)}>
            {showDisputeForm ? '✕ Cancel' : '+ Raise Dispute'}
          </button>
          {showDisputeForm && (
            <form className={styles.form} onSubmit={submitDispute}>
              <select className={styles.input} required value={disputeForm.attendanceId} onChange={e => setDisputeForm(f => ({ ...f, attendanceId: e.target.value }))}>
                <option value="">Select Absent Record</option>
                {attendance.filter(a => a.status === 'absent').map(a => (
                  <option key={a._id} value={a._id}>
                    {a.timetableId?.subject} — {new Date(a.date).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <textarea className={styles.textarea} placeholder="Reason for dispute..." required rows={3} value={disputeForm.reason} onChange={e => setDisputeForm(f => ({ ...f, reason: e.target.value }))} />
              <button className={styles.submitBtn} type="submit">Submit Dispute</button>
            </form>
          )}
          <div className={styles.list}>
            {disputes.length === 0 ? <div className={styles.empty}>No disputes</div> : disputes.map(d => (
              <div key={d._id} className={styles.item}>
                <div className={styles.itemInfo}>
                  <strong>{d.timetableId?.subject}</strong>
                  <span>{new Date(d.date).toLocaleDateString()}</span>
                  <span className={styles.reason}>{d.reason}</span>
                  {d.teacherComment && <span className={styles.comment}>Teacher: {d.teacherComment}</span>}
                </div>
                <span className={styles.badge} style={{ background: statusColor[d.status] }}>{d.status}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
