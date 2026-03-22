import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { formatCurrency, formatNumber, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [stats, setStats]         = useState(null);
  const [pending, setPending]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('overview');

  useEffect(() => {
    Promise.all([adminAPI.getStats(), adminAPI.getPending()])
      .then(([sRes, pRes]) => {
        setStats(sRes.data.data);
        setPending(pRes.data.data);
      })
      .catch(() => toast.error('Failed to load admin data'))
      .finally(() => setLoading(false));
  }, []);

  const approve = async (id) => {
    try {
      await adminAPI.approveTournament(id);
      setPending(p => p.filter(t => t._id !== id));
      toast.success('Tournament approved & published! ✅');
    } catch { toast.error('Failed to approve'); }
  };

  const reject = async (id) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await adminAPI.rejectTournament(id, { reason });
      setPending(p => p.filter(t => t._id !== id));
      toast.success('Tournament rejected');
    } catch { toast.error('Failed to reject'); }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="display admin-title">ADMIN PANEL</h1>
          <p className="admin-sub">Manage the SportVibe platform</p>
        </div>
        <span className="badge badge-red">🛡️ Admin</span>
      </div>

      {/* Stats overview */}
      {stats && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card card anim-fadeUp d1">
            <div className="asc-icon">👥</div>
            <div className="stat-value">{formatNumber(stats.users.total)}</div>
            <div className="stat-label">Total Users</div>
            <div className="asc-sub">+{stats.users.newThisMonth} this month</div>
          </div>
          <div className="admin-stat-card card anim-fadeUp d2">
            <div className="asc-icon">🏆</div>
            <div className="stat-value">{formatNumber(stats.tournaments.total)}</div>
            <div className="stat-label">Tournaments</div>
            <div className="asc-sub">{stats.tournaments.active} active now</div>
          </div>
          <div className="admin-stat-card card anim-fadeUp d3">
            <div className="asc-icon">🎟️</div>
            <div className="stat-value">{formatNumber(stats.registrations.total)}</div>
            <div className="stat-label">Registrations</div>
            <div className="asc-sub">Confirmed entries</div>
          </div>
          <div className="admin-stat-card card anim-fadeUp d4">
            <div className="asc-icon">💰</div>
            <div className="stat-value">{formatCurrency(stats.revenue.total)}</div>
            <div className="stat-label">Total Revenue</div>
            <div className="asc-sub">Platform earnings</div>
          </div>
          <div className="admin-stat-card card anim-fadeUp d5" style={{ borderColor: pending.length > 0 ? 'rgba(232,69,69,0.3)' : undefined }}>
            <div className="asc-icon">⏳</div>
            <div className="stat-value" style={{ color: pending.length > 0 ? 'var(--red)' : undefined }}>{pending.length}</div>
            <div className="stat-label">Pending Approvals</div>
            <div className="asc-sub">Awaiting review</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar" style={{ margin: '20px 0' }}>
        {['overview','approvals','sport-stats'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'overview' ? '📊 Overview' : t === 'approvals' ? `✅ Approvals ${pending.length > 0 ? `(${pending.length})` : ''}` : '📈 Sport Stats'}
          </button>
        ))}
      </div>

      {/* Approvals tab */}
      {tab === 'approvals' && (
        <div className="approvals-section anim-fadeIn">
          {pending.length === 0
            ? <div className="empty-state"><div className="es-icon">✅</div><h3>All caught up!</h3><p>No pending approvals</p></div>
            : pending.map(t => (
                <div key={t._id} className="approval-card card">
                  <div className="ap-banner">
                    {t.banner?.url
                      ? <img src={t.banner.url} alt={t.title} />
                      : <div className="ap-banner-ph">🏟️</div>}
                  </div>
                  <div className="ap-body">
                    <div className="ap-top">
                      <div>
                        <div className="ap-sport badge badge-blue">{t.sport}</div>
                        <h3 className="ap-title">{t.title}</h3>
                        <div className="ap-org">by {t.organiser?.organiserProfile?.organizationName || t.organiser?.name}
                          {t.organiser?.organiserProfile?.isVerified && <span className="verified-badge" style={{fontSize:9}}>✓ Verified</span>}
                        </div>
                      </div>
                      <div className="ap-meta">
                        <div>📅 {formatDate(t.tournamentStartDate)}</div>
                        <div>📍 {t.location?.city}</div>
                        <div>👥 Max {t.maxParticipants}</div>
                        <div>💰 {t.isFree ? 'Free' : formatCurrency(t.registrationFee)}</div>
                        <div>🏆 Prize: {formatCurrency(t.prizes?.totalPrizePool || 0)}</div>
                      </div>
                    </div>
                    <p className="ap-desc">{t.description?.slice(0, 200)}{t.description?.length > 200 ? '...' : ''}</p>
                    <div className="ap-actions">
                      <button className="btn btn-danger btn-sm" onClick={() => reject(t._id)}>✕ Reject</button>
                      <button className="btn btn-primary btn-sm" onClick={() => approve(t._id)}>✓ Approve & Publish</button>
                    </div>
                  </div>
                </div>
              ))
          }
        </div>
      )}

      {/* Overview tab */}
      {tab === 'overview' && stats && (
        <div className="overview-section anim-fadeIn">
          <div className="overview-grid">
            {/* Recent tournaments */}
            <div className="card overview-card">
              <div className="section-title">Recent Tournaments</div>
              {stats.recentTournaments?.map(t => (
                <div key={t._id} className="recent-row">
                  <div className="recent-sport">{t.sport}</div>
                  <div className="recent-title">{t.title}</div>
                  <div className="recent-regs">{t.registrationsCount} regs</div>
                  <div className={`badge badge-${t.status === 'ongoing' ? 'blue' : t.status === 'registration_open' ? 'green' : 'gray'}`}>
                    {t.status.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>

            {/* User breakdown */}
            <div className="card overview-card">
              <div className="section-title">User Breakdown</div>
              <div className="user-breakdown">
                <div className="ub-row">
                  <span>🏃 Players</span>
                  <span className="ub-val">{formatNumber(stats.users.players)}</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${(stats.users.players/stats.users.total)*100}%` }} /></div>
                <div className="ub-row">
                  <span>📋 Organisers</span>
                  <span className="ub-val">{formatNumber(stats.users.organisers)}</span>
                </div>
                <div className="progress-bar"><div className="progress-fill yellow" style={{ width: `${(stats.users.organisers/stats.users.total)*100}%` }} /></div>
              </div>

              <div className="section-title" style={{ marginTop: 20 }}>Tournament Status</div>
              <div className="user-breakdown">
                <div className="ub-row"><span>🟢 Active</span><span className="ub-val">{stats.tournaments.active}</span></div>
                <div className="ub-row"><span>✅ Completed</span><span className="ub-val">{stats.tournaments.completed}</span></div>
                <div className="ub-row"><span>⏳ Pending</span><span className="ub-val" style={{color:'var(--red)'}}>{stats.tournaments.pendingApprovals}</span></div>
              </div>
            </div>

            {/* Sport distribution */}
            <div className="card overview-card">
              <div className="section-title">Sport Distribution</div>
              {stats.sportDistribution?.slice(0, 6).map(({ _id, count }) => (
                <div key={_id} className="sport-dist-row">
                  <span className="sport-dist-name">{_id}</span>
                  <div className="progress-bar" style={{ flex: 1, margin: '0 12px' }}>
                    <div className="progress-fill green"
                      style={{ width: `${(count / (stats.sportDistribution[0]?.count || 1)) * 100}%` }} />
                  </div>
                  <span className="sport-dist-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
