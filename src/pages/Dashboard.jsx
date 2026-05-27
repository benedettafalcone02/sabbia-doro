import { useMemo } from 'react'
import LoadingScreen from '../components/LoadingScreen'

export default function Dashboard({ db, onNavigate }) {
  const { postazioni, clienti, loading } = db

  const stats = useMemo(() => ({
    occupate: postazioni.filter(p => p.stato === 'occupato').length,
    libere:   postazioni.filter(p => p.stato === 'libero').length,
    palme:    postazioni.filter(p => p.tipo === 'palma' && p.stato === 'occupato').length,
    ombrA:    postazioni.filter(p => p.tipo === 'ombrellone' && p.settore === 'A' && p.stato === 'occupato').length,
    ombrB:    postazioni.filter(p => p.tipo === 'ombrellone' && p.settore === 'B' && p.stato === 'occupato').length,
  }), [postazioni])

  const pPct = Math.round(stats.palme / 84 * 100)
  const aPct = Math.round(stats.ombrA / 96 * 100)
  const bPct = Math.round(stats.ombrB / 112 * 100)

  if (loading) return <LoadingScreen />

  return (
    <div className="page-content">
      <h1 className="page-title">Dashboard</h1>

      {/* STAT GRID */}
      <div className="stat-grid">
        <div className="stat-card navy">
          <div className="stat-label">Totali</div>
          <div className="stat-val">292</div>
          <div className="stat-sub">84 Palme · 208 Ombrelloni</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Occupate</div>
          <div className="stat-val">{stats.occupate}</div>
          <div className="stat-sub">postazioni prese</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Libere</div>
          <div className="stat-val">{stats.libere}</div>
          <div className="stat-sub">disponibili ora</div>
        </div>
        <div className="stat-card sky">
          <div className="stat-label">Clienti</div>
          <div className="stat-val">{clienti.length}</div>
          <div className="stat-sub">stagione 2025</div>
        </div>
      </div>

      {/* AZIONI RAPIDE */}
      <div className="section-label">Azioni rapide</div>
      <div className="quick-actions">
        {[
          { icon: '🔍', label: 'Disponibilità',      sub: 'Posti liberi',     page: 'disponibilita', bg: '#e8f4fd' },
          { icon: '➕', label: 'Nuova Prenotazione',  sub: 'Aggiungi cliente', page: 'prenota',       bg: '#e8f8f0' },
          { icon: '🗺', label: 'Mappa',               sub: 'Vista spiaggia',   page: 'mappa',         bg: '#fef9e7' },
          { icon: '👤', label: 'Clienti',             sub: 'Anagrafica',       page: 'clienti',       bg: '#f0eef8' },
        ].map(a => (
          <button key={a.page} className="quick-action" onClick={() => onNavigate(a.page)}>
            <span className="quick-action-icon" style={{ background: a.bg }}>{a.icon}</span>
            <span className="quick-action-label">{a.label}</span>
            <span className="quick-action-sub">{a.sub}</span>
          </button>
        ))}
      </div>

      {/* OCCUPAZIONE */}
      <div className="section-label">Occupazione stagione</div>
      <div className="card">
        {[
          { label: '🌴 Palme',    tot: 84,  occ: stats.palme, pct: pPct, color: 'var(--navy)' },
          { label: '☂ Sett. A',  tot: 96,  occ: stats.ombrA, pct: aPct, color: 'var(--sky)' },
          { label: '☂ Sett. B',  tot: 112, occ: stats.ombrB, pct: bPct, color: 'var(--yellow)' },
        ].map(s => (
          <div key={s.label} className="progress-row">
            <div className="progress-info">
              <span className="progress-label">{s.label}</span>
              <span className="progress-count">{s.occ}/{s.tot} — <strong style={{ color: 'var(--navy)' }}>{s.pct}%</strong></span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: s.pct + '%', background: s.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
