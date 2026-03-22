import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', username: '', email: '', password: '',
    role: 'player', phone: '', city: '', state: ''
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome to SportVibe 🏆');
      navigate('/explore');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb orb-1" />
        <div className="auth-orb orb-2" />
      </div>
      <div className="auth-card card anim-fadeUp" style={{ maxWidth: 520 }}>
        <div className="auth-logo">🏆 <span>SPORT<b>VIBE</b></span></div>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-sub">Join thousands of athletes on SportVibe</p>

        {/* Role selector */}
        <div className="role-selector">
          {['player','organiser'].map(r => (
            <button key={r} type="button"
              className={`role-btn ${form.role === r ? 'active' : ''}`}
              onClick={() => set('role', r)}>
              {r === 'player' ? '🏃 Player' : '📋 Organiser'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="Rahul Sharma" value={form.name}
                onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" placeholder="rahul_sports" value={form.username}
                onChange={e => set('username', e.target.value.toLowerCase())} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="rahul@example.com" value={form.email}
              onChange={e => set('email', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Min 8 characters" value={form.password}
              onChange={e => set('password', e.target.value)} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" placeholder="9876543210" value={form.phone}
                onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" placeholder="Mumbai" value={form.city}
                onChange={e => set('city', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">State</label>
            <input className="form-input" placeholder="Maharashtra" value={form.state}
              onChange={e => set('state', e.target.value)} />
          </div>

          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
            {loading ? <span className="spinner" style={{width:18,height:18,borderWidth:2}} /> : '🏆 Create Account'}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
