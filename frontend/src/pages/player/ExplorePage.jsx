import React, { useState, useEffect } from 'react';
import { tournamentAPI } from '../../api';
import TournamentCard from '../../components/tournament/TournamentCard';
import { sportEmoji } from '../../utils/helpers';

const SPORTS = ['all','cricket','football','basketball','badminton','tennis','volleyball','kabaddi','chess','other'];

export default function ExplorePage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filters, setFilters]         = useState({ sport: 'all', status: '', city: '', isFree: '' });
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);

  useEffect(() => {
    fetchTournaments();
  }, [filters, page]);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12, ...filters };
      if (filters.sport === 'all') delete params.sport;
      if (search) params.search = search;
      if (!params.status) delete params.status;
      if (!params.city) delete params.city;
      if (!params.isFree) delete params.isFree;

      const res = await tournamentAPI.getAll(params);
      setTournaments(res.data.data);
      setTotalPages(res.data.totalPages);
    } catch { } finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); fetchTournaments();
  };

  const set = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };

  return (
    <div className="explore-page">
      {/* Hero */}
      <div className="explore-hero">
        <div className="hero-orb orb-bl" />
        <div className="hero-orb orb-br" />
        <h1 className="hero-title display">
          FIND YOUR <span>TOURNAMENT</span>
        </h1>
        <p className="hero-sub">Compete, win, and make your mark on the leaderboard</p>
        <form onSubmit={handleSearch} className="hero-search">
          <input
            type="text" placeholder="Search tournaments, sports, cities..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="form-input hero-search-input"
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
      </div>

      {/* Sport tabs */}
      <div className="sport-tabs">
        {SPORTS.map(s => (
          <button key={s}
            className={`sport-tab ${filters.sport === s ? 'active' : ''}`}
            onClick={() => set('sport', s)}>
            {s === 'all' ? '🌐 All' : `${sportEmoji[s] || '🏅'} ${s.charAt(0).toUpperCase()+s.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="filter-row">
        <select className="form-select filter-sel" value={filters.status} onChange={e => set('status', e.target.value)}>
          <option value="">All Status</option>
          <option value="registration_open">Open Registration</option>
          <option value="ongoing">Live Now</option>
          <option value="completed">Completed</option>
        </select>
        <input className="form-input filter-sel" placeholder="Filter by city..."
          value={filters.city} onChange={e => set('city', e.target.value)} />
        <select className="form-select filter-sel" value={filters.isFree} onChange={e => set('isFree', e.target.value)}>
          <option value="">Any Entry</option>
          <option value="true">Free Entry</option>
          <option value="false">Paid Entry</option>
        </select>
        <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ sport:'all',status:'',city:'',isFree:'' }); setSearch(''); }}>
          Reset
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : tournaments.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon">🏟️</div>
          <h3>No tournaments found</h3>
          <p>Try adjusting your filters</p>
        </div>
      ) : (
        <>
          <div className="tournaments-grid">
            {tournaments.map((t, i) => (
              <TournamentCard key={t._id} t={t} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className="page-info">{page} / {totalPages}</span>
              <button className="btn btn-outline btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
