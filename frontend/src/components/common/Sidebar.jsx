import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api';
import './Sidebar.css';

const navItems = [
  { to: '/explore',    icon: '🏠', label: 'Explore'      },
  { to: '/tournaments',icon: '🏆', label: 'Tournaments'   },
  { to: '/leaderboard',icon: '📊', label: 'Leaderboard'   },
  { to: '/feed',       icon: '📰', label: 'Feed'          },
];
const playerItems = [
  { to: '/my-registrations', icon: '🎟️', label: 'My Registrations' },
  { to: '/wallet',           icon: '💰', label: 'Wallet'            },
];
const organiserItems = [
  { to: '/organiser/dashboard',   icon: '📋', label: 'Dashboard'       },
  { to: '/organiser/tournaments', icon: '📅', label: 'My Tournaments'  },
  { to: '/organiser/create',      icon: '➕', label: 'Create Tournament'},
];

export default function Sidebar() {
  const { user, isAdmin, isOrganiser } = useAuth();
  const [pendingTournaments, setPendingTournaments] = useState(0);
  const [pendingOrganisers,  setPendingOrganisers]  = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    // Fetch pending counts for admin badges
    adminAPI.getPending()
      .then(r => setPendingTournaments(r.data.count || r.data.data?.length || 0))
      .catch(() => {});
    adminAPI.getAllUsers({ role: 'organiser' })
      .then(r => {
        const unverified = r.data.data?.filter(u => !u.organiserProfile?.isVerified).length || 0;
        setPendingOrganisers(unverified);
      })
      .catch(() => {});
  }, [isAdmin]);

  const adminItems = [
    { to: '/admin/dashboard', icon: '🛡️', label: 'Admin Panel'  },
    { to: '/admin/approvals', icon: '✅', label: 'Approvals',    badge: pendingTournaments },
    { to: '/admin/users',     icon: '👥', label: 'Users',        badge: pendingOrganisers },
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <div className="sidebar-section">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </NavLink>
          ))}
        </div>

        {user && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">Player</div>
            {playerItems.map(item => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}

        {isOrganiser && !isAdmin && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">Organiser</div>
            {organiserItems.map(item => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">Admin</div>
            {adminItems.map(item => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
                {item.badge > 0 && (
                  <span className="sidebar-badge">{item.badge}</span>
                )}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-brand">SportVibe v1.0</div>
      </div>
    </aside>
  );
}
