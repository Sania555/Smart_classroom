import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import styles from './Timetable.module.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const empty = { subject: '', class: '', section: 'A', dayOfWeek: 'Monday', startTime: '', endTime: '', duration: 60, classroom: '', location: { latitude: 0, longitude: 0 } };

// "08:30" → { hour: "08", minute: "30", period: "AM" }
function to12h(time24) {
  if (!time24) return { hour: '08', minute: '00', period: 'AM' };
  const [h, m] = time24.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? '12' : String(h % 12).padStart(2, '0');
  return { hour, minute: String(m).padStart(2, '0'), period };
}

// { hour: "08", minute: "30", period: "AM" } → "08:30"
function to24h({ hour, minute, period }) {
  let h = parseInt(hour, 10);
  if (period === 'AM' && h === 12) h = 0;
  if (period === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${minute}`;
}

// "08:30" → "8:30 AM"
function formatTime(time24) {
  if (!time24) return '';
  const { hour, minute, period } = to12h(time24);
  return `${parseInt(hour, 10)}:${minute} ${period}`;
}

function TimePicker({ value, onChange, label }) {
  const { hour, minute, period } = to12h(value);
  const update = (field, val) => {
    const updated = { hour, minute, period, [field]: val };
    onChange(to24h(updated));
  };
  return (
    <div className={styles.timePicker}>
      <label className={styles.timeLabel}>{label}</label>
      <div className={styles.timeInputs}>
        <select className={styles.timeSelect} value={hour} onChange={e => update('hour', e.target.value)}>
          {HOURS.map(h => <option key={h}>{h}</option>)}
        </select>
        <span className={styles.timeSep}>:</span>
        <select className={styles.timeSelect} value={minute} onChange={e => update('minute', e.target.value)}>
          {MINUTES.map(m => <option key={m}>{m}</option>)}
        </select>
        <select className={styles.periodSelect} value={period} onChange={e => update('period', e.target.value)}>
          <option>AM</option>
          <option>PM</option>
        </select>
      </div>
    </div>
  );
}

export default function TeacherTimetable() {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState('Monday');

  const fetchTimetable = () => {
    api.get('/timetable/my').then(r => setTimetable(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchTimetable(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/timetable', { ...form, teacherId: user._id, teacherName: user.name });
      toast.success('Class added to timetable');
      setShowForm(false);
      setForm(empty);
      fetchTimetable();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add class');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this class?')) return;
    await api.delete(`/timetable/${id}`);
    toast.success('Class removed');
    fetchTimetable();
  };

  const dayClasses = timetable.filter(c => c.dayOfWeek === activeDay);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>📅 Timetable Management</h2>
        <button className={styles.addBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Class'}
        </button>
      </div>

      {showForm && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <h3>Add New Class</h3>
          <div className={styles.formGrid}>
            <input className={styles.input} placeholder="Subject" required value={form.subject} onChange={e => set('subject', e.target.value)} />
            <input className={styles.input} placeholder="Class (e.g. 10)" required value={form.class} onChange={e => set('class', e.target.value)} />
            <input className={styles.input} placeholder="Section" value={form.section} onChange={e => set('section', e.target.value)} />
            <select className={styles.input} value={form.dayOfWeek} onChange={e => set('dayOfWeek', e.target.value)}>
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
            <TimePicker label="Start Time" value={form.startTime} onChange={v => set('startTime', v)} />
            <TimePicker label="End Time" value={form.endTime} onChange={v => set('endTime', v)} />            <input className={styles.input} type="number" placeholder="Duration (min)" value={form.duration} onChange={e => set('duration', e.target.value)} />
            <input className={styles.input} placeholder="Classroom (e.g. Room 204)" required value={form.classroom} onChange={e => set('classroom', e.target.value)} />
            <input className={styles.input} type="number" step="any" placeholder="Latitude (GPS)" value={form.location.latitude || ''} onChange={e => set('location', { ...form.location, latitude: parseFloat(e.target.value) || 0 })} />
            <input className={styles.input} type="number" step="any" placeholder="Longitude (GPS)" value={form.location.longitude || ''} onChange={e => set('location', { ...form.location, longitude: parseFloat(e.target.value) || 0 })} />
          </div>
          <button className={styles.submitBtn} type="submit">Add Class</button>
        </form>
      )}

      <div className={styles.dayTabs}>
        {DAYS.map(d => (
          <button key={d} className={`${styles.dayTab} ${activeDay === d ? styles.active : ''}`} onClick={() => setActiveDay(d)}>
            {d.slice(0, 3)} <span className={styles.count}>{timetable.filter(c => c.dayOfWeek === d).length}</span>
          </button>
        ))}
      </div>

      {loading ? <div className={styles.loading}>Loading...</div> : (
        dayClasses.length === 0 ? <div className={styles.empty}>No classes on {activeDay}</div> : (
          <div className={styles.list}>
            {dayClasses.map(cls => (
              <div key={cls._id} className={styles.classRow}>
                <div className={styles.classInfo}>
                  <strong>{cls.subject}</strong>
                  <span>{formatTime(cls.startTime)} – {formatTime(cls.endTime)} ({cls.duration} min)</span>
                  <span>📍 {cls.classroom} · Class {cls.class}{cls.section}</span>
                </div>
                <button className={styles.deleteBtn} onClick={() => handleDelete(cls._id)}>🗑</button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
