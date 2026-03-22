import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar  from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';

// Pages
import LoginPage           from './pages/auth/LoginPage';
import RegisterPage        from './pages/auth/RegisterPage';
import ExplorePage         from './pages/player/ExplorePage';
import ProfilePage         from './pages/player/ProfilePage';
import LeaderboardPage     from './pages/player/LeaderboardPage';
import TournamentDetailPage from './pages/player/TournamentDetailPage';
import { MyRegistrationsPage, WalletPage } from './pages/player/PlayerPages';
import CreateTournamentPage from './pages/organiser/CreateTournamentPage';
import OrganiserDashboard  from './pages/organiser/OrganiserDashboard';
import AdminDashboard      from './pages/admin/AdminDashboard';
import AdminUsersPage      from './pages/admin/AdminUsersPage';

import './styles/global.css';
import './pages/player/ExplorePage.css';

// ── Protected route wrappers ──────────────────────────────────────
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ role, children }) {
  const { user, loading, isAdmin, isOrganiser } = useAuth();
  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (role === 'admin'     && !isAdmin)     return <Navigate to="/explore" replace />;
  if (role === 'organiser' && !isOrganiser && !isAdmin) return <Navigate to="/explore" replace />;
  return children;
}

// ── App layout (with sidebar) ─────────────────────────────────────
function AppLayout({ children }) {
  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}

// ── Full-width layout (no sidebar, for auth pages) ────────────────
function FullLayout({ children }) {
  return (
    <div className="page-wrapper">
      <Navbar />
      {children}
    </div>
  );
}

// ── Main routes ───────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"        element={<Navigate to="/explore" replace />} />
      <Route path="/login"   element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Public with layout */}
      <Route path="/explore"      element={<FullLayout><ExplorePage /></FullLayout>} />
      <Route path="/tournaments"  element={<FullLayout><ExplorePage /></FullLayout>} />
      <Route path="/tournaments/:slugOrId" element={<FullLayout><TournamentDetailPage /></FullLayout>} />
      <Route path="/leaderboard"  element={<AppLayout><LeaderboardPage /></AppLayout>} />
      <Route path="/u/:username"  element={<FullLayout><ProfilePage /></FullLayout>} />

      {/* Authenticated */}
      <Route path="/my-registrations" element={
        <RequireAuth><AppLayout><MyRegistrationsPage /></AppLayout></RequireAuth>
      } />
      <Route path="/wallet" element={
        <RequireAuth><AppLayout><WalletPage /></AppLayout></RequireAuth>
      } />

      {/* Organiser */}
      <Route path="/organiser/dashboard" element={
        <RequireRole role="organiser"><AppLayout><OrganiserDashboard /></AppLayout></RequireRole>
      } />
      <Route path="/organiser/tournaments" element={
        <RequireRole role="organiser"><AppLayout><OrganiserDashboard /></AppLayout></RequireRole>
      } />
      <Route path="/organiser/create" element={
        <RequireRole role="organiser"><AppLayout><CreateTournamentPage /></AppLayout></RequireRole>
      } />

      {/* Admin */}
      <Route path="/admin/dashboard" element={
        <RequireRole role="admin"><AppLayout><AdminDashboard /></AppLayout></RequireRole>
      } />
      <Route path="/admin/users" element={
        <RequireRole role="admin"><AppLayout><AdminUsersPage /></AppLayout></RequireRole>
      } />
      <Route path="/admin/approvals" element={
        <RequireRole role="admin"><AppLayout><AdminDashboard /></AppLayout></RequireRole>
      } />

      {/* 404 */}
      <Route path="*" element={
        <div className="page-loader" style={{ flexDirection:'column', gap:12 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize: 80, color:'var(--text-muted)' }}>404</div>
          <div style={{ color: 'var(--text-secondary)' }}>Page not found</div>
          <a href="/explore" className="btn btn-primary" style={{ marginTop: 12 }}>Go Home</a>
        </div>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: '12px',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: 'var(--green)', secondary: '#000' } },
            error:   { iconTheme: { primary: 'var(--red)',   secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
