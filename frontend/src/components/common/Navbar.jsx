import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../api';
import { getInitials, formatNumber } from '../../utils/helpers';
import toast from 'react-hot-toast';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, isAdmin, isOrganiser } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen]         = useState(false);
  const [notifOpen, setNotifOpen]       = useState(false);
  const [notifs, setNotifs]             = useState([]);
  const [unread, setUnread]             = useState(0);
  const [searchQ, setSearchQ]           = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const menuRef  = useRef();
  const notifRef = useRef();
  const searchTO = useRef();

  useEffect(() => {
    if (user) {
      userAPI.getNotifications()
        .then(r => { setNotifs(r.data.data.slice(0, 8)); setUnread(r.data.unreadCount); })
        .catch(() => {});
    }
  }, [user]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current  && !menuRef.current.contains(e.target))  setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (q) => {
    setSearchQ(q);
    clearTimeout(searchTO.current);
    if (q.length < 2) { setSearchResults([]); return; }
    searchTO.current = setTimeout(async () => {
      try {
        const r = await userAPI.search({ q });
        setSearchResults(r.data.data.slice(0, 5));
      } catch {}
    }, 300);
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/');
  };

  const openNotifs = async () => {
    setNotifOpen(o => !o);
    if (unread > 0) {
      await userAPI.markNotificationsRead().catch(() => {});
      setUnread(0);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-trophy">🏆</span>
          <span className="logo-text">SPORT<span>VIBE</span></span>
        </Link>

        {/* Search */}
        <div className="navbar-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search players, tournaments..."
            value={searchQ}
            onChange={e => handleSearch(e.target.value)}
            onBlur={() => setTimeout(() => setSearchResults([]), 200)}
          />
          {searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map(u => (
                <Link key={u._id} to={`/u/${u.username}`} className="search-result"
                  onClick={() => { setSearchQ(''); setSearchResults([]); }}>
                  <div className="avatar avatar-xs">
                    {u.avatar?.url
                      ? <img src={u.avatar.url} alt={u.name} className="avatar avatar-xs" />
                      : <span className="avatar-initials xs">{getInitials(u.name)}</span>}
                  </div>
                  <div>
                    <div className="sr-name">{u.name}</div>
                    <div className="sr-meta">@{u.username} · {u.role}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="navbar-actions">
          {user ? (
            <>
              {/* Notifications */}
              <div className="notif-wrapper" ref={notifRef}>
                <button className="nav-icon-btn" onClick={openNotifs}>
                  🔔
                  {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
                </button>
                {notifOpen && (
                  <div className="notif-dropdown">
                    <div className="notif-header">Notifications</div>
                    {notifs.length === 0
                      ? <div className="notif-empty">All caught up! 🎉</div>
                      : notifs.map((n, i) => (
                          <div key={i} className={`notif-item ${n.isRead ? '' : 'unread'}`}>
                            <div className="notif-title">{n.title}</div>
                            <div className="notif-msg">{n.message}</div>
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="user-menu-wrapper" ref={menuRef}>
                <button className="user-menu-btn" onClick={() => setMenuOpen(o => !o)}>
                  {user.avatar?.url
                    ? <img src={user.avatar.url} alt={user.name} className="avatar avatar-sm" />
                    : <span className="avatar-placeholder sm">{getInitials(user.name)}</span>}
                  <span className="user-name">{user.name.split(' ')[0]}</span>
                  <span className="chevron">{menuOpen ? '▲' : '▼'}</span>
                </button>
                {menuOpen && (
                  <div className="user-dropdown">
                    <div className="ud-header">
                      <div className="ud-name">{user.name}</div>
                      <div className="ud-role badge badge-blue">{user.role}</div>
                    </div>
                    <Link to={`/u/${user.username}`} className="ud-item" onClick={() => setMenuOpen(false)}>👤 My Profile</Link>
                    <Link to="/my-registrations"     className="ud-item" onClick={() => setMenuOpen(false)}>🏅 My Tournaments</Link>
                    <Link to="/wallet"               className="ud-item" onClick={() => setMenuOpen(false)}>💰 Wallet</Link>
                    {isOrganiser && <Link to="/organiser/dashboard" className="ud-item" onClick={() => setMenuOpen(false)}>📋 Organiser Dashboard</Link>}
                    {isAdmin     && <Link to="/admin/dashboard"     className="ud-item" onClick={() => setMenuOpen(false)}>🛡️ Admin Panel</Link>}
                    <Link to="/settings"             className="ud-item" onClick={() => setMenuOpen(false)}>⚙️ Settings</Link>
                    <div className="ud-divider" />
                    <button className="ud-item danger" onClick={handleLogout}>🚪 Logout</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="auth-btns">
              <Link to="/login"    className="btn btn-outline btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Join Free</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
