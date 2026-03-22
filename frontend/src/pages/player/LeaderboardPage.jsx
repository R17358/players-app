import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatNumber, getInitials, sportEmoji } from '../../utils/helpers';
import './LeaderboardPage.css';

const SPORTS = ['all','cricket','football','basketball','badminton','tennis','chess','volleyball','other'];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport]     = useState('all');
  const [city, setCity]       = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, [sport, city]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const params = { limit: 30 };
      if (sport !== 'all') params.sport = sport;
      if (city) params.city = city;
      const res = await userAPI.getLeaderboard(params);
      setPlayers(res.data.data);
    } catch { } finally { setLoading(false); }
  };

  const top3   = players.slice(0, 3);
  const rest   = players.slice(3);

  return (
    <div className="lb-page">
      {/* Hero header */}
      <div className="lb-hero">
        <div className="lb-hero-glow" />
        <h1 className="lb-title display">LEADERBOARD</h1>
        <p className="lb-sub">Top athletes ranked by performance</p>
      </div>

      {/* Filter tabs */}
      <div className="lb-filters">
        <div className="sport-tabs" style={{ borderBottom: 'none', padding: '0' }}>
          {SPORTS.map(s => (
            <button key={s} className={`sport-tab ${sport === s ? 'active' : ''}`} onClick={() => setSport(s)}>
              {s === 'all' ? '🌐 Overall' : `${sportEmoji[s] || '🏅'} ${s}`}
            </button>
          ))}
        </div>
        <input className="form-input lb-city" placeholder="📍 Filter by city..."
          value={city} onChange={e => setCity(e.target.value)} />
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : players.length === 0 ? (
        <div className="empty-state"><div className="es-icon">📊</div><h3>No players found</h3></div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length >= 1 && (
            <div className="podium-section">
              {/* Reorder: 2nd, 1st, 3rd */}
              {[top3[1], top3[0], top3[2]].filter(Boolean).map((p, visualIdx) => {
                const actualRank = visualIdx === 1 ? 1 : visualIdx === 0 ? 2 : 3;
                const rankClass  = `podium-${actualRank}`;
                const rankColor  = actualRank === 1 ? 'var(--accent)' : actualRank === 2 ? '#c0c8d8' : '#cd7f32';
                const crown      = actualRank === 1 ? '👑' : actualRank === 2 ? '🥈' : '🥉';
                if (!p) return null;
                const totalPts = p.sportProfiles?.reduce((s, sp) => s + (sp.stats?.totalPoints || 0), 0) || 0;
                const wins     = p.sportProfiles?.reduce((s, sp) => s + (sp.stats?.wins || 0), 0) || 0;

                return (
                  <Link to={`/u/${p.username}`} key={p._id}
                    className={`podium-card ${rankClass} ${actualRank === 1 ? 'podium-center' : ''}`}>
                    <div className="podium-crown">{crown}</div>
                    <div className="podium-rank" style={{ color: rankColor }}>#{actualRank}</div>
                    <div className="podium-avatar-wrap" style={{ borderColor: rankColor }}>
                      {p.avatar?.url
                        ? <img src={p.avatar.url} className="avatar avatar-lg" alt={p.name} />
                        : <div className="avatar-initials-md" style={{ background: rankColor + '22', color: rankColor }}>
                            {getInitials(p.name)}
                          </div>
                      }
                    </div>
                    <div className="podium-name">{p.name}</div>
                    <div className="podium-username">@{p.username}</div>
                    {p.city && <div className="podium-city">📍 {p.city}</div>}
                    <div className="podium-points" style={{ color: rankColor }}>
                      {formatNumber(totalPts)} <span>PTS</span>
                    </div>
                    <div className="podium-wins">{wins} Wins</div>
                    <div className="podium-tier badge" style={{ background: rankColor + '20', color: rankColor }}>
                      {actualRank === 1 ? 'Grandmaster' : actualRank === 2 ? 'Ace Player' : 'Tactician'}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Remaining list */}
          <div className="lb-list">
            {rest.map((p, i) => {
              const rank     = i + 4;
              const totalPts = p.sportProfiles?.reduce((s, sp) => s + (sp.stats?.totalPoints || 0), 0) || 0;
              const wins     = p.sportProfiles?.reduce((s, sp) => s + (sp.stats?.wins || 0), 0) || 0;
              const played   = p.sportProfiles?.reduce((s, sp) => s + (sp.stats?.matchesPlayed || 0), 0) || 0;
              const winRate  = played > 0 ? Math.round((wins / played) * 100) : 0;
              const isMe     = user?.username === p.username;

              return (
                <Link to={`/u/${p.username}`} key={p._id}
                  className={`lb-row card card-hover anim-fadeUp ${isMe ? 'lb-row-me' : ''}`}
                  style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="lb-rank">#{rank}</div>
                  <div className="lb-avatar">
                    {p.avatar?.url
                      ? <img src={p.avatar.url} className="avatar avatar-md" alt={p.name} />
                      : <div className="avatar-initials-md">{getInitials(p.name)}</div>}
                  </div>
                  <div className="lb-info">
                    <div className="lb-name">{p.name} {isMe && <span className="you-tag">YOU</span>}</div>
                    <div className="lb-meta">@{p.username}{p.city ? ` · ${p.city}` : ''}</div>
                  </div>
                  <div className="lb-stats">
                    <div className="lb-stat">
                      <span className="lb-stat-val">{formatNumber(totalPts)}</span>
                      <span className="lb-stat-lbl">PTS</span>
                    </div>
                    <div className="lb-stat">
                      <span className="lb-stat-val" style={{ color: winRate >= 60 ? 'var(--green)' : winRate >= 40 ? 'var(--accent)' : 'var(--red)' }}>
                        {winRate}%
                      </span>
                      <span className="lb-stat-lbl">WIN</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* My rank banner */}
          {user && (
            <div className="my-rank-banner">
              🏅 You are ranked in <strong>{city || 'India'}</strong> — keep competing to climb!
            </div>
          )}
        </>
      )}
    </div>
  );
}
