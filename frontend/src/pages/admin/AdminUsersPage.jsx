import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { formatDate, getInitials, formatNumber } from '../../utils/helpers';
import toast from 'react-hot-toast';
import './AdminUsers.css';

export default function AdminUsersPage() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('organisers');
  const [search, setSearch]     = useState('');
  const [searchTO, setSearchTO] = useState(null);

  useEffect(() => { fetchUsers(); }, [tab]);

  const fetchUsers = async (q = '') => {
    setLoading(true);
    try {
      const params = {};
      if (tab !== 'all') params.role = tab === 'unverified' ? 'organiser' : tab;
      if (q) params.search = q;
      const res = await adminAPI.getAllUsers(params);
      let data = res.data.data;
      if (tab === 'unverified') data = data.filter(u => !u.organiserProfile?.isVerified);
      if (tab === 'pending')    data = data.filter(u => u.role === 'organiser' && !u.organiserProfile?.isVerified);
      setUsers(data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const handleSearch = (q) => {
    setSearch(q);
    clearTimeout(searchTO);
    setSearchTO(setTimeout(() => fetchUsers(q), 400));
  };

  const verifyOrganiser = async (id, name) => {
    try {
      await adminAPI.verifyOrganiser(id);
      setUsers(prev => prev.map(u =>
        u._id === id ? { ...u, organiserProfile: { ...u.organiserProfile, isVerified: true } } : u
      ));
      toast.success(`✅ ${name} is now a verified organiser!`);
    } catch (err) { toast.error(err.response?.data?.message || 'Verification failed'); }
  };

  const toggleBan = async (id, isActive, name) => {
    const action = isActive ? 'ban' : 'unban';
    if (!window.confirm(`Are you sure you want to ${action} ${name}?`)) return;
    try {
      await adminAPI.updateUser(id, { isActive: !isActive });
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: !isActive } : u));
      toast.success(`${name} has been ${action}ned`);
    } catch { toast.error('Action failed'); }
  };

  const deleteUser = async (id, name) => {
    if (!window.confirm(`Permanently delete ${name}? This cannot be undone.`)) return;
    try {
      await adminAPI.deleteUser(id);
      setUsers(prev => prev.filter(u => u._id !== id));
      toast.success(`${name} deleted`);
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const TABS = [
    { key: 'unverified', label: '⏳ Pending Verification', desc: 'Organisers waiting for your approval' },
    { key: 'organiser',  label: '📋 All Organisers' },
    { key: 'player',     label: '🏃 Players' },
    { key: 'all',        label: '👥 All Users' },
  ];

  const pendingCount = users.filter(u => u.role === 'organiser' && !u.organiserProfile?.isVerified).length;

  return (
    <div className="admin-users-page">
      <div className="au-header">
        <div>
          <h1 className="display au-title">USER MANAGEMENT</h1>
          <p className="au-sub">Verify organisers, manage accounts</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="au-tabs">
        {TABS.map(t => (
          <button key={t.key}
            className={`au-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}>
            {t.label}
            {t.key === 'unverified' && pendingCount > 0 &&
              <span className="au-tab-badge">{pendingCount}</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="au-search">
        <span>🔍</span>
        <input className="form-input" placeholder="Search by name, username, email..."
          value={search} onChange={e => handleSearch(e.target.value)} />
      </div>

      {/* Pending verification notice */}
      {tab === 'unverified' && (
        <div className="verify-notice">
          <span>🔔</span>
          <div>
            <strong>Organiser Verification Queue</strong>
            <p>These organisers have registered and are waiting for your approval before they can create tournaments.</p>
          </div>
        </div>
      )}

      {/* Users list */}
      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon">👥</div>
          <h3>{tab === 'unverified' ? 'No pending verifications 🎉' : 'No users found'}</h3>
          {tab === 'unverified' && <p>All organisers are verified</p>}
        </div>
      ) : (
        <div className="au-list">
          {users.map(u => (
            <div key={u._id} className={`au-card card ${!u.isActive ? 'au-card-banned' : ''}`}>
              {/* Avatar + basic info */}
              <div className="au-card-left">
                <div className="au-avatar-wrap">
                  {u.avatar?.url
                    ? <img src={u.avatar.url} className="avatar avatar-md" alt={u.name} />
                    : <div className="au-avatar-initials">{getInitials(u.name)}</div>}
                  <div className={`au-status-dot ${u.isActive ? 'active' : 'banned'}`} />
                </div>
                <div className="au-info">
                  <div className="au-name-row">
                    <span className="au-name">{u.name}</span>
                    <span className={`badge badge-${u.role === 'admin' ? 'red' : u.role === 'organiser' ? 'blue' : 'gray'}`}>
                      {u.role}
                    </span>
                    {u.role === 'organiser' && u.organiserProfile?.isVerified &&
                      <span className="badge badge-green">✓ Verified</span>}
                    {u.role === 'organiser' && !u.organiserProfile?.isVerified &&
                      <span className="badge badge-yellow">⏳ Unverified</span>}
                    {!u.isActive && <span className="badge badge-red">🚫 Banned</span>}
                  </div>
                  <div className="au-username">@{u.username}</div>
                  <div className="au-meta">
                    <span>✉️ {u.email}</span>
                    {u.phone && <span>📱 {u.phone}</span>}
                    {u.city && <span>📍 {u.city}{u.state ? `, ${u.state}` : ''}</span>}
                    <span>📅 Joined {formatDate(u.createdAt)}</span>
                  </div>
                  {u.role === 'organiser' && (
                    <div className="au-org-info">
                      {u.organiserProfile?.organizationName &&
                        <span>🏢 {u.organiserProfile.organizationName}</span>}
                      {u.organiserProfile?.tournamentsOrganised > 0 &&
                        <span>🏆 {u.organiserProfile.tournamentsOrganised} tournaments</span>}
                      {u.organiserProfile?.rating > 0 &&
                        <span>⭐ {u.organiserProfile.rating} rating</span>}
                    </div>
                  )}
                  {u.role === 'player' && (
                    <div className="au-org-info">
                      <span>👥 {formatNumber(u.followersCount || 0)} followers</span>
                      {u.sportProfiles?.length > 0 &&
                        <span>🎮 {u.sportProfiles.map(s => s.sport).join(', ')}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="au-actions">
                {/* Verify organiser — THE KEY BUTTON */}
                {u.role === 'organiser' && !u.organiserProfile?.isVerified && (
                  <button className="btn btn-primary btn-sm verify-btn"
                    onClick={() => verifyOrganiser(u._id, u.name)}>
                    ✓ Verify Organiser
                  </button>
                )}

                {/* Ban / Unban */}
                {u.role !== 'admin' && (
                  <button
                    className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-ghost'}`}
                    onClick={() => toggleBan(u._id, u.isActive, u.name)}>
                    {u.isActive ? '🚫 Ban' : '✅ Unban'}
                  </button>
                )}

                {/* Delete */}
                {u.role !== 'admin' && (
                  <button className="btn btn-outline btn-sm delete-btn"
                    onClick={() => deleteUser(u._id, u.name)}>
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
