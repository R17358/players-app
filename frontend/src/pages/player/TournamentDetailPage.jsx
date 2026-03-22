import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tournamentAPI, registrationAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatDateTime, formatCurrency, statusConfig, sportEmoji, openRazorpay } from '../../utils/helpers';
import toast from 'react-hot-toast';
import './TournamentDetailPage.css';

export default function TournamentDetailPage() {
  const { slugOrId } = useParams();
  const { user }     = useNavigate() && useParams() && useState(null);
  const { user: me } = useAuth();
  const navigate     = useNavigate();

  const [t, setT]             = useState(null);
  const [loading, setLoading] = useState(true);
  const [regLoading, setRL]   = useState(false);
  const [tab, setTab]         = useState('info');
  const [showRegModal, setRegModal] = useState(false);

  useEffect(() => {
    tournamentAPI.getOne(slugOrId)
      .then(r => setT(r.data.data))
      .catch(() => toast.error('Tournament not found'))
      .finally(() => setLoading(false));
  }, [slugOrId]);

  const handleRegister = async (formData) => {
    if (!me) { toast.error('Please login to register'); navigate('/login'); return; }
    setRL(true);
    try {
      const res = await registrationAPI.initiate({ tournamentId: t._id, ...formData });
      const { registration, paymentRequired, order } = res.data.data;

      if (!paymentRequired) {
        toast.success('Registered successfully! 🎉');
        setRegModal(false);
        setT(prev => ({ ...prev, userRegistration: registration, currentParticipants: prev.currentParticipants + 1 }));
        return;
      }

      // Open Razorpay
      openRazorpay(
        order,
        { name: me.name, email: me.email, contact: me.phone },
        async (response) => {
          try {
            await registrationAPI.verifyPayment({
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              registrationId:    registration._id,
            });
            toast.success('Payment successful! Registration confirmed 🎉');
            setRegModal(false);
            setT(prev => ({ ...prev, userRegistration: { ...registration, status: 'confirmed' }, currentParticipants: prev.currentParticipants + 1 }));
          } catch { toast.error('Payment verification failed. Contact support.'); }
        },
        (err) => toast.error(err || 'Payment failed')
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setRL(false); }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!t) return <div className="empty-state"><h3>Tournament not found</h3></div>;

  const cfg      = statusConfig[t.status] || statusConfig.draft;
  const spotsLeft = t.maxParticipants - t.currentParticipants;
  const fillPct  = Math.round((t.currentParticipants / t.maxParticipants) * 100);
  const canRegister = t.isRegistrationOpen && !t.userRegistration;

  return (
    <div className="td-page anim-fadeIn">
      {/* Hero banner */}
      <div className="td-hero">
        {t.banner?.url
          ? <img src={t.banner.url} className="td-hero-img" alt={t.title} />
          : <div className="td-hero-placeholder">{sportEmoji[t.sport] || '🏅'}</div>}
        <div className="td-hero-overlay" />
        <div className="td-hero-content">
          <div className="td-sport-badge">{sportEmoji[t.sport]} {t.sport}</div>
          <h1 className="td-title">{t.title}</h1>
          <div className="td-org-row">
            <span>by {t.organiser?.organiserProfile?.organizationName || t.organiser?.name}</span>
            {t.organiser?.organiserProfile?.isVerified && <span className="verified-badge">✓ Verified</span>}
          </div>
          <div className="td-hero-badges">
            <span className={`badge badge-${cfg.color}`}>{cfg.label}</span>
            {t.isFeatured && <span className="badge badge-yellow">⭐ Featured</span>}
            <span className="badge badge-gray">{t.tournamentFormat}</span>
            <span className="badge badge-gray">{t.gender}</span>
          </div>
        </div>
      </div>

      <div className="td-body">
        {/* Left: main info */}
        <div className="td-main">
          {/* Tabs */}
          <div className="tab-bar" style={{ marginBottom: 20 }}>
            {['info','bracket','rules'].map(tb => (
              <button key={tb} className={`tab-btn ${tab === tb ? 'active' : ''}`} onClick={() => setTab(tb)}>
                {tb === 'info' ? 'ℹ️ Info' : tb === 'bracket' ? '🔢 Bracket' : '📋 Rules'}
              </button>
            ))}
          </div>

          {tab === 'info' && (
            <div className="anim-fadeIn">
              <p className="td-desc">{t.description}</p>

              {/* Key details grid */}
              <div className="td-details-grid">
                <DetailCard icon="📅" label="Start Date" value={formatDateTime(t.tournamentStartDate)} />
                {t.tournamentEndDate && <DetailCard icon="🏁" label="End Date" value={formatDate(t.tournamentEndDate)} />}
                <DetailCard icon="⏰" label="Registration Deadline" value={formatDateTime(t.registrationDeadline)} />
                <DetailCard icon="📍" label="Venue" value={`${t.location?.venue || ''} ${t.location?.city}`} />
                <DetailCard icon="👥" label="Participants" value={`${t.currentParticipants} / ${t.maxParticipants}`} />
                <DetailCard icon="🎯" label="Format" value={t.tournamentFormat} />
                {t.ageGroup?.label && <DetailCard icon="🎂" label="Age Group" value={t.ageGroup.label} />}
                <DetailCard icon="⚧" label="Category" value={t.gender} />
              </div>

              {/* Prizes */}
              {t.prizes?.totalPrizePool > 0 && (
                <div className="td-prizes">
                  <div className="section-title">Prize Pool</div>
                  <div className="prizes-grid">
                    {t.prizes.first?.amount  > 0 && <PrizeCard rank={1} label="1st Place" amount={t.prizes.first.amount}  desc={t.prizes.first.description} />}
                    {t.prizes.second?.amount > 0 && <PrizeCard rank={2} label="2nd Place" amount={t.prizes.second.amount} desc={t.prizes.second.description} />}
                    {t.prizes.third?.amount  > 0 && <PrizeCard rank={3} label="3rd Place" amount={t.prizes.third.amount}  desc={t.prizes.third.description} />}
                  </div>
                  <div className="total-pool">Total Prize Pool: <strong>{formatCurrency(t.prizes.totalPrizePool)}</strong></div>
                </div>
              )}

              {/* Results */}
              {t.status === 'completed' && t.results?.winner && (
                <div className="td-results card">
                  <div className="section-title">🏆 Tournament Results</div>
                  <div className="results-row">
                    <div className="result-item">
                      <span className="result-medal">🥇</span>
                      <span className="result-label">Winner</span>
                      <span className="result-name">{t.results.winner?.name || 'TBA'}</span>
                    </div>
                    {t.results.runnerUp && (
                      <div className="result-item">
                        <span className="result-medal">🥈</span>
                        <span className="result-label">Runner Up</span>
                        <span className="result-name">{t.results.runnerUp?.name}</span>
                      </div>
                    )}
                  </div>
                  {t.results.summary && <p className="results-summary">{t.results.summary}</p>}
                </div>
              )}
            </div>
          )}

          {tab === 'bracket' && (
            <div className="bracket-tab anim-fadeIn">
              {t.matches?.length > 0
                ? <BracketView matches={t.matches} />
                : <div className="empty-state"><div className="es-icon">🔢</div><h3>Bracket not generated yet</h3><p>Will be available after registration closes</p></div>}
            </div>
          )}

          {tab === 'rules' && (
            <div className="rules-tab anim-fadeIn">
              {t.rules?.length > 0
                ? <ul className="rules-list">{t.rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
                : <div className="empty-state"><div className="es-icon">📋</div><h3>No rules listed</h3></div>}
            </div>
          )}
        </div>

        {/* Right: sidebar actions */}
        <div className="td-sidebar">
          {/* Registration card */}
          <div className="card td-reg-card">
            <div className="td-reg-fee">
              {t.isFree
                ? <div className="fee-free-badge">FREE ENTRY</div>
                : <><div className="fee-amount">{formatCurrency(t.registrationFee)}</div>
                   <div className="fee-lbl">Registration Fee</div></>}
            </div>

            {/* Slots */}
            <div className="td-slots">
              <div className="slots-row">
                <span>{t.currentParticipants} registered</span>
                <span className={spotsLeft <= 5 ? 'text-red' : 'text-green'}>{spotsLeft} spots left</span>
              </div>
              <div className="progress-bar" style={{ height: 6 }}>
                <div className="progress-fill" style={{ width: `${fillPct}%` }} />
              </div>
            </div>

            {/* Status */}
            {t.userRegistration ? (
              <div className="already-registered">
                <div className="ar-icon">✅</div>
                <div className="ar-text">
                  <strong>You're Registered!</strong>
                  <span>Status: {t.userRegistration.status}</span>
                  {t.userRegistration.registrationNumber && <span>#{t.userRegistration.registrationNumber}</span>}
                </div>
              </div>
            ) : canRegister ? (
              <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setRegModal(true)} disabled={regLoading}>
                {regLoading ? <span className="spinner" style={{width:18,height:18,borderWidth:2}} /> : '🚀 Register Now'}
              </button>
            ) : (
              <div className={`badge badge-${cfg.color}`} style={{ display:'block', textAlign:'center', padding:'10px' }}>
                {t.status === 'completed' ? 'Tournament Completed' :
                 t.status === 'cancelled' ? 'Tournament Cancelled' :
                 t.status === 'ongoing'   ? 'Tournament Ongoing'  : 'Registration Closed'}
              </div>
            )}

            <div className="td-deadline">
              ⏰ Deadline: {formatDate(t.registrationDeadline)}
            </div>
          </div>

          {/* Organiser card */}
          <div className="card td-org-card">
            <div className="section-title">Organiser</div>
            <div className="org-info">
              {t.organiser?.avatar?.url
                ? <img src={t.organiser.avatar.url} className="avatar avatar-md" alt="" />
                : <div className="avatar-initials-md">{getInitials(t.organiser?.name)}</div>}
              <div>
                <div className="org-name">{t.organiser?.organiserProfile?.organizationName || t.organiser?.name}</div>
                {t.organiser?.organiserProfile?.rating > 0 && (
                  <div className="org-rating-row">⭐ {t.organiser.organiserProfile.rating} · {t.organiser.organiserProfile.totalReviews} reviews</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      {showRegModal && (
        <RegistrationModal
          tournament={t}
          onClose={() => setRegModal(false)}
          onSubmit={handleRegister}
          loading={regLoading}
        />
      )}
    </div>
  );
}

function DetailCard({ icon, label, value }) {
  return (
    <div className="detail-card">
      <span className="dc-icon">{icon}</span>
      <div>
        <div className="dc-label">{label}</div>
        <div className="dc-value">{value}</div>
      </div>
    </div>
  );
}

function PrizeCard({ rank, label, amount, desc }) {
  const colors = { 1: 'var(--accent)', 2: '#c0c8d8', 3: '#cd7f32' };
  const icons  = { 1: '🥇', 2: '🥈', 3: '🥉' };
  return (
    <div className="prize-card" style={{ borderColor: colors[rank] + '40' }}>
      <div className="prize-icon">{icons[rank]}</div>
      <div className="prize-label">{label}</div>
      <div className="prize-amount" style={{ color: colors[rank] }}>{formatCurrency(amount)}</div>
      {desc && <div className="prize-desc">{desc}</div>}
    </div>
  );
}

function BracketView({ matches }) {
  const rounds = [...new Set(matches.map(m => m.round))].sort();
  return (
    <div className="bracket">
      {rounds.map(r => (
        <div key={r} className="bracket-round">
          <div className="bracket-round-title">Round {r}</div>
          {matches.filter(m => m.round === r).map((m, i) => (
            <div key={i} className="bracket-match card">
              <div className={`bm-team ${m.winner ? (m.team1?.players?.[0]?.toString() === m.winner?.toString() ? 'winner' : 'loser') : ''}`}>
                {m.team1?.players?.[0]?.name || 'TBD'} — {m.team1?.score ?? '-'}
              </div>
              <div className="bm-vs">VS</div>
              <div className={`bm-team ${m.winner ? (m.team2?.players?.[0]?.toString() === m.winner?.toString() ? 'winner' : 'loser') : ''}`}>
                {m.team2?.players?.[0]?.name || 'TBD'} — {m.team2?.score ?? '-'}
              </div>
              {m.liveScore && <div className="bm-live">{m.liveScore}</div>}
              <div className={`badge badge-${m.status === 'live' ? 'blue' : m.status === 'completed' ? 'green' : 'gray'}`}
                style={{ margin:'8px auto 0', display:'block', textAlign:'center', width:'fit-content' }}>
                {m.status}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function RegistrationModal({ tournament, onClose, onSubmit, loading }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    emergencyContact: { name: '', phone: '', relation: '' },
    sportInfo: { position: '', jerseyNumber: '', experience: '' },
    agreedToRules: false,
    useWallet: false,
  });
  const set = (path, val) => setForm(f => {
    const parts = path.split('.');
    if (parts.length === 1) return { ...f, [path]: val };
    return { ...f, [parts[0]]: { ...f[parts[0]], [parts[1]]: val } };
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Register for Tournament</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="reg-tournament-info">
            <strong>{tournament.title}</strong>
            <span className="badge badge-blue">{tournament.isFree ? 'Free' : formatCurrency(tournament.registrationFee)}</span>
          </div>

          <div className="section-title" style={{ marginTop: 16 }}>Emergency Contact</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.emergencyContact.name}
                onChange={e => set('emergencyContact.name', e.target.value)} placeholder="Parent/Guardian name" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.emergencyContact.phone}
                onChange={e => set('emergencyContact.phone', e.target.value)} placeholder="Mobile number" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Relation</label>
            <input className="form-input" value={form.emergencyContact.relation}
              onChange={e => set('emergencyContact.relation', e.target.value)} placeholder="e.g. Father, Mother" />
          </div>

          <div className="section-title" style={{ marginTop: 16 }}>Sport Details</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Position / Role</label>
              <input className="form-input" value={form.sportInfo.position}
                onChange={e => set('sportInfo.position', e.target.value)} placeholder="e.g. Batsman, Striker" />
            </div>
            <div className="form-group">
              <label className="form-label">Jersey Number</label>
              <input className="form-input" type="number" value={form.sportInfo.jerseyNumber}
                onChange={e => set('sportInfo.jerseyNumber', e.target.value)} placeholder="e.g. 18" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Experience</label>
            <input className="form-input" value={form.sportInfo.experience}
              onChange={e => set('sportInfo.experience', e.target.value)} placeholder="e.g. 3 years club level" />
          </div>

          {!tournament.isFree && user?.wallet?.balance > 0 && (
            <label className="wallet-toggle">
              <input type="checkbox" checked={form.useWallet} onChange={e => set('useWallet', e.target.checked)} />
              Use wallet balance (₹{user.wallet.balance} available)
            </label>
          )}

          <label className="rules-check">
            <input type="checkbox" checked={form.agreedToRules} onChange={e => set('agreedToRules', e.target.checked)} required />
            I agree to the tournament rules and regulations
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!form.agreedToRules || loading}
            onClick={() => onSubmit(form)}>
            {loading ? <span className="spinner" style={{width:16,height:16,borderWidth:2}} /> :
              tournament.isFree ? '✅ Confirm Registration' : `💳 Pay ${formatCurrency(tournament.registrationFee)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
