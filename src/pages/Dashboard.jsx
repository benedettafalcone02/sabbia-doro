import { useMemo } from 'react'
import { fmtEur, today, tomorrow } from '../lib/data'

export default function Dashboard({ db, onNavigate }) {
  const { postazioni, prenotazioni, clienti, loading } = db

  const stats = useMemo(() => {
    const occupate = postazioni.filter(p => p.stato === 'occupato').length
    const libere   = postazioni.filter(p => p.stato === 'libero').length
    const palme    = postazioni.filter(p => p.tipo === 'palma' && p.stato === 'occupato').length
    const ombrA    = postazioni.filter(p => p.tipo === 'ombrellone' && p.settore === 'A' && p.stato === 'occupato').length
    const ombrB    = postazioni.filter(p => p.tipo === 'ombrellone' && p.settore === 'B' && p.stato === 'occupato').length
    return { occupate, libere, palme, ombrA, ombrB }
  }, [postazioni])

  const pPct = Math.round(stats.palme / 84 * 100)
  const aPct = Math.round(stats.ombrA / 96 * 100)
  const bPct = Math.round(stats.ombrB / 112 * 100)

  if (loading) return (
    <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
      <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🌊</div>
        <div style={{ fontWeight: 600 }}>Caricamento dati...</div>
      </div>
    </div>
  )

  return (
    <div className="page-content">
      <h1 className="page-title">Dashboard</h1>

      {/* STAT CARDS */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Totali</div>
          <div className="stat-val">292</div>
          <div className="stat-sub">84 palme · 208 ombrelloni</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Occupate</div>
          <div className="stat-val">{stats.occupate}</div>
          <div className="stat-sub">postazioni prese</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Libere</div>
          <div className="stat-val">{stats.libere}</div>
          <div className="stat-sub">disponibili</div>
        </div>
        <div className="stat-card sky">
          <div className="stat-label">Clienti</div>
          <div className="stat-val">{clienti.length}</div>
          <div className="stat-sub">stagione 2025</div>
        </div>
      </div>

      {/* AZIONI RAPIDE */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 12 }}>
          Azioni rapide
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {[
            { icon: '🔍', label: 'Disponibilità', sub: 'Cerca posti liberi', page: 'disponibilita' },
            { icon: '🗺', label: 'Mappa', sub: 'Vista spiaggia', page: 'mappa' },
            { icon: '👤', label: 'Clienti', sub: 'Anagrafica', page: 'clienti' },
            { icon: '⚙️', label: 'Gestione', sub: 'Import Excel', page: 'admin' },
          ].map(a => (
            <button
              key={a.page}
              onClick={() => onNavigate(a.page)}
              style={{
                background: '#fff', border: '1.5px solid #eee', borderRadius: 12,
                padding: '14px 12px', cursor: 'pointer', textAlign: 'left',
                transition: 'all .15s', boxShadow: '0 2px 8px rgba(0,0,0,.04)',
                fontFamily: 'var(--font-body)',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#eee'; e.currentTarget.style.transform = 'none' }}
            >
              <div style={{ fontSize: 26, marginBottom: 8 }}>{a.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 2 }}>{a.label}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{a.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* OCCUPAZIONE */}
      <div className="card">
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>Occupazione per settore</h2>
        {[
          { label: '🌴 Palme', tot: 84, occ: stats.palme, pct: pPct, cls: 'palme' },
          { label: '☂ Sett. A', tot: 96, occ: stats.ombrA, pct: aPct, cls: 'ombrA' },
          { label: '☂ Sett. B', tot: 112, occ: stats.ombrB, pct: bPct, cls: 'ombrB' },
        ].map(s => (
          <div key={s.cls} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
              <span>{s.label} ({s.tot})</span>
              <span>{s.occ}/{s.tot} — {s.pct}%</span>
            </div>
            <div className="occ-bar-wrap">
              <div className={`occ-bar ${s.cls}`} style={{ width: s.pct + '%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
