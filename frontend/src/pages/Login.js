import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import styles from './Auth.module.css';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '', userType: 'student' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.email, form.password, form.userType);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(data.userType === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🎓</div>
        <h1 className={styles.title}>Smart Classroom</h1>
        <p className={styles.subtitle}>Attendance Tracking System</p>

        <div className={styles.tabs}>
          {['student', 'teacher'].map(t => (
            <button key={t} className={`${styles.tab} ${form.userType === t ? styles.activeTab : ''}`}
              onClick={() => setForm(f => ({ ...f, userType: t }))}>
              {t === 'student' ? '👨‍🎓 Student' : '👨‍🏫 Teacher'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input className={styles.input} type="email" placeholder="Email address"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          <input className={styles.input} type="password" placeholder="Password"
            value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className={styles.link}>Don't have an account? <Link to="/register">Register</Link></p>
        <p className={styles.link}><Link to="/admin/login">🛡️ Admin Login</Link></p>
      </div>
    </div>
  );
}
