import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import styles from '../Auth.module.css';

export default function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/admin/login', form);
      localStorage.setItem('token', data.token);
      // Manually set user since login() uses /auth/login
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
        <div className={styles.logo}>🛡️</div>
        <h1 className={styles.title}>Admin Login</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input className={styles.input} type="email" placeholder="Admin Email" required onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <input className={styles.input} type="password" placeholder="Password" required onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          <button className={styles.btn} type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login as Admin'}</button>
        </form>
      </div>
    </div>
  );
}
