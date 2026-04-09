import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Try /auth/me first, then /admin/me for admin tokens
      api.get('/auth/me')
        .then(({ data }) => { setUser(data.user); setUserType(data.userType); })
        .catch(() => {
          // Try admin endpoint
          api.get('/admin/stats')
            .then(() => {
              // Decode token to get admin info
              const payload = JSON.parse(atob(token.split('.')[1]));
              if (payload.type === 'admin') {
                setUser({ _id: payload.id, name: 'Admin' });
                setUserType('admin');
              } else {
                localStorage.removeItem('token');
              }
            })
            .catch(() => localStorage.removeItem('token'));
        })
        .finally(() => setLoading(false));
    } else {
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
