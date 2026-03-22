import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tournamentAPI, registrationAPI } from '../../api';
import { formatDate, formatCurrency, statusConfig } from '../../utils/helpers';
import toast from 'react-hot-toast';
import './ManageTournamentPage.css';

export default function ManageTournamentPage() {
  const { id }            = useParams();
  const [t, setT]         = useState(null);
  const [regs, setRegs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]     = useState('registrations');
  const [saving, setSaving] = useState(false);

  // Results form
  const [results, setResults] = useState({ winner: '', runnerUp: '', summary: '' });

  useEffect(() => {
    Promise.all([
      tournamentAPI.getOne(id),
      tournamentAPI.getRegistrations(id, { limit: 200 }),
    ]).then(([tRes, rRes]) => {
      setT(tRes.data.data);
      setRegs(rRes.data.data);
    }).catch(() => toast.error('Failed to load tournament'))
      .finally(() => setLoading(false));
  }, [id]);

  const generateBracket = async () => {
    if (!window.confirm('Generate bracket? This will randomize participant seeding.')) return;
    setSaving(true);
    try {
      const r = await tournamentAPI.generateBracket(id);
      toast.success(`Bracket generated! ${r.data.data.matches.length} matches created 🎯`);
      const updated = await tournamentAPI.getOne(id);
      setT(updated.data.data);
      setTab('bracket');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const updateMatch = async (matchIdx, data) => {
    try {
      await tournamentAPI.updateMatch(id, matchIdx, data);
      const updated = await tournamentAPI.getOne(id);
      setT(updated.data.data);
      toast.success('Match updated ✅');
    } catch { toast.error('Failed to update match'); }
  };

  const declareResults = async () => {
    if (!results.winner) { toast.error('Please select a winner'); return; }
    setSaving(true);
    try {
      await tournamentAPI.declareResults(id, results);
      toast.success('Results declared! Certificates issued 🏆');
      const updated = await tournamentAPI.getOne(id);
      setT(updated.data.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!t) return <div className="empty-state"><h3>Tournament not found</h3></div>;

  const cfg      = statusConfig[t.status] || {};
  const confirmed = regs.filter(r => r.status === 'confirmed');

  return (
    <div className="manage-page">
      {/* Header */}
      <div className="manage-header">
        <Link to="/organiser/dashboard" className="btn btn-outline btn-sm">← Dashboard</Link>
        <div className="manage-title-row">
          <h1 className="manage-title">{t.title}</h1>
          <span className={`badge badge-${cfg.color}`}>{cfg.label}</span>
        </div>
        <div className="manage-meta">
          <span>📅 {formatDate(t.tournamentStartDate)}</span>
          <span>👥 {t.currentParticipants}/{t.maxParticipants} participants</span>
          <span>🎮 {t.sport}</span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="manage-stats">
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{confirmed.length}</div>
          <div className="stat-label">Confirmed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-value">{regs.filter(r => r.status === 'payment_pending').length}</div>
          <div className="stat-label">Pending Payment</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-value">{regs.filter(r => r.status === 'cancelled').length}</div>
          <div className="stat-label">Cancelled</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value" style={{fontSize:18}}>{formatCurrency(confirmed.length * (t.registrationFee || 0))}</div>
          <div className="stat-label">Revenue</div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="manage-actions">
        {t.status === 'registration_closed' && confirmed.length >= 2 && !t.matches?.length && (
          <button className="btn btn-primary" onClick={generateBracket} disabled={saving}>
            {saving ? <span className="spinner" style={{width:16,height:16,borderWidth:2}} /> : '🔢 Generate Bracket'}
          </button>
        )}
        <Link to={`/tournaments/${t.slug || t._id}`} className="btn btn-outline" target="_blank">👁️ View Public Page</Link>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{marginBottom:20}}>
        {[
          { key:'registrations', label:`👥 Registrations (${regs.length})` },
          { key:'bracket',       label:`🔢 Bracket (${t.matches?.length || 0} matches)` },
          { key:'results',       label:'🏆 Results' },
        ].map(tb => (
          <button key={tb.key} className={`tab-btn ${tab === tb.key ? 'active' : ''}`} onClick={() => setTab(tb.key)}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* Registrations tab */}
      {tab === 'registrations' && (
        <div className="anim-fadeIn">
          {regs.length === 0
            ? <div className="empty-state"><div className="es-icon">👥</div><h3>No registrations yet</h3></div>
            : <div className="regs-table">
                <div className="regs-thead">
                  <span>#</span><span>Player</span><span>Contact</span>
                  <span>Reg No</span><span>Payment</span><span>Status</span>
                </div>
                {regs.map((reg, i) => (
                  <div key={reg._id} className="regs-row">
                    <span className="regs-num">{i + 1}</span>
                    <div className="regs-player">
                      <div className="rp-name">{reg.playerSnapshot?.name || reg.player?.name}</div>
                      <div className="rp-user">@{reg.playerSnapshot?.username || reg.player?.username}</div>
                    </div>
                    <div className="regs-contact">
                      <div>{reg.playerSnapshot?.email}</div>
                      <div>{reg.playerSnapshot?.phone}</div>
                    </div>
                    <span className="regs-regno">{reg.registrationNumber}</span>
                    <div className="regs-payment">
                      <span className={`badge badge-${reg.payment?.status === 'completed' ? 'green' : reg.payment?.status === 'free' ? 'blue' : 'yellow'}`}>
                        {reg.payment?.status === 'completed' ? `✓ ${formatCurrency(reg.payment.amount)}` :
                         reg.payment?.status === 'free' ? 'Free' : reg.payment?.status}
                      </span>
                    </div>
                    <span className={`badge badge-${reg.status === 'confirmed' ? 'green' : reg.status === 'cancelled' ? 'red' : 'yellow'}`}>
                      {reg.status}
                    </span>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* Bracket tab */}
      {tab === 'bracket' && (
        <div className="anim-fadeIn">
          {!t.matches?.length
            ? <div className="empty-state">
                <div className="es-icon">🔢</div>
                <h3>No bracket generated yet</h3>
                <p>Close registration first, then click "Generate Bracket"</p>
              </div>
            : <BracketManager matches={t.matches} registrations={confirmed} onUpdateMatch={updateMatch} />
          }
        </div>
      )}

      {/* Results tab */}
      {tab === 'results' && (
        <div className="results-tab anim-fadeIn">
          {t.status === 'completed'
            ? <div className="results-declared">
                <div style={{fontSize:48}}>🏆</div>
                <h2>Tournament Completed!</h2>
                {t.results?.winner && <div className="rd-winner">🥇 Winner: {t.results.winner.name}</div>}
                {t.results?.runnerUp && <div className="rd-runner">🥈 Runner Up: {t.results.runnerUp.name}</div>}
                {t.results?.summary && <p>{t.results.summary}</p>}
              </div>
            : <div className="card" style={{padding:24}}>
                <div className="section-title" style={{marginBottom:16}}>Declare Tournament Results</div>
                <div className="form-group">
                  <label className="form-label">🥇 Winner (Registration Number or Player ID)</label>
                  <select className="form-select" value={results.winner} onChange={e => setResults(r => ({...r, winner: e.target.value}))}>
                    <option value="">Select winner...</option>
                    {confirmed.map(reg => (
                      <option key={reg._id} value={reg.player?._id || reg.player}>
                        {reg.playerSnapshot?.name} ({reg.registrationNumber})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">🥈 Runner Up</label>
                  <select className="form-select" value={results.runnerUp} onChange={e => setResults(r => ({...r, runnerUp: e.target.value}))}>
                    <option value="">Select runner up...</option>
                    {confirmed.map(reg => (
                      <option key={reg._id} value={reg.player?._id || reg.player}>
                        {reg.playerSnapshot?.name} ({reg.registrationNumber})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Summary</label>
                  <textarea className="form-input form-textarea" rows={3} placeholder="Describe how the tournament concluded..."
                    value={results.summary} onChange={e => setResults(r => ({...r, summary: e.target.value}))} />
                </div>
                <button className="btn btn-primary" onClick={declareResults} disabled={saving || !results.winner}>
                  {saving ? <span className="spinner" style={{width:16,height:16,borderWidth:2}} /> : '🏆 Declare Results & Issue Certificates'}
                </button>
              </div>
          }
        </div>
      )}
    </div>
  );
}

function BracketManager({ matches, registrations, onUpdateMatch }) {
  const [editIdx, setEditIdx] = useState(null);
  const [editData, setEditData] = useState({});
  const rounds = [...new Set(matches.map(m => m.round))].sort();

  const startEdit = (idx) => {
    setEditIdx(idx);
    setEditData({
      team1Score: matches[idx].team1?.score || 0,
      team2Score: matches[idx].team2?.score || 0,
      status: matches[idx].status || 'scheduled',
      liveScore: matches[idx].liveScore || '',
      winner: matches[idx].winner || '',
    });
  };

  const saveEdit = () => {
    onUpdateMatch(editIdx, editData);
    setEditIdx(null);
  };

  return (
    <div className="bracket-manager">
      {rounds.map(round => (
        <div key={round} className="bm-round">
          <div className="bm-round-title">
            Round {round}
            {round === Math.max(...rounds) && <span className="badge badge-yellow" style={{marginLeft:8}}>Final</span>}
          </div>
          <div className="bm-matches">
            {matches.filter(m => m.round === round).map((match, relIdx) => {
              const absIdx = matches.indexOf(match);
              const isEditing = editIdx === absIdx;

              const p1 = registrations.find(r =>
                r.player?._id === match.team1?.players?.[0] ||
                r._id === match.team1?.players?.[0]
              );
              const p2 = registrations.find(r =>
                r.player?._id === match.team2?.players?.[0] ||
                r._id === match.team2?.players?.[0]
              );

              return (
                <div key={absIdx} className={`bm-match-card card ${match.status === 'live' ? 'bm-live' : ''}`}>
                  <div className="bm-match-header">
                    <span className="bm-match-num">Match {match.matchNumber || relIdx + 1}</span>
                    <span className={`badge badge-${match.status === 'live' ? 'blue' : match.status === 'completed' ? 'green' : 'gray'}`}>
                      {match.status === 'live' ? '🔴 LIVE' : match.status}
                    </span>
                    {match.status !== 'completed' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => isEditing ? setEditIdx(null) : startEdit(absIdx)}>
                        {isEditing ? '✕' : '✏️ Update'}
                      </button>
                    )}
                  </div>

                  {match.liveScore && <div className="bm-live-score">{match.liveScore}</div>}

                  <div className="bm-players">
                    <div className={`bm-player ${match.winner && match.team1?.players?.[0]?.toString() === match.winner?.toString() ? 'winner' : ''}`}>
                      <span className="bm-player-name">{p1?.playerSnapshot?.name || 'TBD'}</span>
                      <span className="bm-player-score">{match.team1?.score ?? '-'}</span>
                    </div>
                    <div className="bm-vs">VS</div>
                    <div className={`bm-player ${match.winner && match.team2?.players?.[0]?.toString() === match.winner?.toString() ? 'winner' : ''}`}>
                      <span className="bm-player-name">{p2?.playerSnapshot?.name || 'TBD'}</span>
                      <span className="bm-player-score">{match.team2?.score ?? '-'}</span>
                    </div>
                  </div>

                  {/* Edit form */}
                  {isEditing && (
                    <div className="bm-edit-form">
                      <div className="bm-scores">
                        <div className="form-group" style={{flex:1}}>
                          <label className="form-label">{p1?.playerSnapshot?.name || 'P1'} Score</label>
                          <input className="form-input" type="number" value={editData.team1Score}
                            onChange={e => setEditData(d => ({...d, team1Score: Number(e.target.value)}))} />
                        </div>
                        <div style={{alignSelf:'flex-end',paddingBottom:12,color:'var(--text-muted)'}}>:</div>
                        <div className="form-group" style={{flex:1}}>
                          <label className="form-label">{p2?.playerSnapshot?.name || 'P2'} Score</label>
                          <input className="form-input" type="number" value={editData.team2Score}
                            onChange={e => setEditData(d => ({...d, team2Score: Number(e.target.value)}))} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Live Score Text (optional)</label>
                        <input className="form-input" placeholder="e.g. 45/3 (12.4 overs)" value={editData.liveScore}
                          onChange={e => setEditData(d => ({...d, liveScore: e.target.value}))} />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Status</label>
                          <select className="form-select" value={editData.status}
                            onChange={e => setEditData(d => ({...d, status: e.target.value}))}>
                            <option value="scheduled">Scheduled</option>
                            <option value="live">Live</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                        {editData.status === 'completed' && (
                          <div className="form-group">
                            <label className="form-label">Winner</label>
                            <select className="form-select" value={editData.winner}
                              onChange={e => setEditData(d => ({...d, winner: e.target.value}))}>
                              <option value="">Select winner</option>
                              <option value={match.team1?.players?.[0]}>{p1?.playerSnapshot?.name}</option>
                              <option value={match.team2?.players?.[0]}>{p2?.playerSnapshot?.name}</option>
                            </select>
                          </div>
                        )}
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={saveEdit}>✅ Save Match</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
