import { useMemo } from 'react'
import { fmtEur, today, tomorrow } from '../lib/data'

export default function Dashboard({ db, onNavigate, onSqlModal }) {
  const { postazioni, prenotazioni, clienti, pagamenti } = db

  const stats = useMemo(() => {
    const occ    = prenotazioni.length
    const lib    = 292 - occ
    const inc    = pagamenti.reduce((s, p) => s + p.importo, 0)
    const saldi  = prenotazioni.reduce((s, r) => s + (r.saldo_residuo || 0), 0)
    const palmePren = prenotazioni.filter(r => postazioni.find(p => p.id === r.postazione_id && p.tipo === 'palma')).length
    const ombrAPren = prenotazioni.filter(r => postazioni.find(p => p.id === r.postazione_id && p.settore === 'A')).length
    const ombrBPren = prenotazioni.filter(r => postazioni.find(p => p.id === r.postazione_id && p.settore === 'B')).length
    const t = today(), tm = tomorrow()
    const scadenze = prenotazioni.filter(r => r.data_fine === t || r.data_fine === tm)
    return { occ, lib, inc, saldi, palmePren, ombrAPren, ombrBPren, scadenze }
  }, [db])

  const pPct = Math.round(stats.palmePren / 84 * 100)
  const aPct = Math.round(stats.ombrAPren / 96 * 100)
  const bPct = Math.round(stats.ombrBPren / 112 * 100)

  return (
    <div className="page-content">
      <div className="supabase-banner">
        ⚡ <strong>Supabase non connesso</strong> — i dati non vengono salvati.
        <a onClick={onSqlModal}>Configura →</a>
      </div>

      <h1 className="page-title">Dashboard</h1>

      {/* STAT CARDS */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Totali</div>
          <div className="stat-val">292</div>
          <div className="stat-sub">84 palme · 208 ombrelloni</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Prenotate</div>
          <div className="stat-val">{stats.occ}</div>
          <div className="stat-sub">occupate oggi</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Libere</div>
          <div className="stat-val">{Math.max(0, stats.lib)}</div>
          <div className="stat-sub">disponibili</div>
        </div>
        <div className="stat-card sky">
          <div className="stat-label">Incassato</div>
          <div className="stat-val">{fmtEur(stats.inc)}</div>
          <div className="stat-sub">stagione 2025</div>
        </div>
        <div className="stat-card navy">
          <div className="stat-label">Saldi aperti</div>
          <div className="stat-val" style={{ color: stats.saldi > 0 ? 'var(--red)' : 'var(--green)' }}>
            {fmtEur(stats.saldi)}
          </div>
          <div className="stat-sub">da incassare</div>
        </div>
      </div>

      {/* AZIONI RAPIDE — le più usate in primo piano */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12 }}>
          Azioni rapide
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {[
            { icon: '🔍', label: 'Disponibilità', sub: 'Cerca posti liberi', page: 'disponibilita', color: 'var(--navy)' },
            { icon: '➕', label: 'Nuova prenotazione', sub: 'Registra cliente', page: 'prenotazioni', color: 'var(--green)' },
            { icon: '🗺', label: 'Mappa', sub: 'Vista spiaggia', page: 'mappa', color: 'var(--sky)' },
            { icon: '💳', label: 'Incassa', sub: 'Registra pagamento', page: 'prenotazioni', color: 'var(--orange)' },
          ].map(a => (
            <button
              key={a.page + a.icon}
              onClick={() => onNavigate(a.page)}
              style={{
                background: '#fff',
                border: '1.5px solid #eee',
                borderRadius: 14,
                padding: '16px 14px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all .18s',
                boxShadow: '0 2px 8px rgba(0,0,0,.05)',
                fontFamily: 'var(--font-body)',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#eee'; e.currentTarget.style.transform = 'none' }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{a.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 2 }}>{a.label}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{a.sub}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Occupazione settori */}
        <div className="card">
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>Occupazione</h2>
          {[
            { label: '🌴 Palme', tot: 84, pren: stats.palmePren, pct: pPct, cls: 'palme' },
            { label: '☂ Sett. A', tot: 96, pren: stats.ombrAPren, pct: aPct, cls: 'ombrA' },
            { label: '☂ Sett. B', tot: 112, pren: stats.ombrBPren, pct: bPct, cls: 'ombrB' },
          ].map(s => (
            <div key={s.cls} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                <span>{s.label} ({s.tot})</span>
                <span>{s.pren}/{s.tot} — {s.pct}%</span>
              </div>
              <div className="occ-bar-wrap">
                <div className={`occ-bar ${s.cls}`} style={{ width: s.pct + '%' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Scadenze */}
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>
            Scadenze oggi / domani
            {stats.scadenze.length > 0 && (
              <span style={{ marginLeft: 8, background: 'var(--red)', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                {stats.scadenze.length}
              </span>
            )}
          </h2>
          {stats.scadenze.length === 0 ? (
            <div className="card" style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500 }}>
              ✅ Nessuna scadenza imminente
            </div>
          ) : stats.scadenze.map(r => {
            const cl  = clienti.find(c => c.id === r.cliente_id)
            const pos = postazioni.find(p => p.id === r.postazione_id)
            const urgente = r.data_fine === today()
            return (
              <div key={r.id} className={`scadenza-item ${urgente ? 'urgente' : ''}`}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{cl ? `${cl.nome} ${cl.cognome}` : '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {pos ? `${pos.tipo} ${pos.numero}` : '?'}
                  </div>
                </div>
                <span className={`badge ${urgente ? 'badge-red' : 'badge-orange'}`}>
                  {urgente ? 'Oggi' : 'Domani'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
