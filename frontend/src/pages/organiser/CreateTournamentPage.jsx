import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tournamentAPI } from '../../api';
import toast from 'react-hot-toast';
import './CreateTournamentPage.css';

const SPORTS = ['cricket','football','basketball','badminton','tennis','volleyball','kabaddi','kho-kho','table-tennis','chess','swimming','athletics','boxing','wrestling','archery','other'];
const FORMATS = ['knockout','round-robin','league','double-elimination','swiss'];

export default function CreateTournamentPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);

  const [form, setForm] = useState({
    title: '', sport: '', sportCategory: 'individual', tournamentFormat: 'knockout',
    gender: 'open', isTeamBased: false, playersPerTeam: '',
    maxParticipants: 16, minParticipants: 2,
    registrationDeadline: '', tournamentStartDate: '', tournamentEndDate: '',
    locationType: 'physical',
    location: { venue: '', address: '', city: '', state: '', pincode: '' },
    registrationFee: 0, isFree: true,
    prizes: { first: { amount: 0, description: '' }, second: { amount: 0, description: '' }, third: { amount: 0, description: '' } },
    description: '', rules: [''], ageGroup: { min: 0, max: 100, label: '' },
    tags: '',
  });

  const set = (path, val) => {
    setForm(f => {
      const parts = path.split('.');
      if (parts.length === 1) return { ...f, [path]: val };
      if (parts.length === 2) return { ...f, [parts[0]]: { ...f[parts[0]], [parts[1]]: val } };
      if (parts.length === 3) return { ...f, [parts[0]]: { ...f[parts[0]], [parts[1]]: { ...f[parts[0]][parts[1]], [parts[2]]: val } } };
      return f;
    });
  };

  const handleBanner = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const addRule = () => setForm(f => ({ ...f, rules: [...f.rules, ''] }));
  const setRule = (i, v) => setForm(f => { const r = [...f.rules]; r[i] = v; return { ...f, rules: r }; });
  const removeRule = (i) => setForm(f => ({ ...f, rules: f.rules.filter((_, idx) => idx !== i) }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        registrationFee: form.isFree ? 0 : Number(form.registrationFee),
        maxParticipants: Number(form.maxParticipants),
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
        rules: form.rules.filter(r => r.trim()),
        prizes: {
          first:  { amount: Number(form.prizes.first.amount),  description: form.prizes.first.description },
          second: { amount: Number(form.prizes.second.amount), description: form.prizes.second.description },
          third:  { amount: Number(form.prizes.third.amount),  description: form.prizes.third.description },
        },
      };

      const res = await tournamentAPI.create(payload);
      const tournamentId = res.data.data._id;

      // Upload banner if selected
      if (bannerFile) {
        const fd = new FormData();
        fd.append('banner', bannerFile);
        await tournamentAPI.uploadBanner(tournamentId, fd);
      }

      toast.success('Tournament created! Submit for admin approval.');
      navigate(`/organiser/tournaments`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create tournament');
    } finally { setSaving(false); }
  };

  const steps = ['Game Details', 'Location & Time', 'Participation', 'Rules & Media'];

  return (
    <div className="create-page">
      {/* Header */}
      <div className="create-header">
        <div>
          <h1 className="create-title display">CREATE COMPETITION</h1>
          <p className="create-sub">Fill in the details to set up your tournament</p>
        </div>
        <span className="badge badge-blue">📋 Verified Organiser</span>
      </div>

      {/* Step indicators */}
      <div className="step-bar">
        {steps.map((s, i) => (
          <div key={i} className={`step-item ${step > i + 1 ? 'done' : step === i + 1 ? 'active' : ''}`}
            onClick={() => step > i + 1 && setStep(i + 1)}>
            <div className="step-dot">{step > i + 1 ? '✓' : i + 1}</div>
            <span className="step-label">{s}</span>
          </div>
        ))}
      </div>

      {/* Form card */}
      <div className="create-card card">
        {/* Step 1: Game Details */}
        {step === 1 && (
          <div className="form-step anim-fadeIn">
            <div className="step-title">🎮 Game Details</div>
            <div className="form-group">
              <label className="form-label">Select Sport</label>
              <select className="form-select" value={form.sport} onChange={e => set('sport', e.target.value)} required>
                <option value="">♟ Select a sport...</option>
                {SPORTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Competition Title</label>
              <input className="form-input" placeholder="Enter competition title..."
                value={form.title} onChange={e => set('title', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Tournament Format</label>
              <div className="toggle-group">
                {FORMATS.map(f => (
                  <div key={f} className={`toggle-opt ${form.tournamentFormat === f ? 'active' : ''}`}
                    onClick={() => set('tournamentFormat', f)}>
                    {f.replace('-', ' ')}
                  </div>
                ))}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Gender Category</label>
                <select className="form-select" value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="open">Open</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Age Group Label</label>
                <input className="form-input" placeholder="e.g. Under 18, Open" value={form.ageGroup.label}
                  onChange={e => set('ageGroup.label', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Location & Time */}
        {step === 2 && (
          <div className="form-step anim-fadeIn">
            <div className="step-title">📍 Location & Mode</div>
            <div className="toggle-group" style={{ marginBottom: 16 }}>
              <div className={`toggle-opt ${form.locationType === 'online' ? 'active' : ''}`}
                onClick={() => set('locationType', 'online')}>🌐 Online</div>
              <div className={`toggle-opt ${form.locationType === 'physical' ? 'active' : ''}`}
                onClick={() => set('locationType', 'physical')}>🏟️ Offline</div>
            </div>
            {form.locationType === 'physical' && (
              <>
                <div className="form-group">
                  <label className="form-label">Venue Name</label>
                  <input className="form-input" placeholder="Venue Name" value={form.location.venue}
                    onChange={e => set('location.venue', e.target.value)} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-input" placeholder="City" value={form.location.city}
                      onChange={e => set('location.city', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input className="form-input" placeholder="State" value={form.location.state}
                      onChange={e => set('location.state', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Full Address</label>
                  <input className="form-input" placeholder="Full address" value={form.location.address}
                    onChange={e => set('location.address', e.target.value)} />
                </div>
              </>
            )}

            <div className="step-title" style={{ marginTop: 20 }}>⏰ Time Details</div>
            <div className="form-group">
              <label className="form-label">📅 Tournament Start Date & Time</label>
              <input className="form-input" type="datetime-local" value={form.tournamentStartDate}
                onChange={e => set('tournamentStartDate', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">🏁 Tournament End Date</label>
              <input className="form-input" type="date" value={form.tournamentEndDate}
                onChange={e => set('tournamentEndDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">⏰ Registration Deadline</label>
              <input className="form-input" type="datetime-local" value={form.registrationDeadline}
                onChange={e => set('registrationDeadline', e.target.value)} required />
            </div>
          </div>
        )}

        {/* Step 3: Participation & Prizes */}
        {step === 3 && (
          <div className="form-step anim-fadeIn">
            <div className="step-title">👥 Participation</div>
            <div className="toggle-group" style={{ marginBottom: 16 }}>
              <div className={`toggle-opt ${!form.isTeamBased ? 'active' : ''}`}
                onClick={() => { set('isTeamBased', false); set('sportCategory', 'individual'); }}>
                👤 Individual
              </div>
              <div className={`toggle-opt ${form.isTeamBased ? 'active' : ''}`}
                onClick={() => { set('isTeamBased', true); set('sportCategory', 'team'); }}>
                👥 Team
              </div>
            </div>

            <div className="slots-input-row">
              <div className="form-group">
                <label className="form-label">Total Slots</label>
                <div className="slot-control">
                  <button type="button" className="slot-btn" onClick={() => set('maxParticipants', Math.max(2, form.maxParticipants - 1))}>−</button>
                  <span className="slot-val">{form.maxParticipants}</span>
                  <button type="button" className="slot-btn" onClick={() => set('maxParticipants', form.maxParticipants + 1)}>+</button>
                </div>
              </div>
              {form.isTeamBased && (
                <div className="form-group">
                  <label className="form-label">Players per Team</label>
                  <input className="form-input" type="number" min="2" value={form.playersPerTeam}
                    onChange={e => set('playersPerTeam', e.target.value)} placeholder="e.g. 11" />
                </div>
              )}
            </div>

            <div className="step-title" style={{ marginTop: 20 }}>💰 Registration & Prize</div>
            <div className="prize-type-row">
              <label className={`prize-type-opt ${form.isFree ? 'active' : ''}`}>
                <input type="radio" checked={form.isFree} onChange={() => { set('isFree', true); set('registrationFee', 0); }} />
                <span>Free Entry</span>
              </label>
              <label className={`prize-type-opt ${!form.isFree ? 'active' : ''}`}>
                <input type="radio" checked={!form.isFree} onChange={() => set('isFree', false)} />
                <span>Paid Entry</span>
              </label>
            </div>
            {!form.isFree && (
              <div className="form-group">
                <label className="form-label">Registration Fee (₹)</label>
                <input className="form-input" type="number" min="0" value={form.registrationFee}
                  onChange={e => set('registrationFee', e.target.value)} placeholder="e.g. 500" />
              </div>
            )}
            <div className="prizes-form">
              {[['first','🥇 1st Place'],['second','🥈 2nd Place'],['third','🥉 3rd Place']].map(([key, label]) => (
                <div key={key} className="prize-form-row">
                  <span className="prize-form-label">{label}</span>
                  <input className="form-input" type="number" min="0" placeholder="Prize Amount (₹)"
                    value={form.prizes[key].amount}
                    onChange={e => set(`prizes.${key}.amount`, e.target.value)} />
                  <input className="form-input" placeholder="Description (optional)"
                    value={form.prizes[key].description}
                    onChange={e => set(`prizes.${key}.description`, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Rules & Media */}
        {step === 4 && (
          <div className="form-step anim-fadeIn">
            <div className="step-title">📋 Rules & Description</div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input form-textarea" rows={4} placeholder="Describe your tournament..."
                value={form.description} onChange={e => set('description', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Rules</label>
              {form.rules.map((r, i) => (
                <div key={i} className="rule-input-row">
                  <input className="form-input" placeholder={`Rule ${i + 1}`} value={r}
                    onChange={e => setRule(i, e.target.value)} />
                  {form.rules.length > 1 && (
                    <button type="button" className="btn btn-danger btn-sm btn-icon" onClick={() => removeRule(i)}>✕</button>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={addRule}>+ Add Rule</button>
            </div>
            <div className="form-group">
              <label className="form-label">Tags (comma separated)</label>
              <input className="form-input" placeholder="cricket, mumbai, t20" value={form.tags}
                onChange={e => set('tags', e.target.value)} />
            </div>

            {/* Banner upload */}
            <div className="form-group">
              <label className="form-label">Banner Image</label>
              <label className="banner-upload-area">
                {bannerPreview
                  ? <img src={bannerPreview} alt="banner" className="banner-preview" />
                  : <div className="banner-placeholder">
                      <span>+</span>
                      <span>Upload Banner Image</span>
                      <span className="bp-hint">Recommended: 1200×630px</span>
                    </div>
                }
                <input type="file" accept="image/*" onChange={handleBanner} style={{ display: 'none' }} />
              </label>
            </div>

            <div className="funds-note">🔒 Funds will be securely held and distributed via Razorpay</div>
          </div>
        )}

        {/* Navigation */}
        <div className="create-nav">
          {step > 1 && (
            <button className="btn btn-outline" onClick={() => setStep(s => s - 1)}>← Back</button>
          )}
          <div style={{ flex: 1 }} />
          {step < 4 ? (
            <button className="btn btn-blue" onClick={() => setStep(s => s + 1)}>Next →</button>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={saving}>
              {saving ? <span className="spinner" style={{width:18,height:18,borderWidth:2}} /> : '🚀 Publish Competition'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
