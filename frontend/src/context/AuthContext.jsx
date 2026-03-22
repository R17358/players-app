import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user on mount
  useEffect(() => {
    const token = localStorage.getItem('sv_token');
    if (token) {
      authAPI.getMe()
        .then(res => setUser(res.data.data))
        .catch(() => { localStorage.removeItem('sv_token'); localStorage.removeItem('sv_user'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await authAPI.login(credentials);
    const { token, data } = res.data;
    localStorage.setItem('sv_token', token);
    localStorage.setItem('sv_user', JSON.stringify(data));
    setUser(data);
    return data;
  }, []);

  const register = useCallback(async (formData) => {
    const res = await authAPI.register(formData);
    const { token, data } = res.data;
    localStorage.setItem('sv_token', token);
    localStorage.setItem('sv_user', JSON.stringify(data));
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await authAPI.logout().catch(() => {});
    localStorage.removeItem('sv_token');
    localStorage.removeItem('sv_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((updated) => {
    setUser(prev => ({ ...prev, ...updated }));
    localStorage.setItem('sv_user', JSON.stringify({ ...user, ...updated }));
  }, [user]);

  const isAdmin     = user?.role === 'admin';
  const isOrganiser = user?.role === 'organiser' || isAdmin;
  const isPlayer    = user?.role === 'player';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, isAdmin, isOrganiser, isPlayer }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
