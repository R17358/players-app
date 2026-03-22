import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tournamentAPI, registrationAPI } from '../../api';
import { formatDate, formatCurrency, statusConfig, sportEmoji } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function OrganiserDashboard() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState('all');

  useEffect(() => {
    tournamentAPI.getMyTournaments()
      .then(r => setTournaments(r.data.data))
      .catch(() => toast.error('Failed to load tournaments'))
      .finally(() => setLoading(false));
  }, []);

  const publish = async (id) => {
    try {
      await tournamentAPI.publish(id);
      setTournaments(prev => prev.map(t => t._id === id ? { ...t, status: 'published' } : t));
      toast.success('Submitted for admin approval!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const cancel = async (id) => {
    const reason = prompt('Cancellation reason (required):');
    if (!reason) return;
    try {
      await tournamentAPI.cancel(id, { reason });
      setTournaments(prev => prev.map(t => t._id === id ? { ...t, status: 'cancelled' } : t));
      toast.success('Tournament cancelled. Refunds processed.');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const filtered = tab === 'all' ? tournaments : tournaments.filter(t => t.status === tab);

  const totalParticipants = tournaments.reduce((s, t) => s + (t.currentParticipants || 0), 0);
  const totalRevenue      = tournaments.reduce((s, t) => s + ((t.currentParticipants || 0) * (t.registrationFee || 0)), 0);
  const liveTournaments   = tournaments.filter(t => t.status === 'ongoing').length;

  return (
    <div style={{ padding: '24px', maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="display" style={{ fontSize: 36 }}>ORGANISER PANEL</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Manage your competitions</p>
        </div>
        <Link to="/organiser/create" className="btn btn-primary">➕ Create Tournament</Link>
      </div>

      {/* Quick stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { icon: '🏆', val: tournaments.length,  label: 'Total Tournaments' },
          { icon: '🔴', val: liveTournaments,      label: 'Live Now' },
          { icon: '👥', val: totalParticipants,    label: 'Total Participants' },
          { icon: '💰', val: formatCurrency(totalRevenue), label: 'Registration Revenue', isStr: true },
        ].map(({ icon, val, label, isStr }, i) => (
          <div key={i} className={`stat-card anim-fadeUp d${i+1}`}>
            <div className="stat-icon">{icon}</div>
            <div className="stat-value" style={{ fontSize: isStr ? 20 : undefined }}>{val}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: 20 }}>
        {['all','draft','published','registration_open','ongoing','completed'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'all' ? 'All' : t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading
        ? <div className="page-loader"><div className="spinner" /></div>
        : filtered.length === 0
          ? <div className="empty-state">
              <div className="es-icon">🏟️</div>
              <h3>No tournaments here</h3>
              <Link to="/organiser/create" className="btn btn-primary" style={{ marginTop: 16 }}>Create Your First Tournament</Link>
            </div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(t => {
                const cfg = statusConfig[t.status] || {};
                const fill = Math.round(((t.currentParticipants||0) / (t.maxParticipants||1)) * 100);
                return (
                  <div key={t._id} className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                      {/* Sport banner color strip */}
                      <div style={{ width: 5, background: t.status === 'ongoing' ? 'var(--green)' : t.status === 'registration_open' ? 'var(--blue)' : t.status === 'cancelled' ? 'var(--red)' : 'var(--bg-elevated)', flexShrink: 0 }} />
                      <div style={{ flex: 1, padding: '16px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                          <div style={{ fontSize: 28 }}>{sportEmoji[t.sport] || '🏅'}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 800 }}>{t.title}</span>
                              <span className={`badge badge-${cfg.color || 'gray'}`}>{cfg.label || t.status}</span>
                              {t.isFeatured && <span className="badge badge-yellow">⭐</span>}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 5, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                              <span>📅 {formatDate(t.tournamentStartDate)}</span>
                              <span>📍 {t.location?.city}</span>
                              <span>👥 {t.currentParticipants}/{t.maxParticipants}</span>
                              <span>💰 {t.isFree ? 'Free' : formatCurrency(t.registrationFee)}</span>
                            </div>
                            {/* Slots bar */}
                            <div style={{ marginTop: 8 }}>
                              <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${fill}%` }} />
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                            <Link to={`/tournaments/${t.slug || t._id}`} className="btn btn-outline btn-sm">View</Link>
                            {t.status === 'draft' && (
                              <>
                                <Link to={`/organiser/edit/${t._id}`} className="btn btn-ghost btn-sm">Edit</Link>
                                <button className="btn btn-blue btn-sm" onClick={() => publish(t._id)}>Publish</button>
                              </>
                            )}
                            {t.status === 'registration_closed' && (
                              <Link to={`/organiser/manage/${t._id}`} className="btn btn-primary btn-sm">Manage</Link>
                            )}
                            {t.status === 'registration_open' && (
                              <Link to={`/organiser/manage/${t._id}`} className="btn btn-ghost btn-sm">Registrations</Link>
                            )}
                            {t.status === 'ongoing' && (
                              <Link to={`/organiser/manage/${t._id}`} className="btn btn-blue btn-sm">🔴 Live</Link>
                            )}
                            {!['completed','cancelled'].includes(t.status) && (
                              <button className="btn btn-danger btn-sm" onClick={() => cancel(t._id)}>Cancel</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
      }
    </div>
  );
}
