import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import styles from './Dashboard.module.css';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/students'),
      api.get('/admin/teachers'),
    ]).then(([s, st, te]) => {
      setStats(s.data);
      setStudents(st.data);
      setTeachers(te.data);
    }).catch(() => toast.error('Failed to load admin data'))
      .finally(() => setLoading(false));
  }, []);

  const toggleStudent = async (id) => {
    try {
      const { data } = await api.put(`/admin/students/${id}/toggle`);
      setStudents(prev => prev.map(s => s._id === id ? { ...s, isActive: data.isActive } : s));
      toast.success('Student status updated');
    } catch { toast.error('Failed'); }
  };

  const toggleTeacher = async (id) => {
    try {
      const { data } = await api.put(`/admin/teachers/${id}/toggle`);
      setTeachers(prev => prev.map(t => t._id === id ? { ...t, isActive: data.isActive } : t));
      toast.success('Teacher status updated');
    } catch { toast.error('Failed'); }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNumber.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className={styles.loading}>Loading admin dashboard...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>🛡️ Admin Dashboard</h2>
        <button className={styles.logoutBtn} onClick={() => { logout(); navigate('/admin/login'); }}>🚪 Logout</button>
      </div>

      <div className={styles.tabs}>
        {['overview', 'students', 'teachers'].map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.active : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && stats && (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}><div className={styles.statVal}>{stats.totalStudents}</div><div className={styles.statLabel}>Total Students</div></div>
            <div className={styles.statCard}><div className={styles.statVal}>{stats.totalTeachers}</div><div className={styles.statLabel}>Total Teachers</div></div>
            <div className={styles.statCard}><div className={styles.statVal}>{stats.totalClasses}</div><div className={styles.statLabel}>Active Classes</div></div>
            <div className={styles.statCard}><div className={styles.statVal}>{stats.todayPresent}/{stats.todayAttendance}</div><div className={styles.statLabel}>Today Present</div></div>
          </div>

          {stats.departments?.length > 0 && (
            <div className={styles.section}>
              <h3>Department Breakdown</h3>
              <div className={styles.breakdownGrid}>
                {stats.departments.map(d => (
                  <div key={d._id} className={styles.breakdownItem}>
                    <span>{d._id || 'Unassigned'}</span>
                    <strong>{d.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.trend?.length > 0 && (
            <div className={styles.section}>
              <h3>7-Day Attendance Trend</h3>
              <div className={styles.trendChart}>
                {stats.trend.map(t => {
                  const pct = t.total ? Math.round((t.present / t.total) * 100) : 0;
                  return (
                    <div key={t._id} className={styles.trendBar} title={`${t._id}: ${pct}%`}>
                      <div className={styles.trendFill} style={{ height: `${pct}%`, background: pct >= 75 ? '#16a34a' : '#f87171' }} />
                      <span className={styles.trendLabel}>{t._id.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {(tab === 'students' || tab === 'teachers') && (
        <>
          <input className={styles.search} placeholder="Search by name, email, roll..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>Name</span><span>Email</span>
              {tab === 'students' && <><span>Roll No</span><span>Class</span><span>Dept</span></>}
              {tab === 'teachers' && <><span>Subject</span><span>Dept</span></>}
              <span>Status</span><span>Action</span>
            </div>
            {(tab === 'students' ? filteredStudents : filteredTeachers).map(u => (
              <div key={u._id} className={styles.tableRow}>
                <span>{u.name}</span>
                <span className={styles.email}>{u.email}</span>
                {tab === 'students' && <><span>{u.rollNumber}</span><span>{u.class}{u.section}</span><span>{u.department || '—'}</span></>}
                {tab === 'teachers' && <><span>{u.subject}</span><span>{u.department || '—'}</span></>}
                <span>
                  <span className={styles.statusDot} style={{ background: u.isActive ? '#16a34a' : '#dc2626' }}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </span>
                <span>
                  <button
                    className={`${styles.toggleBtn} ${u.isActive ? styles.deactivate : styles.activate}`}
                    onClick={() => tab === 'students' ? toggleStudent(u._id) : toggleTeacher(u._id)}
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
