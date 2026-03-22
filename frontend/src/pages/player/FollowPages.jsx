import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { getInitials, formatNumber } from '../../utils/helpers';
import toast from 'react-hot-toast';
import './FollowPages.css';

// ── Shared User Row component ─────────────────────────────────────
function UserRow({ u, onFollowToggle, myFollowing = [] }) {
  const { user: me } = useAuth();
  const isMe         = me?._id === u._id || me?.username === u.username;
  const isFollowing  = myFollowing.includes(u._id);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    if (!me) { toast.error('Login to follow'); return; }
    setLoading(true);
    try {
      await userAPI.toggleFollow(u._id);
      onFollowToggle(u._id);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="user-row card card-hover anim-fadeUp">
      <Link to={`/u/${u.username}`} className="user-row-left">
        {u.avatar?.url
          ? <img src={u.avatar.url} className="avatar avatar-md" alt={u.name} />
          : <div className="ur-initials">{getInitials(u.name)}</div>
        }
        <div className="ur-info">
          <div className="ur-name-row">
            <span className="ur-name">{u.name}</span>
            {u.role === 'organiser' && u.organiserProfile?.isVerified &&
              <span className="badge badge-blue" style={{fontSize:9}}>✓ Org</span>}
            {u.role === 'admin' &&
              <span className="badge badge-red" style={{fontSize:9}}>Admin</span>}
          </div>
          <div className="ur-username">@{u.username}</div>
          <div className="ur-meta">
            {u.city && <span>📍 {u.city}</span>}
            <span>👥 {formatNumber(u.followersCount || 0)} followers</span>
            {u.sportProfiles?.length > 0 &&
              <span>🎮 {u.sportProfiles.slice(0,2).map(s => s.sport).join(', ')}</span>}
          </div>
        </div>
      </Link>

      {!isMe && me && (
        <button
          className={`btn btn-sm ${isFollowing ? 'btn-outline' : 'btn-blue'}`}
          onClick={handleFollow} disabled={loading}>
          {loading
            ? <span className="spinner" style={{width:14,height:14,borderWidth:2}} />
            : isFollowing ? '✓ Following' : '+ Follow'
          }
        </button>
      )}
    </div>
  );
}

// ── Followers Page ────────────────────────────────────────────────
export function FollowersPage() {
  const { username }      = useParams();
  const navigate          = useNavigate();
  const { user: me }      = useAuth();
  const [profile, setProfile]     = useState(null);
  const [followers, setFollowers] = useState([]);
  const [myFollowing, setMyFollowing] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        // Get profile first to get the ID
        const pRes = await userAPI.getProfile(username);
        const prof = pRes.data.data;
        setProfile(prof);

        // Get followers list
        const fRes = await userAPI.getFollowers(prof._id);
        setFollowers(fRes.data.data);

        // Get my following list for button states
        if (me) {
          const mRes = await userAPI.getFollowing(me._id || me.id);
          setMyFollowing(mRes.data.data.map(u => u._id));
        }
      } catch {
        toast.error('Failed to load followers');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username, me]);

  const handleFollowToggle = (userId) => {
    setMyFollowing(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filtered = followers.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="follow-page">
      {/* Header */}
      <div className="follow-header">
        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/u/${username}`)}>
          ← Back
        </button>
        <div className="follow-title-row">
          {profile?.avatar?.url
            ? <img src={profile.avatar.url} className="avatar avatar-sm" alt="" />
            : <div className="ur-initials sm">{getInitials(profile?.name)}</div>}
          <div>
            <h1 className="follow-title">Supporters</h1>
            <div className="follow-sub">
              People following <strong>@{username}</strong>
            </div>
          </div>
        </div>
        <div className="follow-count">{formatNumber(profile?.followersCount || 0)}</div>
      </div>

      {/* Search */}
      {followers.length > 5 && (
        <div className="follow-search">
          <input className="form-input" placeholder="🔍 Search followers..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {/* List */}
      {filtered.length === 0
        ? <div className="empty-state">
            <div className="es-icon">👥</div>
            <h3>{search ? 'No results' : 'No followers yet'}</h3>
            {!search && <p>Be the first to follow @{username}!</p>}
          </div>
        : <div className="follow-list">
            {filtered.map((u, i) => (
              <UserRow key={u._id} u={u}
                myFollowing={myFollowing}
                onFollowToggle={handleFollowToggle} />
            ))}
          </div>
      }
    </div>
  );
}

// ── Following Page ────────────────────────────────────────────────
export function FollowingPage() {
  const { username }      = useParams();
  const navigate          = useNavigate();
  const { user: me }      = useAuth();
  const [profile, setProfile]     = useState(null);
  const [following, setFollowing] = useState([]);
  const [myFollowing, setMyFollowing] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const pRes = await userAPI.getProfile(username);
        const prof = pRes.data.data;
        setProfile(prof);

        const fRes = await userAPI.getFollowing(prof._id);
        setFollowing(fRes.data.data);

        if (me) {
          const mRes = await userAPI.getFollowing(me._id || me.id);
          setMyFollowing(mRes.data.data.map(u => u._id));
        }
      } catch {
        toast.error('Failed to load following');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username, me]);

  const handleFollowToggle = (userId) => {
    setMyFollowing(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filtered = following.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="follow-page">
      {/* Header */}
      <div className="follow-header">
        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/u/${username}`)}>
          ← Back
        </button>
        <div className="follow-title-row">
          {profile?.avatar?.url
            ? <img src={profile.avatar.url} className="avatar avatar-sm" alt="" />
            : <div className="ur-initials sm">{getInitials(profile?.name)}</div>}
          <div>
            <h1 className="follow-title">Network</h1>
            <div className="follow-sub">
              People <strong>@{username}</strong> follows
            </div>
          </div>
        </div>
        <div className="follow-count">{formatNumber(profile?.followingCount || 0)}</div>
      </div>

      {/* Search */}
      {following.length > 5 && (
        <div className="follow-search">
          <input className="form-input" placeholder="🔍 Search network..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {/* List */}
      {filtered.length === 0
        ? <div className="empty-state">
            <div className="es-icon">🌐</div>
            <h3>{search ? 'No results' : 'Not following anyone yet'}</h3>
            {!search && <p><Link to="/explore" className="text-blue">Explore tournaments</Link> to discover players</p>}
          </div>
        : <div className="follow-list">
            {filtered.map((u, i) => (
              <UserRow key={u._id} u={u}
                myFollowing={myFollowing}
                onFollowToggle={handleFollowToggle} />
            ))}
          </div>
      }
    </div>
  );
}
