import React, { useState, useEffect } from 'react';
import { reviewAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './ReviewSection.css';

// ── Star Rating input ────────────────────────────────────────────
function StarRating({ value, onChange, size = 24 }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-rating">
      {[1,2,3,4,5].map(star => (
        <span key={star}
          className={`star ${star <= (hover || value) ? 'filled' : ''}`}
          style={{ fontSize: size }}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}>
          ★
        </span>
      ))}
    </div>
  );
}

// ── Leave Review Modal ───────────────────────────────────────────
export function ReviewModal({ tournament, onClose, onSubmitted }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    rating: 0, title: '', comment: '',
    categories: { organization: 0, fairplay: 0, infrastructure: 0, communication: 0 },
  });
  const [submitting, setSubmitting] = useState(false);

  const setCat = (k, v) => setForm(f => ({ ...f, categories: { ...f.categories, [k]: v } }));

  const handleSubmit = async () => {
    if (form.rating === 0) { toast.error('Please select an overall rating'); return; }
    setSubmitting(true);
    try {
      await reviewAPI.create({ tournamentId: tournament._id, ...form });
      toast.success('Review submitted! ⭐');
      onSubmitted?.();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to submit review'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card card review-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Rate this Tournament</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="review-tournament-info">
            <strong>{tournament.title}</strong>
            <span style={{fontSize:12,color:'var(--text-secondary)'}}>
              Organised by {tournament.organiser?.name}
            </span>
          </div>

          {/* Overall rating */}
          <div className="form-group">
            <label className="form-label">Overall Rating</label>
            <StarRating value={form.rating} onChange={v => setForm(f => ({...f, rating: v}))} size={32} />
            <div className="rating-label">
              {form.rating === 1 ? '😞 Poor' : form.rating === 2 ? '😐 Fair' :
               form.rating === 3 ? '🙂 Good' : form.rating === 4 ? '😊 Great' :
               form.rating === 5 ? '🤩 Excellent' : 'Tap to rate'}
            </div>
          </div>

          {/* Category ratings */}
          <div className="category-ratings">
            {[
              ['organization',  '📋 Organization'],
              ['fairplay',      '🤝 Fair Play'],
              ['infrastructure','🏟️ Infrastructure'],
              ['communication', '📢 Communication'],
            ].map(([key, label]) => (
              <div key={key} className="cat-rating-row">
                <span className="cat-label">{label}</span>
                <StarRating value={form.categories[key]} onChange={v => setCat(key, v)} size={18} />
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Review Title</label>
            <input className="form-input" placeholder="Summarize your experience" value={form.title}
              onChange={e => setForm(f => ({...f, title: e.target.value}))} maxLength={100} />
          </div>
          <div className="form-group">
            <label className="form-label">Your Review</label>
            <textarea className="form-input form-textarea" placeholder="Share details about your experience..."
              value={form.comment} onChange={e => setForm(f => ({...f, comment: e.target.value}))}
              maxLength={1000} rows={4} />
            <span style={{fontSize:11,color:'var(--text-muted)',textAlign:'right'}}>{form.comment.length}/1000</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || form.rating === 0}>
            {submitting ? <span className="spinner" style={{width:16,height:16,borderWidth:2}} /> : '⭐ Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reviews Display Section ──────────────────────────────────────
export function ReviewsSection({ tournamentId, organiserId }) {
  const [reviews, setReviews]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [avgRating, setAvg]     = useState(0);

  useEffect(() => {
    const fn = tournamentId
      ? reviewAPI.getForTournament(tournamentId)
      : reviewAPI.getForOrganiser(organiserId);
    fn.then(r => {
      setReviews(r.data.data);
      if (r.data.data.length > 0) {
        const avg = r.data.data.reduce((s, r) => s + r.rating, 0) / r.data.data.length;
        setAvg(Math.round(avg * 10) / 10);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [tournamentId, organiserId]);

  if (loading) return <div style={{padding:20,textAlign:'center'}}><div className="spinner" /></div>;
  if (reviews.length === 0) return (
    <div className="empty-state" style={{padding:'30px 0'}}>
      <div className="es-icon">⭐</div>
      <h3>No reviews yet</h3>
    </div>
  );

  return (
    <div className="reviews-section">
      {/* Summary */}
      <div className="reviews-summary">
        <div className="rs-big-rating">{avgRating}</div>
        <div>
          <div className="rs-stars">{'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}</div>
          <div className="rs-count">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Review list */}
      {reviews.map(r => (
        <div key={r._id} className="review-card">
          <div className="rc-header">
            <div className="rc-user">
              {r.reviewer?.avatar?.url
                ? <img src={r.reviewer.avatar.url} className="avatar avatar-sm" alt="" />
                : <div className="rc-av">{(r.reviewer?.name||'?')[0]}</div>}
              <div>
                <div className="rc-name">{r.reviewer?.name}</div>
                <div className="rc-meta">@{r.reviewer?.username}
                  {r.isVerifiedParticipant && <span className="badge badge-green" style={{fontSize:9,marginLeft:6}}>✓ Participant</span>}
                </div>
              </div>
            </div>
            <div className="rc-rating-stars">
              {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
            </div>
          </div>
          {r.title   && <div className="rc-title">{r.title}</div>}
          {r.comment && <p className="rc-comment">{r.comment}</p>}
          {r.categories && Object.values(r.categories).some(v => v > 0) && (
            <div className="rc-cats">
              {Object.entries(r.categories).map(([k, v]) => v > 0 && (
                <span key={k} className="rc-cat-chip">
                  {k}: {'★'.repeat(v)}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
