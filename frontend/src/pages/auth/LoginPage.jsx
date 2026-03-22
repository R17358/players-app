import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]   = useState({ emailOrUsername: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}! 🎉`);
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/explore');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb orb-1" />
        <div className="auth-orb orb-2" />
      </div>
      <div className="auth-card card anim-fadeUp">
        <div className="auth-logo">🏆 <span>SPORT<b>VIBE</b></span></div>
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-sub">Log in to your account to continue</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email or Username</label>
            <input className="form-input" type="text" placeholder="you@example.com"
              value={form.emailOrUsername}
              onChange={e => setForm(f => ({ ...f, emailOrUsername: e.target.value }))}
              required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required />
          </div>
          <div className="auth-forgot">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <button type="submit" className="btn btn-blue btn-lg auth-submit" disabled={loading}>
            {loading ? <span className="spinner" style={{width:18,height:18,borderWidth:2}} /> : '🚀 Login'}
          </button>
        </form>

        <div className="auth-switch">
          Don't have an account? <Link to="/register">Create one free</Link>
        </div>
      </div>
    </div>
  );
}
