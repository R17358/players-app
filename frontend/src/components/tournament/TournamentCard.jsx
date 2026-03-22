import React from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatCurrency, statusConfig, sportEmoji } from '../../utils/helpers';
import './TournamentCard.css';

export default function TournamentCard({ t }) {
  const cfg = statusConfig[t.status] || statusConfig.draft;
  const spotsLeft = t.maxParticipants - t.currentParticipants;
  const fillPct   = Math.round((t.currentParticipants / t.maxParticipants) * 100);

  return (
    <Link to={`/tournaments/${t.slug || t._id}`} className="t-card card card-hover anim-fadeUp">
      {/* Banner */}
      <div className="t-card-banner">
        {t.banner?.url
          ? <img src={t.banner.url} alt={t.title} />
          : <div className="t-card-banner-placeholder">
              <span>{sportEmoji[t.sport] || '🏅'}</span>
            </div>
        }
        {t.isFeatured && <div className="t-card-featured">⭐ Featured</div>}
        <div className={`t-card-status badge badge-${cfg.color}`}>{cfg.label}</div>
      </div>

      {/* Body */}
      <div className="t-card-body">
        <div className="t-card-sport sport-chip">{sportEmoji[t.sport]} {t.sport}</div>
        <h3 className="t-card-title">{t.title}</h3>

        <div className="t-card-org">
          {t.organiser?.avatar?.url
            ? <img src={t.organiser.avatar.url} className="avatar avatar-xs" alt="" />
            : <span className="avatar-placeholder" style={{ width:20, height:20, fontSize:9 }}>
                {(t.organiser?.name||'?')[0]}
              </span>
          }
          <span>{t.organiser?.organiserProfile?.organizationName || t.organiser?.name}</span>
          {t.organiser?.organiserProfile?.isVerified && <span className="verified-tick">✓</span>}
        </div>

        <div className="t-card-meta">
          <span>📅 {formatDate(t.tournamentStartDate)}</span>
          <span>📍 {t.location?.city}</span>
        </div>

        {/* Slots bar */}
        <div className="t-card-slots">
          <div className="slots-label">
            <span>{t.currentParticipants} / {t.maxParticipants} slots</span>
            <span className={spotsLeft <= 5 ? 'text-red' : 'text-green'}>{spotsLeft} left</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${fillPct}%` }} />
          </div>
        </div>

        {/* Footer */}
        <div className="t-card-footer">
          <div className="t-card-prize">
            {t.isFree
              ? <span className="badge badge-green">FREE</span>
              : <><span className="prize-label">Prize</span>
                 <span className="prize-val">{formatCurrency(t.prizes?.totalPrizePool || 0)}</span></>
            }
          </div>
          <div className="t-card-fee">
            {t.isFree
              ? <span className="fee-free">Free Entry</span>
              : <><span className="fee-label">Entry</span>
                 <span className="fee-val">{formatCurrency(t.registrationFee)}</span></>
            }
          </div>
        </div>
      </div>
    </Link>
  );
}
