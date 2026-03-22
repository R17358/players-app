import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';
import { getInitials, sportEmoji } from '../../utils/helpers';
import toast from 'react-hot-toast';
import './SettingsPage.css';

const SPORTS = ['cricket','football','basketball','badminton','tennis','volleyball','kabaddi','chess','table-tennis','other'];

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [tab, setTab]        = useState('profile');
  const [saving, setSaving]  = useState(false);

  const [profile, setProfile] = useState({
    name:    user?.name    || '',
    bio:     user?.bio     || '',
    phone:   user?.phone   || '',
    city:    user?.city    || '',
    state:   user?.state   || '',
    country: user?.country || 'India',
    gender:  user?.gender  || '',
    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
    organiserProfile: {
      organizationName: user?.organiserProfile?.organizationName || '',
      description:      user?.organiserProfile?.description      || '',
      website:          user?.organiserProfile?.website          || '',
    },
  });

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar?.url || '');
  const [sportProfiles, setSportProfiles] = useState(user?.sportProfiles || []);

  const setP = (k, v) => setProfile(f => ({ ...f, [k]: v }));
  const setOrg = (k, v) => setProfile(f => ({ ...f, organiserProfile: { ...f.organiserProfile, [k]: v } }));

  const saveProfile = async () => {
    setSaving(true);
    try {
      const payload = { ...profile, sportProfiles };
      const r = await authAPI.updateProfile(payload);
      updateUser(r.data.data);
      toast.success('Profile updated ✅');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    if (passwords.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters'); return;
    }
    setSaving(true);
    try {
      await authAPI.updatePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed ✅');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to change password'); }
    finally { setSaving(false); }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const saveAvatar = async () => {
    if (!avatarFile) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('avatar', avatarFile);
      const r = await authAPI.updateAvatar(fd);
      updateUser({ avatar: r.data.data.avatar });
      toast.success('Avatar updated ✅');
      setAvatarFile(null);
    } catch { toast.error('Failed to upload avatar'); }
    finally { setSaving(false); }
  };

  // Sport profile management
  const addSport = () => {
    setSportProfiles(prev => [...prev, {
      sport: '', position: '', yearsOfExperience: 0,
      stats: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0, totalPoints: 0 }
    }]);
  };
  const removeSport = (i) => setSportProfiles(prev => prev.filter((_, idx) => idx !== i));
  const setSport = (i, k, v) => setSportProfiles(prev => prev.map((sp, idx) => idx === i ? { ...sp, [k]: v } : sp));

  const TABS = [
    { key: 'profile',  label: '👤 Profile'  },
    { key: 'sports',   label: '🎮 Sports'   },
    { key: 'avatar',   label: '🖼️ Avatar'   },
    { key: 'password', label: '🔒 Password' },
    ...(user?.role === 'organiser' ? [{ key: 'organiser', label: '📋 Organiser' }] : []),
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="display settings-title">SETTINGS</h1>
        <p className="settings-sub">Manage your account and preferences</p>
      </div>

      <div className="settings-layout">
        {/* Tabs sidebar */}
        <div className="settings-tabs">
          {TABS.map(t => (
            <button key={t.key} className={`settings-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="settings-content card">

          {/* ── Profile Tab ── */}
          {tab === 'profile' && (
            <div className="settings-section anim-fadeIn">
              <div className="settings-section-title">Personal Information</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={profile.name} onChange={e => setP('name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={profile.phone} onChange={e => setP('phone', e.target.value)} placeholder="9876543210" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea className="form-input form-textarea" value={profile.bio}
                  onChange={e => setP('bio', e.target.value)} placeholder="Tell others about yourself..." rows={3} />
                <span className="char-count">{profile.bio?.length || 0}/300</span>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={profile.gender} onChange={e => setP('gender', e.target.value)}>
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input className="form-input" type="date" value={profile.dateOfBirth} onChange={e => setP('dateOfBirth', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" value={profile.city} onChange={e => setP('city', e.target.value)} placeholder="Mumbai" />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-input" value={profile.state} onChange={e => setP('state', e.target.value)} placeholder="Maharashtra" />
                </div>
              </div>
              <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
                {saving ? <span className="spinner" style={{width:16,height:16,borderWidth:2}} /> : '💾 Save Profile'}
              </button>
            </div>
          )}

          {/* ── Sports Tab ── */}
          {tab === 'sports' && (
            <div className="settings-section anim-fadeIn">
              <div className="settings-section-title">Your Sport Profiles</div>
              <p className="settings-desc">Add sports you play to appear on leaderboards and get matched to relevant tournaments.</p>
              {sportProfiles.map((sp, i) => (
                <div key={i} className="sport-profile-card">
                  <div className="spc-header">
                    <span className="spc-num">Sport #{i + 1}</span>
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeSport(i)}>✕</button>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Sport</label>
                      <select className="form-select" value={sp.sport} onChange={e => setSport(i, 'sport', e.target.value)}>
                        <option value="">Select sport</option>
                        {SPORTS.map(s => <option key={s} value={s}>{sportEmoji[s]} {s}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Position / Role</label>
                      <input className="form-input" placeholder="e.g. Batsman, Striker" value={sp.position || ''}
                        onChange={e => setSport(i, 'position', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Years of Experience</label>
                    <input className="form-input" type="number" min="0" value={sp.yearsOfExperience || 0}
                      onChange={e => setSport(i, 'yearsOfExperience', e.target.value)} style={{maxWidth:160}} />
                  </div>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={addSport} style={{marginBottom:16}}>+ Add Sport</button>
              <br />
              <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
                {saving ? <span className="spinner" style={{width:16,height:16,borderWidth:2}} /> : '💾 Save Sports'}
              </button>
            </div>
          )}

          {/* ── Avatar Tab ── */}
          {tab === 'avatar' && (
            <div className="settings-section anim-fadeIn">
              <div className="settings-section-title">Profile Picture</div>
              <div className="avatar-section">
                <div className="avatar-preview-wrap">
                  {avatarPreview
                    ? <img src={avatarPreview} className="avatar-preview" alt="avatar" />
                    : <div className="avatar-preview-initials">{getInitials(user?.name)}</div>}
                </div>
                <div className="avatar-upload-actions">
                  <label className="btn btn-outline">
                    📷 Choose Photo
                    <input type="file" accept="image/*" onChange={handleAvatarChange} style={{display:'none'}} />
                  </label>
                  {avatarFile && (
                    <button className="btn btn-primary" onClick={saveAvatar} disabled={saving}>
                      {saving ? <span className="spinner" style={{width:16,height:16,borderWidth:2}} /> : '✅ Upload'}
                    </button>
                  )}
                </div>
                <p className="avatar-hint">JPG, PNG or WebP. Recommended: 500×500px. Max 5MB.</p>
              </div>
            </div>
          )}

          {/* ── Password Tab ── */}
          {tab === 'password' && (
            <div className="settings-section anim-fadeIn">
              <div className="settings-section-title">Change Password</div>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input className="form-input" type="password" placeholder="Enter current password"
                  value={passwords.currentPassword} onChange={e => setPasswords(p => ({...p, currentPassword: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" placeholder="Min 8 characters"
                  value={passwords.newPassword} onChange={e => setPasswords(p => ({...p, newPassword: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password" placeholder="Repeat new password"
                  value={passwords.confirmPassword} onChange={e => setPasswords(p => ({...p, confirmPassword: e.target.value}))} />
                {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                  <span className="form-error">Passwords do not match</span>
                )}
              </div>
              <button className="btn btn-primary" onClick={savePassword}
                disabled={saving || !passwords.currentPassword || !passwords.newPassword || passwords.newPassword !== passwords.confirmPassword}>
                {saving ? <span className="spinner" style={{width:16,height:16,borderWidth:2}} /> : '🔒 Change Password'}
              </button>
            </div>
          )}

          {/* ── Organiser Tab ── */}
          {tab === 'organiser' && user?.role === 'organiser' && (
            <div className="settings-section anim-fadeIn">
              <div className="settings-section-title">Organiser Profile</div>
              {!user?.organiserProfile?.isVerified && (
                <div className="verify-notice" style={{marginBottom:20}}>
                  <span>⏳</span>
                  <div><strong>Pending Verification</strong><p>Your organiser account is awaiting admin verification. You'll be notified once approved.</p></div>
                </div>
              )}
              {user?.organiserProfile?.isVerified && (
                <div className="verified-banner">✅ Verified Organiser</div>
              )}
              <div className="form-group">
                <label className="form-label">Organization Name</label>
                <input className="form-input" value={profile.organiserProfile.organizationName}
                  onChange={e => setOrg('organizationName', e.target.value)} placeholder="Your org or club name" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input form-textarea" value={profile.organiserProfile.description}
                  onChange={e => setOrg('description', e.target.value)} placeholder="About your organization..." rows={3} />
              </div>
              <div className="form-group">
                <label className="form-label">Website</label>
                <input className="form-input" value={profile.organiserProfile.website}
                  onChange={e => setOrg('website', e.target.value)} placeholder="https://yourclub.com" />
              </div>
              {user?.organiserProfile?.rating > 0 && (
                <div className="org-rating-display">
                  ⭐ Your Rating: <strong>{user.organiserProfile.rating}</strong> ({user.organiserProfile.totalReviews} reviews)
                </div>
              )}
              <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
                {saving ? <span className="spinner" style={{width:16,height:16,borderWidth:2}} /> : '💾 Save'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
