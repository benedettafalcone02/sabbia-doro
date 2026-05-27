import { useState } from 'react'
import { fmtEur } from '../lib/data'
import LoadingScreen from '../components/LoadingScreen'

export default function Disponibilita({ db }) {
  const { postazioni, loading } = db
  const [tipo, setTipo]       = useState('tutti')
  const [settore, setSettore] = useState('tutti')

  if (loading) return <LoadingScreen />

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

      {/* Stats */}
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
      <div className="filter-bar">
        <select className="filter-select" value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="tutti">Tutti i tipi</option>
          <option value="palme">🌴 Solo Palme</option>
          <option value="ombrelloni">☂ Solo Ombrelloni</option>
        </select>
        <select className="filter-select" value={settore} onChange={e => setSettore(e.target.value)}>
          <option value="tutti">Tutti i settori</option>
          <option value="A">Settore A</option>
          <option value="B">Settore B</option>
        </select>
      </div>

      {/* Contatore risultati */}
      <div className="section-label" style={{ marginBottom: 14 }}>
        {libere.length} postazioni libere
      </div>

      {libere.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">🔍</span>
          <div className="empty-state-title">Nessuna postazione trovata</div>
          <div className="empty-state-sub">Nessuna postazione libera corrisponde ai filtri selezionati</div>
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
