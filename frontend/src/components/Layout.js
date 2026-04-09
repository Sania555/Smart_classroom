import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import styles from './Layout.module.css';

export default function Layout() {
  const { user, userType, logout } = useAuth();
  const { notifications } = useSocket();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const unread = notifications.filter(n => !n.isRead).length;

  const studentLinks = [
    { to: '/student/dashboard', label: '🏠 Dashboard' },
    { to: '/student/timetable', label: '📅 Timetable' },
    { to: '/student/register-face', label: '🤳 Register Face' },
    { to: '/student/attendance', label: '📷 Mark Attendance' },
    { to: '/student/history', label: '📊 History' },
    { to: '/student/heatmap', label: '🗓 Heatmap' },
    { to: '/student/leave', label: '📋 Leave & Disputes' },
    { to: '/notifications', label: `🔔 Notifications${unread ? ` (${unread})` : ''}` },
  ];

  const teacherLinks = [
    { to: '/teacher/dashboard', label: '🏠 Dashboard' },
    { to: '/teacher/timetable', label: '📅 Timetable' },
    { to: '/teacher/students', label: '👥 Students' },
    { to: '/teacher/reports', label: '📈 Reports' },
    { to: '/teacher/trends', label: '📉 Trends' },
    { to: '/teacher/leave', label: '📋 Leave & Disputes' },
    { to: '/notifications', label: `🔔 Notifications${unread ? ` (${unread})` : ''}` },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: '🏠 Dashboard' },
  ];

  const links = userType === 'teacher' ? teacherLinks : userType === 'admin' ? adminLinks : studentLinks;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={styles.layout}>
      <nav className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>🎓</span>
          <span className={styles.brandName}>SmartClass</span>
        </div>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <div className={styles.userName}>{user?.name}</div>
            <div className={styles.userRole}>{userType}</div>
          </div>
        </div>
        <ul className={styles.navLinks}>
          {links.map(link => (
            <li key={link.to}>
              <NavLink to={link.to} className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className={styles.bottomActions}>
          <button className={styles.themeBtn} onClick={toggle} title="Toggle theme">
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
          <button className={styles.logoutBtn} onClick={handleLogout}>🚪 Logout</button>
        </div>
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
