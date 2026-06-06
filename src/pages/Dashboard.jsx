import { useMemo } from 'react'
import LoadingScreen from '../components/LoadingScreen'

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, g] = d.split('-')
  return `${g}/${m}/${y}`
}

export default function Dashboard({ db, onNavigate }) {
  const { postazioni, clienti, loading } = db

  const stats = useMemo(() => ({
    occupate: postazioni.filter(p => p.stato === 'occupato').length,
    libere:   postazioni.filter(p => p.stato === 'libero').length,
    palme:    postazioni.filter(p => p.tipo === 'palma' && p.stato === 'occupato').length,
    ombrA:    postazioni.filter(p => p.tipo === 'ombrellone' && p.settore === 'A' && p.stato === 'occupato').length,
    ombrB:    postazioni.filter(p => p.tipo === 'ombrellone' && p.settore === 'B' && p.stato === 'occupato').length,
  }), [postazioni])

  const temporanee = useMemo(() => {
    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)
    return postazioni
      .filter(p => p.temporanea === true)
      .map(p => {
        const fine = p.data_fine ? new Date(p.data_fine) : null
        const giorni = fine ? Math.ceil((fine - oggi) / (1000 * 60 * 60 * 24)) : null
        return { ...p, giorni }
      })
      .sort((a, b) => (a.giorni ?? 999) - (b.giorni ?? 999))
  }, [postazioni])

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

      {/* PRENOTAZIONI TEMPORANEE */}
      {temporanee.length > 0 && (
        <>
          <div className="section-label">Prenotazioni temporanee ({temporanee.length})</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {temporanee.map((p, i) => {
              const scaduta = p.giorni !== null && p.giorni < 0
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    borderBottom: i < temporanee.length - 1 ? '1px solid #f0f2f5' : 'none',
                    background: scaduta ? '#fff5f5' : '#fff',
                  }}
                >
                  <div style={{ textAlign: 'center', background: scaduta ? 'var(--red)' : '#ffe082', borderRadius: 8, padding: '4px 10px', flexShrink: 0, minWidth: 44 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: scaduta ? '#fff' : 'var(--navy)', lineHeight: 1 }}>
                      {p.giorni !== null ? Math.abs(p.giorni) : '—'}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: scaduta ? '#ffcccc' : '#b8860b', textTransform: 'uppercase' }}>
                      {scaduta ? 'scad.' : 'gg'}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.cliente || '—'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                      {p.tipo === 'palma' ? '🌴 Palma' : '☂ Ombr.'} {p.numero}
                      {p.settore ? ` S.${p.settore}` : ''}
                      {' · '}F{p.fila}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>{fmtDate(p.data_inizio)}</div>
                    <div style={{ fontSize: 12, color: scaduta ? 'var(--red)' : 'var(--muted)', fontWeight: scaduta ? 700 : 400 }}>{fmtDate(p.data_fine)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

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
