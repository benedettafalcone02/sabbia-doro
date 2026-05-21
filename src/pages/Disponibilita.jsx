import { useState } from 'react'
import { fmtEur } from '../lib/data'

export default function Disponibilita({ db, showToast }) {
  const { postazioni } = db
  const [tipo, setTipo] = useState('tutti')
  const [settore, setSettore] = useState('tutti')

  const libere = postazioni.filter(p => {
    if (p.stato !== 'libero') return false
    if (tipo === 'palme' && p.tipo !== 'palma') return false
    if (tipo === 'ombrelloni' && p.tipo !== 'ombrellone') return false
    if (settore === 'A' && p.settore !== 'A') return false
    if (settore === 'B' && p.settore !== 'B') return false
    return true
  })

  const occupate = postazioni.filter(p => p.stato === 'occupato')

  return (
    <div className="page-content">
      <h1 className="page-title">Disponibilità</h1>

      {/* Stats veloci */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card green">
          <div className="stat-label">Libere totali</div>
          <div className="stat-val">{postazioni.filter(p => p.stato === 'libero').length}</div>
          <div className="stat-sub">su 292</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Occupate</div>
          <div className="stat-val">{occupate.length}</div>
          <div className="stat-sub">postazioni prese</div>
        </div>
      </div>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={tipo}
          onChange={e => setTipo(e.target.value)}
          style={{ padding: '10px 13px', borderRadius: 8, border: '1.5px solid #dde3ed', fontFamily: 'var(--font-body)', fontSize: 13, background: '#fff' }}
        >
          <option value="tutti">Tutti i tipi</option>
          <option value="palme">🌴 Solo Palme</option>
          <option value="ombrelloni">☂ Solo Ombrelloni</option>
        </select>
        <select
          value={settore}
          onChange={e => setSettore(e.target.value)}
          style={{ padding: '10px 13px', borderRadius: 8, border: '1.5px solid #dde3ed', fontFamily: 'var(--font-body)', fontSize: 13, background: '#fff' }}
        >
          <option value="tutti">Tutti i settori</option>
          <option value="A">Settore A</option>
          <option value="B">Settore B</option>
        </select>
      </div>

      {/* Risultati */}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 14 }}>
        {libere.length} postazioni libere
      </div>

      {libere.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div style={{ fontWeight: 600 }}>Nessuna postazione libera con questi filtri</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {libere.map(p => (
            <div key={p.id} className="disp-card">
              <div className="tipo">
                {p.tipo === 'palma' ? '🌴 Palma' : `☂ Ombr.${p.settore ? ` S.${p.settore}` : ''}`} · F{p.fila}
              </div>
              <div className="num">#{p.numero}</div>
              <div className="prezzo">
                {fmtEur(p.tipo === 'palma' ? p.prezzo_stagionale : p.prezzo_2lettini)}
              </div>
              <span className="badge badge-green" style={{ marginTop: 6 }}>Libera</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
