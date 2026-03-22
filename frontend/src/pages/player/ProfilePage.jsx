import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { userAPI, postAPI } from "../../api";
import { useAuth } from "../../context/AuthContext";
import {
  formatNumber,
  formatDate,
  getInitials,
  sportEmoji,
  winRateColor,
  timeFromNow,
} from "../../utils/helpers";
import toast from "react-hot-toast";
import "./ProfilePage.css";

export default function ProfilePage() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [tab, setTab] = useState("stats");
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([userAPI.getProfile(username)])
      .then(async ([pRes]) => {
        const profileData = pRes.data.data;
        setProfile(profileData);
        setFollowing(profileData.isFollowing);

        const postsRes = await postAPI
          .getUserPosts(profileData._id)
          .catch(() => ({ data: { data: [] } }));
        setPosts(postsRes.data.data);

        const tourRes = await userAPI
          .getUserTournaments(profileData._id)
          .catch(() => ({ data: { data: [] } }));
        setTournaments(tourRes.data.data);
      })
      .catch(() => toast.error("Profile not found"))
      .finally(() => setLoading(false));
  }, [username]);

  const toggleFollow = async () => {
    if (!me) return toast.error("Login to follow");
    try {
      await userAPI.toggleFollow(profile._id);
      setFollowing((f) => !f);
      setProfile((p) => ({
        ...p,
        followersCount: following ? p.followersCount - 1 : p.followersCount + 1,
      }));
    } catch {
      toast.error("Failed");
    }
  };

  if (loading)
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  if (!profile)
    return (
      <div className="empty-state">
        <h3>User not found</h3>
      </div>
    );

  const isMe = me?._id === profile._id || me?.username === username;

  // Aggregate stats
  const totalMatches =
    profile.sportProfiles?.reduce(
      (s, sp) => s + (sp.stats?.matchesPlayed || 0),
      0,
    ) || 0;
  const totalWins =
    profile.sportProfiles?.reduce((s, sp) => s + (sp.stats?.wins || 0), 0) || 0;
  const totalLosses =
    profile.sportProfiles?.reduce((s, sp) => s + (sp.stats?.losses || 0), 0) ||
    0;
  const winRate =
    totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  return (
    <div className="profile-page anim-fadeIn">
      {/* Header */}
      <div className="profile-header">
        <div className="profile-bg-mesh" />
        <div className="profile-header-inner">
          <div className="profile-avatar-wrap">
            {profile.avatar?.url ? (
              <img
                src={profile.avatar.url}
                className="avatar avatar-2xl avatar-ring"
                alt={profile.name}
              />
            ) : (
              <div className="avatar-initials-lg">
                {getInitials(profile.name)}
              </div>
            )}
          </div>

          <div className="profile-info">
            <div className="profile-name-row">
              <h1 className="profile-name">{profile.name}</h1>
              {profile.role === "organiser" &&
                profile.organiserProfile?.isVerified && (
                  <span className="verified-badge">✓ Verified</span>
                )}
              {profile.role === "admin" && (
                <span className="admin-badge">🛡️ Admin</span>
              )}
            </div>
            <div className="profile-username">@{profile.username}</div>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}

            <div className="profile-meta-row">
              {profile.city && (
                <span>
                  📍 {profile.city}
                  {profile.state ? `, ${profile.state}` : ""}
                </span>
              )}
              <span
                className="badge badge-blue"
                style={{ textTransform: "capitalize" }}
              >
                {profile.role}
              </span>
              {profile.role === "organiser" &&
                profile.organiserProfile?.rating > 0 && (
                  <span className="org-rating">
                    ⭐ {profile.organiserProfile.rating}
                  </span>
                )}
            </div>

            {/* Social stats */}
            <div className="profile-social-stats">
              <Link to={`/u/${username}/followers`} className="social-stat">
                <span className="social-val">
                  {formatNumber(profile.followersCount)}
                </span>
                <span className="social-lbl">Supporters</span>
              </Link>
              <Link to={`/u/${username}/following`} className="social-stat">
                <span className="social-val">
                  {formatNumber(profile.followingCount)}
                </span>
                <span className="social-lbl">Network</span>
              </Link>
              <div className="social-stat">
                <span className="social-val">{profile.postsCount || 0}</span>
                <span className="social-lbl">Posts</span>
              </div>
            </div>
          </div>

          <div className="profile-actions">
            {isMe ? (
              <Link to="/settings" className="btn btn-outline btn-sm">
                ✏️ Edit Profile
              </Link>
            ) : (
              <button
                className={`btn btn-sm ${following ? "btn-outline" : "btn-blue"}`}
                onClick={toggleFollow}
              >
                {following ? "✓ Following" : "+ Follow"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overall Stats Row - like reference image */}
      <div className="stats-band">
        <div className="stat-card anim-fadeUp d1">
          <div className="stat-icon">🎮</div>
          <div className="stat-value">{totalMatches}</div>
          <div className="stat-label">Matches Played</div>
        </div>
        <div className="stat-card anim-fadeUp d2">
          <div className="stat-icon">🏆</div>
          <div className="stat-value">{totalWins}</div>
          <div className="stat-label">Matches Won</div>
        </div>
        <div className="stat-card anim-fadeUp d3">
          <div className="stat-icon">💀</div>
          <div className="stat-value">{totalLosses}</div>
          <div className="stat-label">Matches Lost</div>
        </div>
        <div
          className="stat-card anim-fadeUp d4"
          style={{ borderColor: `${winRateColor(winRate)}40` }}
        >
          <div className="stat-icon">📈</div>
          <div className="stat-value" style={{ color: winRateColor(winRate) }}>
            {winRate}%
          </div>
          <div className="stat-label">Win Rate</div>
        </div>
        <div className="stat-card anim-fadeUp d5">
          <div className="stat-icon">🏟️</div>
          <div className="stat-value">{tournaments.length}</div>
          <div className="stat-label">Tournaments</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        {["stats", "posts", "tournaments"].map((t) => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "stats"
              ? "📊 Stats"
              : t === "posts"
                ? "📝 Posts"
                : "🏆 Tournaments"}
          </button>
        ))}
      </div>

      <div className="profile-body">
        {/* Stats tab */}
        {tab === "stats" && (
          <div className="profile-stats-tab anim-fadeIn">
            {/* Winning probability circle */}
            {totalMatches > 0 && (
              <div className="win-prob-card card">
                <div className="wpc-left">
                  <WinCircle pct={winRate} />
                </div>
                <div className="wpc-right">
                  <div className="wpc-title">Winning Probability</div>
                  <div className="wpc-sub">
                    Based on {totalMatches} matches played
                  </div>
                  <div className="wpc-breakdown">
                    <div className="wpc-row">
                      <span className="dot green" />
                      <span>{totalWins} Wins</span>
                    </div>
                    <div className="wpc-row">
                      <span className="dot red" />
                      <span>{totalLosses} Losses</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Game Performance - sport cards */}
            {profile.sportProfiles?.length > 0 && (
              <div>
                <div className="section-title">Game Performance</div>
                <div className="sport-perf-grid">
                  {profile.sportProfiles.map((sp, i) => (
                    <div
                      key={i}
                      className="sport-perf-card card anim-fadeUp"
                      style={{ animationDelay: `${i * 0.07}s` }}
                    >
                      <div className="spc-header">
                        <span className="spc-icon">
                          {sportEmoji[sp.sport] || "🏅"}
                        </span>
                        <span className="spc-name">{sp.sport}</span>
                      </div>
                      <div className="spc-stats">
                        <div>
                          <span className="spc-val">
                            {sp.stats?.matchesPlayed || 0}
                          </span>
                          <span className="spc-lbl">Played</span>
                        </div>
                        <div>
                          <span className="spc-val">{sp.stats?.wins || 0}</span>
                          <span className="spc-lbl">Wins</span>
                        </div>
                      </div>
                      <div className="spc-rating">
                        🥇 {sp.stats?.totalPoints || 0} pts
                      </div>
                      <div className="progress-bar" style={{ marginTop: 8 }}>
                        <div
                          className="progress-fill green"
                          style={{
                            width: `${sp.stats?.matchesPlayed > 0 ? Math.round((sp.stats.wins / sp.stats.matchesPlayed) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.role === "organiser" && (
              <div className="org-stats-card card">
                <div className="section-title">Organiser Stats</div>
                <div className="org-stats-row">
                  <div className="stat-card">
                    <div className="stat-value">
                      {profile.organiserProfile?.tournamentsOrganised || 0}
                    </div>
                    <div className="stat-label">Tournaments Organised</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">
                      {profile.organiserProfile?.rating || 0}
                    </div>
                    <div className="stat-label">Avg Rating ⭐</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">
                      {profile.organiserProfile?.totalReviews || 0}
                    </div>
                    <div className="stat-label">Total Reviews</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Posts tab */}
        {tab === "posts" && (
          <div className="posts-tab anim-fadeIn">
            {posts.length === 0 ? (
              <div className="empty-state">
                <div className="es-icon">📝</div>
                <h3>No posts yet</h3>
              </div>
            ) : (
              posts.map((p) => (
                <div key={p._id} className="post-card card">
                  <div className="post-header">
                    <div className="avatar avatar-sm">
                      {profile.avatar?.url ? (
                        <img
                          src={profile.avatar.url}
                          className="avatar avatar-sm"
                          alt=""
                        />
                      ) : (
                        <span className="avatar-placeholder sm">
                          {getInitials(profile.name)}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="post-author">{profile.name}</div>
                      <div className="post-time">
                        {timeFromNow(p.createdAt)}
                      </div>
                    </div>
                  </div>
                  {p.content && <p className="post-content">{p.content}</p>}
                  {p.media?.length > 0 && (
                    <img src={p.media[0].url} className="post-media" alt="" />
                  )}
                  <div className="post-footer">
                    <span>❤️ {p.likesCount}</span>
                    <span>💬 {p.commentsCount}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tournaments tab */}
        {tab === "tournaments" && (
          <div className="tournaments-tab anim-fadeIn">
            {tournaments.length === 0 ? (
              <div className="empty-state">
                <div className="es-icon">🏆</div>
                <h3>No tournaments yet</h3>
              </div>
            ) : (
              tournaments.map((reg) => (
                <Link
                  key={reg._id}
                  to={`/tournaments/${reg.tournament?.slug || reg.tournament?._id}`}
                  className="reg-row card card-hover"
                >
                  <div className="reg-sport">
                    {sportEmoji[reg.tournament?.sport]} {reg.tournament?.sport}
                  </div>
                  <div className="reg-title">{reg.tournament?.title}</div>
                  <div className="reg-date">
                    {formatDate(reg.tournament?.tournamentStartDate)}
                  </div>
                  <div
                    className={`badge badge-${reg.status === "confirmed" ? "green" : "gray"}`}
                  >
                    {reg.status}
                  </div>
                  {reg.certificate?.issued && (
                    <span className="badge badge-yellow">🎓 Cert</span>
                  )}
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function WinCircle({ pct }) {
  const r = 54,
    circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="win-circle">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle
          cx="65"
          cy="65"
          r={r}
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth="10"
        />
        <circle
          cx="65"
          cy="65"
          r={r}
          fill="none"
          stroke="var(--green)"
          strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "65px 65px",
            transition: "stroke-dashoffset 1s ease",
          }}
        />
        <text
          x="65"
          y="58"
          textAnchor="middle"
          fill="var(--text-primary)"
          style={{ fontFamily: "Bebas Neue", fontSize: 28, letterSpacing: 1 }}
        >
          {pct}%
        </text>
        <text
          x="65"
          y="76"
          textAnchor="middle"
          fill="var(--text-muted)"
          style={{ fontSize: 10 }}
        >
          WIN RATE
        </text>
      </svg>
    </div>
  );
}
