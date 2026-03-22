import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { registrationAPI, userAPI } from '../../api';
import { formatDate, formatCurrency, sportEmoji, statusConfig, timeFromNow } from '../../utils/helpers';
import toast from 'react-hot-toast';

export function MyRegistrationsPage() {
  const [regs, setRegs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]     = useState('all');

  useEffect(() => {
    registrationAPI.getMy()
      .then(r => setRegs(r.data.data))
      .catch(() => toast.error('Failed to load registrations'))
      .finally(() => setLoading(false));
  }, []);

  const cancelReg = async (id) => {
    if (!window.confirm('Cancel registration? You will receive an 80% refund to your wallet.')) return;
    try {
      await registrationAPI.cancel(id);
      setRegs(prev => prev.map(r => r._id === id ? { ...r, status: 'cancelled' } : r));
      toast.success('Registration cancelled. Refund credited to wallet.');
    } catch (err) { toast.error(err.response?.data?.message || 'Cancellation failed'); }
  };

  const filtered = tab === 'all' ? regs : regs.filter(r => r.status === tab);

  return (
    <div style={{ padding: '24px', maxWidth: 800 }}>
      <h1 className="display" style={{ fontSize: 36, marginBottom: 6 }}>MY TOURNAMENTS</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>Your tournament registrations</p>

      <div className="tab-bar" style={{ marginBottom: 20 }}>
        {['all','confirmed','payment_pending','cancelled'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'all' ? 'All' : t === 'payment_pending' ? 'Pending' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <div className="page-loader"><div className="spinner" /></div>
        : filtered.length === 0
          ? <div className="empty-state"><div className="es-icon">🎟️</div><h3>No registrations found</h3><Link to="/explore" className="btn btn-primary" style={{marginTop:12}}>Find Tournaments</Link></div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(reg => {
                const t = reg.tournament;
                const cfg = statusConfig[t?.status] || {};
                return (
                  <div key={reg._id} className="card" style={{ padding: 18 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 32 }}>{sportEmoji[t?.sport] || '🏅'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link to={`/tournaments/${t?.slug || t?._id}`} style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {t?.title}
                        </Link>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span>📅 {t?.tournamentStartDate && formatDate(t.tournamentStartDate)}</span>
                          <span>📍 {t?.location?.city}</span>
                          <span>Reg# {reg.registrationNumber}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                          <span className={`badge badge-${reg.status === 'confirmed' ? 'green' : reg.status === 'cancelled' ? 'red' : 'yellow'}`}>
                            {reg.status}
                          </span>
                          <span className={`badge badge-${cfg.color || 'gray'}`}>{cfg.label || t?.status}</span>
                          {reg.payment?.status === 'completed' && <span className="badge badge-blue">💳 Paid {formatCurrency(reg.payment.amount)}</span>}
                          {reg.payment?.status === 'free'      && <span className="badge badge-green">FREE</span>}
                          {reg.payment?.status === 'refunded'  && <span className="badge badge-yellow">↩ Refunded {formatCurrency(reg.payment.refundAmount)}</span>}
                          {reg.certificate?.issued && <span className="badge badge-yellow">🎓 Certificate</span>}
                        </div>
                      </div>
                      {reg.status === 'confirmed' && t?.status === 'registration_open' && (
                        <button className="btn btn-danger btn-sm" onClick={() => cancelReg(reg._id)}>Cancel</button>
                      )}
                    </div>
                    {reg.performance?.rank && (
                      <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--accent-dim)', borderRadius: 'var(--r-sm)', fontSize: 13, color: 'var(--accent)' }}>
                        🏆 Final Rank: #{reg.performance.rank} · {reg.performance.wins}W {reg.performance.losses}L
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
      }
    </div>
  );
}

export function WalletPage() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userAPI.getWallet()
      .then(r => setWallet(r.data.data))
      .catch(() => toast.error('Failed to load wallet'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div style={{ padding: '24px', maxWidth: 700 }}>
      <h1 className="display" style={{ fontSize: 36, marginBottom: 6 }}>MY WALLET</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>Your SportVibe balance and transactions</p>

      {/* Balance card */}
      <div className="card" style={{ padding: 32, textAlign: 'center', marginBottom: 20, background: 'linear-gradient(135deg, #0a1628, #0c1a30)', borderColor: 'rgba(61,142,240,0.2)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Available Balance</div>
        <div className="display" style={{ fontSize: 52, color: 'var(--accent)', letterSpacing: '0.04em' }}>
          {formatCurrency(wallet?.balance || 0)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
          Wallet balance can be used for tournament registrations
        </div>
      </div>

      {/* Transactions */}
      <div className="section-title">Transaction History</div>
      {!wallet?.transactions?.length
        ? <div className="empty-state"><div className="es-icon">💸</div><h3>No transactions yet</h3></div>
        : <div className="card" style={{ overflow: 'hidden' }}>
            {wallet.transactions.map((tx, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                borderBottom: i < wallet.transactions.length - 1 ? '1px solid var(--border)' : 'none'
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: tx.type === 'credit' ? 'var(--green-dim)' : 'var(--red-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0
                }}>
                  {tx.type === 'credit' ? '↓' : '↑'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ui)' }}>{tx.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {tx.reference} · {timeFromNow(tx.createdAt)}
                  </div>
                </div>
                <div style={{
                  fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 800,
                  color: tx.type === 'credit' ? 'var(--green)' : 'var(--red)'
                }}>
                  {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}
