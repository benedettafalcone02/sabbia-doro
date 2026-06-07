import { useState } from 'react'
import LoadingScreen from '../components/LoadingScreen'
import { today } from '../lib/data'

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, g] = d.split('-')
  return `${g}/${m}/${y}`
}

export default function Disponibilita({ db }) {
  const { postazioni, occupazioni, loading } = db
  const [dataInizio, setDataInizio] = useState(today())
  const [dataFine,   setDataFine]   = useState(today())
  const [searched,   setSearched]   = useState(false)
  const [tipo,       setTipo]       = useState('tutti')
  const [settore,    setSettore]    = useState('tutti')

  if (loading) return <LoadingScreen />

  function isLiberaInPeriodo(p) {
    return !(occupazioni || []).some(o =>
      o.tipo    === p.tipo &&
      Number(o.numero) === Number(p.numero) &&
      o.data_inizio <= dataFine &&
      o.data_fine   >= dataInizio
    )
  }

  const libere = searched ? postazioni.filter(p => {
    if (!isLiberaInPeriodo(p)) return false
    if (tipo    === 'palme'      && p.tipo    !== 'palma')      return false
    if (tipo    === 'ombrelloni' && p.tipo    !== 'ombrellone') return false
    if (settore === 'A'          && p.settore !== 'A')          return false
    if (settore === 'B'          && p.settore !== 'B')          return false
    return true
  }) : []

  return (
    <div className="page-content">
      <h1 className="page-title">Disponibilità</h1>

      {/* Ricerca per periodo */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 14 }}>🔍 Cerca postazioni libere</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Dal</label>
            <input type="date" value={dataInizio}
              onChange={e => { setDataInizio(e.target.value); setSearched(false) }}
              style={{ fontSize: 14 }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Al</label>
            <input type="date" value={dataFine} min={dataInizio}
              onChange={e => { setDataFine(e.target.value); setSearched(false) }}
              style={{ fontSize: 14 }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <select className="filter-select" style={{ flex: 1 }} value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="tutti">Tutti i tipi</option>
            <option value="palme">🌴 Solo Palme</option>
            <option value="ombrelloni">☂ Solo Ombrelloni</option>
          </select>
          <select className="filter-select" style={{ flex: 1 }} value={settore} onChange={e => setSettore(e.target.value)}>
            <option value="tutti">Tutti i settori</option>
            <option value="A">Settore A</option>
            <option value="B">Settore B</option>
          </select>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={!dataInizio || !dataFine || dataFine < dataInizio}
          onClick={() => setSearched(true)}
        >
          🔍 Cerca
        </button>
      </div>

      {/* Risultati */}
      {searched ? (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 14 }}>
            {libere.length} postazioni libere · {fmtDate(dataInizio)} → {fmtDate(dataFine)}
          </div>

          {libere.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">😔</span>
              <div className="empty-state-title">Nessuna postazione disponibile</div>
              <div className="empty-state-sub">Prova a cambiare le date o i filtri</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {libere.map(p => (
                <div key={p.id} className="disp-card">
                  <div className="tipo">
                    {p.tipo === 'palma' ? '🌴 Palma' : `☂ Ombr.${p.settore ? ` S.${p.settore}` : ''}`} · F{p.fila}
                  </div>
                  <div className="num">#{p.numero}</div>
                  <span className="badge badge-green" style={{ marginTop: 6 }}>Libera</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <span className="empty-state-icon">📅</span>
          <div className="empty-state-title">Scegli un periodo</div>
          <div className="empty-state-sub">Seleziona le date e premi Cerca</div>
        </div>
      )}
    </div>
  )
}
