import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import styles from './Dashboard.module.css';

const SECTIONS = [
  { key: 'overview',    icon: '🏠', label: 'Overview' },
  { key: 'students',    icon: '👨‍🎓', label: 'Students' },
  { key: 'teachers',    icon: '👨‍🏫', label: 'Teachers' },
  { key: 'timetables',  icon: '📅', label: 'Timetables' },
  { key: 'attendance',  icon: '📊', label: 'Attendance' },
  { key: 'leaves',      icon: '📋', label: 'Leaves' },
  { key: 'disputes',    icon: '⚠️',  label: 'Disputes' },
];

const statusColor = { present: '#16a34a', late: '#d97706', absent: '#dc2626', pending: '#d97706', approved: '#16a34a', rejected: '#dc2626' };

// ── Reusable review modal ────────────────────────────────────────
function ReviewModal({ item, type, onClose, onDone }) {
  const [status, setStatus] = useState('approved');
  const [comment, setComment] = useState('');
  const submit = async () => {
    try {
      await api.put(`/admin/${type}/${item._id}/review`, { status, teacherComment: comment });
      toast.success(`${status}`);
      onDone();
    } catch { toast.error('Failed'); }
  };
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3>Review {type === 'leaves' ? 'Leave' : 'Dispute'}</h3>
        <p><strong>{item.studentId?.name}</strong> ({item.studentId?.rollNumber})</p>
        <p className={styles.modalSub}>{item.timetableId?.subject} · {new Date(item.date || item.createdAt).toLocaleDateString()}</p>
        <p className={styles.modalReason}>{item.reason}</p>
        <div className={styles.statusBtns}>
          <button className={`${styles.statusBtn} ${status === 'approved' ? styles.approvedBtn : ''}`} onClick={() => setStatus('approved')}>✅ Approve</button>
          <button className={`${styles.statusBtn} ${status === 'rejected' ? styles.rejectedBtn : ''}`} onClick={() => setStatus('rejected')}>❌ Reject</button>
        </div>
        <textarea className={styles.textarea} placeholder="Comment (optional)" rows={3} value={comment} onChange={e => setComment(e.target.value)} />
        <div className={styles.modalBtns}>
          <button className={styles.btnPrimary} onClick={submit}>Submit</button>
          <button className={styles.btnGray} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Edit modal ───────────────────────────────────────────────────
function EditModal({ item, type, onClose, onDone }) {
  const [form, setForm] = useState({ ...item });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async () => {
    try {
      await api.put(`/admin/${type}/${item._id}`, form);
      toast.success('Updated');
      onDone();
    } catch { toast.error('Failed to update'); }
  };
  const fields = type === 'students'
    ? ['name','email','phone','class','section','rollNumber','parentEmail','parentPhone']
    : ['name','email','phone','subject','employeeId'];
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3>Edit {type === 'students' ? 'Student' : 'Teacher'}</h3>
        <div className={styles.editGrid}>
          {fields.map(f => (
            <div key={f} className={styles.editField}>
              <label>{f.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>
              <input className={styles.editInput} value={form[f] || ''} onChange={e => set(f, e.target.value)} />
            </div>
          ))}
        </div>
        <div className={styles.modalBtns}>
          <button className={styles.btnPrimary} onClick={submit}>Save</button>
          <button className={styles.btnGray} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState('overview');
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ class: '', section: '', date: '', status: '' });
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editType, setEditType] = useState('');

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const loadStats = useCallback(async () => {
    const { data } = await api.get('/admin/stats');
    setStats(data);
  }, []);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filters.class) params.set('class', filters.class);
    if (filters.section) params.set('section', filters.section);
    const { data } = await api.get(`/admin/students?${params}`);
    setStudents(data);
    setLoading(false);
  }, [search, filters.class, filters.section]);

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const { data } = await api.get(`/admin/teachers?${params}`);
    setTeachers(data);
    setLoading(false);
  }, [search]);

  const loadTimetables = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.class) params.set('class', filters.class);
    if (filters.section) params.set('section', filters.section);
    const { data } = await api.get(`/admin/timetables?${params}`);
    setTimetables(data);
    setLoading(false);
  }, [filters.class, filters.section]);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.class) params.set('class', filters.class);
    if (filters.section) params.set('section', filters.section);
    if (filters.date) params.set('date', filters.date);
    if (filters.status) params.set('status', filters.status);
    const { data } = await api.get(`/admin/attendance?${params}`);
    setAttendance(data);
    setLoading(false);
  }, [filters]);

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    const { data } = await api.get(`/admin/leaves?${params}`);
    setLeaves(data);
    setLoading(false);
  }, [filters.status]);

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    const { data } = await api.get(`/admin/disputes?${params}`);
    setDisputes(data);
    setLoading(false);
  }, [filters.status]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    setSearch('');
    setFilters({ class: '', section: '', date: '', status: '' });
  }, [section]);

  useEffect(() => {
    if (section === 'students') loadStudents();
    else if (section === 'teachers') loadTeachers();
    else if (section === 'timetables') loadTimetables();
    else if (section === 'attendance') loadAttendance();
    else if (section === 'leaves') loadLeaves();
    else if (section === 'disputes') loadDisputes();
  }, [section, loadStudents, loadTeachers, loadTimetables, loadAttendance, loadLeaves, loadDisputes]);

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  const toggleStudent = async (id) => {
    const { data } = await api.put(`/admin/students/${id}/toggle`);
    setStudents(prev => prev.map(s => s._id === id ? { ...s, isActive: data.isActive } : s));
    toast.success(data.isActive ? 'Student activated' : 'Student deactivated');
  };

  const toggleTeacher = async (id) => {
    const { data } = await api.put(`/admin/teachers/${id}/toggle`);
    setTeachers(prev => prev.map(t => t._id === id ? { ...t, isActive: data.isActive } : t));
    toast.success(data.isActive ? 'Teacher activated' : 'Teacher deactivated');
  };

  const deleteTimetable = async (id) => {
    if (!window.confirm('Remove this class?')) return;
    await api.delete(`/admin/timetables/${id}`);
    setTimetables(prev => prev.filter(t => t._id !== id));
    toast.success('Class removed');
  };

  const overrideAttendance = async (id, status) => {
    await api.put(`/admin/attendance/${id}/override`, { status });
    setAttendance(prev => prev.map(a => a._id === id ? { ...a, status } : a));
    toast.success(`Marked ${status}`);
  };

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const p = h < 12 ? 'AM' : 'PM';
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${p}`;
  };

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span>🛡️</span>
          <span>Admin Panel</span>
        </div>
        <nav className={styles.nav}>
          {SECTIONS.map(s => (
            <button key={s.key} className={`${styles.navBtn} ${section === s.key ? styles.navActive : ''}`}
              onClick={() => setSection(s.key)}>
              <span>{s.icon}</span> {s.label}
              {s.key === 'leaves' && stats?.pendingLeaves > 0 && <span className={styles.badge}>{stats.pendingLeaves}</span>}
              {s.key === 'disputes' && stats?.pendingDisputes > 0 && <span className={styles.badge}>{stats.pendingDisputes}</span>}
            </button>
          ))}
        </nav>
        <button className={styles.logoutBtn} onClick={handleLogout}>🚪 Logout</button>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.topBar}>
          <h2 className={styles.pageTitle}>{SECTIONS.find(s => s.key === section)?.icon} {SECTIONS.find(s => s.key === section)?.label}</h2>
        </div>

        {/* ── Overview ── */}
        {section === 'overview' && stats && (
          <div className={styles.content}>
            <div className={styles.statsGrid}>
              {[
                { val: stats.totalStudents, label: 'Total Students', icon: '👨‍🎓', color: '#4f46e5' },
                { val: stats.totalTeachers, label: 'Total Teachers', icon: '👨‍🏫', color: '#0891b2' },
                { val: stats.totalClasses, label: 'Active Classes', icon: '📅', color: '#059669' },
                { val: `${stats.todayPresent}/${stats.todayAttendance}`, label: "Today's Attendance", icon: '✅', color: '#16a34a' },
                { val: stats.pendingLeaves, label: 'Pending Leaves', icon: '📋', color: '#d97706' },
                { val: stats.pendingDisputes, label: 'Pending Disputes', icon: '⚠️', color: '#dc2626' },
              ].map((s, i) => (
                <div key={i} className={styles.statCard}>
                  <div className={styles.statIcon} style={{ background: s.color + '20', color: s.color }}>{s.icon}</div>
                  <div>
                    <div className={styles.statVal} style={{ color: s.color }}>{s.val}</div>
                    <div className={styles.statLabel}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {stats.trend?.length > 0 && (
              <div className={styles.card}>
                <h3>7-Day Attendance Trend</h3>
                <div className={styles.trendChart}>
                  {stats.trend.map(t => {
                    const pct = t.total ? Math.round((t.present / t.total) * 100) : 0;
                    return (
                      <div key={t._id} className={styles.trendBar}>
                        <span className={styles.trendPct}>{pct}%</span>
                        <div className={styles.trendFill} style={{ height: `${pct}%`, background: pct >= 75 ? '#16a34a' : '#f87171' }} />
                        <span className={styles.trendDate}>{t._id.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {stats.classDist?.length > 0 && (
              <div className={styles.card}>
                <h3>Class Distribution</h3>
                <div className={styles.classDist}>
                  {stats.classDist.map((c, i) => (
                    <div key={i} className={styles.classChip}>
                      <strong>Class {c._id.class}{c._id.section}</strong>
                      <span>{c.count} students</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Students ── */}
        {section === 'students' && (
          <div className={styles.content}>
            <div className={styles.filterBar}>
              <input className={styles.searchInput} placeholder="Search name, email, roll..." value={search} onChange={e => setSearch(e.target.value)} />
              <input className={styles.filterInput} placeholder="Class" value={filters.class} onChange={e => setF('class', e.target.value)} />
              <input className={styles.filterInput} placeholder="Section" value={filters.section} onChange={e => setF('section', e.target.value)} />
              <button className={styles.btnPrimary} onClick={loadStudents}>Search</button>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr>
                  <th>Name</th><th>Email</th><th>Roll No</th><th>Class</th><th>Phone</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={7} className={styles.loading}>Loading...</td></tr> :
                  students.map(s => (
                    <tr key={s._id} className={!s.isActive ? styles.inactiveRow : ''}>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.email}</td>
                      <td>{s.rollNumber}</td>
                      <td>{s.class}{s.section}</td>
                      <td>{s.phone}</td>
                      <td><span className={styles.statusPill} style={{ background: s.isActive ? '#dcfce7' : '#fee2e2', color: s.isActive ? '#16a34a' : '#dc2626' }}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td className={styles.actions}>
                        <button className={styles.btnEdit} onClick={() => { setEditing(s); setEditType('students'); }}>✏️</button>
                        <button className={`${styles.btnToggle} ${s.isActive ? styles.btnDeact : styles.btnAct}`} onClick={() => toggleStudent(s._id)}>
                          {s.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Teachers ── */}
        {section === 'teachers' && (
          <div className={styles.content}>
            <div className={styles.filterBar}>
              <input className={styles.searchInput} placeholder="Search name, email, ID..." value={search} onChange={e => setSearch(e.target.value)} />
              <button className={styles.btnPrimary} onClick={loadTeachers}>Search</button>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr>
                  <th>Name</th><th>Email</th><th>Employee ID</th><th>Subject</th><th>Phone</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={7} className={styles.loading}>Loading...</td></tr> :
                  teachers.map(t => (
                    <tr key={t._id} className={!t.isActive ? styles.inactiveRow : ''}>
                      <td><strong>{t.name}</strong></td>
                      <td>{t.email}</td>
                      <td>{t.employeeId}</td>
                      <td>{t.subject}</td>
                      <td>{t.phone}</td>
                      <td><span className={styles.statusPill} style={{ background: t.isActive ? '#dcfce7' : '#fee2e2', color: t.isActive ? '#16a34a' : '#dc2626' }}>{t.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td className={styles.actions}>
                        <button className={styles.btnEdit} onClick={() => { setEditing(t); setEditType('teachers'); }}>✏️</button>
                        <button className={`${styles.btnToggle} ${t.isActive ? styles.btnDeact : styles.btnAct}`} onClick={() => toggleTeacher(t._id)}>
                          {t.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Timetables ── */}
        {section === 'timetables' && (
          <div className={styles.content}>
            <div className={styles.filterBar}>
              <input className={styles.filterInput} placeholder="Class" value={filters.class} onChange={e => setF('class', e.target.value)} />
              <input className={styles.filterInput} placeholder="Section" value={filters.section} onChange={e => setF('section', e.target.value)} />
              <button className={styles.btnPrimary} onClick={loadTimetables}>Filter</button>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr>
                  <th>Subject</th><th>Teacher</th><th>Class</th><th>Day</th><th>Time</th><th>Room</th><th>Action</th>
                </tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={7} className={styles.loading}>Loading...</td></tr> :
                  timetables.map(t => (
                    <tr key={t._id}>
                      <td><strong>{t.subject}</strong></td>
                      <td>{t.teacherName}</td>
                      <td>{t.class}{t.section}</td>
                      <td>{t.dayOfWeek}</td>
                      <td>{formatTime(t.startTime)} – {formatTime(t.endTime)}</td>
                      <td>{t.classroom}</td>
                      <td><button className={styles.btnDel} onClick={() => deleteTimetable(t._id)}>🗑 Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Attendance ── */}
        {section === 'attendance' && (
          <div className={styles.content}>
            <div className={styles.filterBar}>
              <input className={styles.filterInput} placeholder="Class" value={filters.class} onChange={e => setF('class', e.target.value)} />
              <input className={styles.filterInput} placeholder="Section" value={filters.section} onChange={e => setF('section', e.target.value)} />
              <input className={styles.filterInput} type="date" value={filters.date} onChange={e => setF('date', e.target.value)} />
              <select className={styles.filterInput} value={filters.status} onChange={e => setF('status', e.target.value)}>
                <option value="">All Status</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
              </select>
              <button className={styles.btnPrimary} onClick={loadAttendance}>Filter</button>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr>
                  <th>Student</th><th>Roll No</th><th>Subject</th><th>Date</th><th>Status</th><th>Method</th><th>Override</th>
                </tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={7} className={styles.loading}>Loading...</td></tr> :
                  attendance.map(a => (
                    <tr key={a._id}>
                      <td><strong>{a.studentId?.name}</strong></td>
                      <td>{a.studentId?.rollNumber}</td>
                      <td>{a.timetableId?.subject}</td>
                      <td>{new Date(a.date).toLocaleDateString()}</td>
                      <td><span className={styles.statusPill} style={{ background: statusColor[a.status] + '20', color: statusColor[a.status] }}>{a.status}</span></td>
                      <td>{a.method || '—'}</td>
                      <td className={styles.actions}>
                        {['present','late','absent'].map(s => (
                          <button key={s} className={`${styles.overrideBtn} ${a.status === s ? styles.overrideActive : ''}`}
                            style={{ '--c': statusColor[s] }} onClick={() => overrideAttendance(a._id, s)}>
                            {s[0].toUpperCase()}
                          </button>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Leaves ── */}
        {section === 'leaves' && (
          <div className={styles.content}>
            <div className={styles.filterBar}>
              <select className={styles.filterInput} value={filters.status} onChange={e => setF('status', e.target.value)}>
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <button className={styles.btnPrimary} onClick={loadLeaves}>Filter</button>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr>
                  <th>Student</th><th>Class</th><th>Subject</th><th>Date</th><th>Reason</th><th>Status</th><th>Action</th>
                </tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={7} className={styles.loading}>Loading...</td></tr> :
                  leaves.map(l => (
                    <tr key={l._id}>
                      <td><strong>{l.studentId?.name}</strong><br/><small>{l.studentId?.rollNumber}</small></td>
                      <td>{l.studentId?.class}{l.studentId?.section}</td>
                      <td>{l.timetableId?.subject}</td>
                      <td>{new Date(l.date).toLocaleDateString()}</td>
                      <td className={styles.reasonCell}>{l.reason}</td>
                      <td><span className={styles.statusPill} style={{ background: statusColor[l.status] + '20', color: statusColor[l.status] }}>{l.status}</span></td>
                      <td>{l.status === 'pending' && <button className={styles.btnReview} onClick={() => setReviewing({ ...l, _reviewType: 'leaves' })}>Review</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Disputes ── */}
        {section === 'disputes' && (
          <div className={styles.content}>
            <div className={styles.filterBar}>
              <select className={styles.filterInput} value={filters.status} onChange={e => setF('status', e.target.value)}>
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <button className={styles.btnPrimary} onClick={loadDisputes}>Filter</button>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr>
                  <th>Student</th><th>Class</th><th>Subject</th><th>Date</th><th>Reason</th><th>Status</th><th>Action</th>
                </tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={7} className={styles.loading}>Loading...</td></tr> :
                  disputes.map(d => (
                    <tr key={d._id}>
                      <td><strong>{d.studentId?.name}</strong><br/><small>{d.studentId?.rollNumber}</small></td>
                      <td>{d.studentId?.class}{d.studentId?.section}</td>
                      <td>{d.timetableId?.subject}</td>
                      <td>{new Date(d.date).toLocaleDateString()}</td>
                      <td className={styles.reasonCell}>{d.reason}</td>
                      <td><span className={styles.statusPill} style={{ background: statusColor[d.status] + '20', color: statusColor[d.status] }}>{d.status}</span></td>
                      <td>{d.status === 'pending' && <button className={styles.btnReview} onClick={() => setReviewing({ ...d, _reviewType: 'disputes' })}>Review</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {reviewing && (
        <ReviewModal
          item={reviewing}
          type={reviewing._reviewType}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewing(null);
            if (reviewing._reviewType === 'leaves') loadLeaves();
            else loadDisputes();
            loadStats();
          }}
        />
      )}

      {editing && (
        <EditModal
          item={editing}
          type={editType}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            if (editType === 'students') loadStudents();
            else loadTeachers();
          }}
        />
      )}
    </div>
  );
}
