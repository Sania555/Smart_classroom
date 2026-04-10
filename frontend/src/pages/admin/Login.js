import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import styles from './Login.module.css';

export default function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/admin/login', form);
      logout(); // clear any existing session
      localStorage.setItem('token', data.token);
      toast.success('Welcome, Admin!');
      window.location.href = '/admin/dashboard';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>🛡️</div>
        <h1 className={styles.title}>Admin Portal</h1>
        <p className={styles.sub}>SmartClass Management System</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Email</label>
            <input className={styles.input} type="email" placeholder="admin@smartclass.com" required
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <input className={styles.input} type="password" placeholder="••••••••" required
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : '🔐 Sign In as Admin'}
          </button>
        </form>
        <p className={styles.hint}>
          Don't have an admin account? Ask your system administrator<br/>
          or register via <code>POST /api/admin/register</code>
        </p>
      </div>
    </div>
  );
}
