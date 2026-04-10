import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    // Decode token type without verifying (verification happens server-side)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.type === 'admin') {
        api.get('/admin/me')
          .then(({ data }) => { setUser(data.user); setUserType('admin'); })
          .catch(() => localStorage.removeItem('token'))
          .finally(() => setLoading(false));
      } else {
        api.get('/auth/me')
          .then(({ data }) => { setUser(data.user); setUserType(data.userType); })
          .catch(() => localStorage.removeItem('token'))
          .finally(() => setLoading(false));
      }
    } catch {
      localStorage.removeItem('token');
      setLoading(false);
    }
  }, []);

  const login = async (email, password, type) => {
    const { data } = await api.post('/auth/login', { email, password, userType: type });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setUserType(data.userType);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setUserType(null);
  };

  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }));

  return (
    <AuthContext.Provider value={{ user, userType, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
