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

      {/* STAT GRID 2x2 compatto */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Totali',    val: 292,             sub: '84P · 208O',        color: 'var(--navy)' },
          { label: 'Occupate',  val: stats.occupate,  sub: 'postazioni prese',  color: 'var(--red)' },
          { label: 'Libere',    val: stats.libere,    sub: 'disponibili',       color: 'var(--green)' },
          { label: 'Clienti',   val: clienti.length,  sub: 'stagione 2025',     color: 'var(--sky)' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: 14, padding: '16px 18px',
            boxShadow: '0 2px 10px rgba(31,78,121,.07)',
            borderTop: `3px solid ${s.color}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontWeight: 500 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* AZIONI RAPIDE */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 10 }}>
          Azioni rapide
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: '🔍', label: 'Disponibilità',     sub: 'Posti liberi',      page: 'disponibilita', bg: '#f0f4ff' },
            { icon: '➕', label: 'Nuova Prenotazione', sub: 'Aggiungi cliente',  page: 'prenota',       bg: '#e8f8f0' },
            { icon: '🗺', label: 'Mappa',              sub: 'Vista spiaggia',    page: 'mappa',         bg: '#fff8e8' },
            { icon: '👤', label: 'Clienti',            sub: 'Anagrafica',        page: 'clienti',       bg: '#f5f0ff' },
          ].map(a => (
            <button
              key={a.page}
              onClick={() => onNavigate(a.page)}
              style={{
                background: a.bg, border: 'none', borderRadius: 14,
                padding: '16px 14px', cursor: 'pointer', textAlign: 'left',
                transition: 'all .15s', fontFamily: 'var(--font-body)',
                boxShadow: '0 1px 4px rgba(0,0,0,.04)',
              }}
              onTouchStart={e => e.currentTarget.style.opacity = '.85'}
              onTouchEnd={e => e.currentTarget.style.opacity = '1'}
            >
              <div style={{ fontSize: 28, marginBottom: 8, lineHeight: 1 }}>{a.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 2 }}>{a.label}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{a.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* OCCUPAZIONE */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '18px 18px', boxShadow: '0 2px 10px rgba(31,78,121,.07)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>Occupazione stagione</div>
        {[
          { label: '🌴 Palme', tot: 84,  occ: stats.palme, pct: pPct, color: 'var(--navy)' },
          { label: '☂ Sett. A', tot: 96, occ: stats.ombrA, pct: aPct, color: 'var(--sky)' },
          { label: '☂ Sett. B', tot: 112,occ: stats.ombrB, pct: bPct, color: 'var(--yellow)' },
        ].map(s => (
          <div key={s.label} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 5 }}>
              <span>{s.label}</span>
              <span style={{ color: 'var(--muted)' }}>{s.occ}/{s.tot} — <strong style={{ color: 'var(--navy)' }}>{s.pct}%</strong></span>
            </div>
            <div style={{ background: '#f0f2f5', borderRadius: 8, height: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 8, background: s.color, width: s.pct + '%', transition: 'width .5s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
