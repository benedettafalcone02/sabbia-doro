import { useState } from 'react'
import LoadingScreen from '../components/LoadingScreen'
import { today } from '../lib/data'

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, g] = d.split('-')
  return `${g}/${m}/${y}`
}

const SUB_DISP_TYPES = new Set(['subaffitto_disponibile', 'disponibile'])

export default function Disponibilita({ db, onNavigatePrenota }) {
  const { postazioni, occupazioni, loading } = db
  const [dataInizio, setDataInizio] = useState(today())
  const [dataFine,   setDataFine]   = useState(today())
  const [searched,   setSearched]   = useState(false)
  const [tipo,       setTipo]       = useState('tutti')
  const [settore,    setSettore]    = useState('tutti')

  if (loading) return <LoadingScreen />

  // Postazione completamente libera: nessuna riga di qualsiasi tipo nel periodo
  function isLiberaInPeriodo(p) {
    return !(occupazioni || []).some(o =>
      o.tipo    === p.tipo &&
      Number(o.numero) === Number(p.numero) &&
      o.data_inizio <= dataFine &&
      o.data_fine   >= dataInizio
    )
  }

  // Postazione disponibile per subaffitto: ha riga 'disponibile' nel periodo
  // ma non ha già un 'subaffitto' che la blocchi
  function isDisponibileSubaffitto(p) {
    const hasDisp = (occupazioni || []).some(o =>
      o.tipo    === p.tipo &&
      Number(o.numero) === Number(p.numero) &&
      SUB_DISP_TYPES.has(o.tipo_occupazione) &&
      o.data_inizio <= dataFine &&
      o.data_fine   >= dataInizio
    )
    if (!hasDisp) return false
    return !(occupazioni || []).some(o =>
      o.tipo    === p.tipo &&
      Number(o.numero) === Number(p.numero) &&
      o.tipo_occupazione === 'subaffitto' &&
      o.data_inizio <= dataFine &&
      o.data_fine   >= dataInizio
    )
  }

  // Recupera la riga disponibile di una postazione per il periodo
  function getSubDisp(p) {
    return (occupazioni || []).filter(o =>
      o.tipo    === p.tipo &&
      Number(o.numero) === Number(p.numero) &&
      SUB_DISP_TYPES.has(o.tipo_occupazione) &&
      o.data_inizio <= dataFine &&
      o.data_fine   >= dataInizio
    )
  }

  function passaFiltri(p) {
    if (tipo    === 'palme'      && p.tipo    !== 'palma')      return false
    if (tipo    === 'ombrelloni' && p.tipo    !== 'ombrellone') return false
    if (settore === 'A'          && p.settore !== 'A')          return false
    if (settore === 'B'          && p.settore !== 'B')          return false
    return true
  }

  const libere   = searched ? postazioni.filter(p => isLiberaInPeriodo(p)       && passaFiltri(p)) : []
  const subDisp  = searched ? postazioni.filter(p => isDisponibileSubaffitto(p) && passaFiltri(p)) : []

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
          {/* Postazioni in subaffitto disponibile */}
          {subDisp.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
                🔵 {subDisp.length} disponibili per subaffitto · {fmtDate(dataInizio)} → {fmtDate(dataFine)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
                {subDisp.map(p => {
                  const occs = getSubDisp(p)
                  const occ  = occs[0]
                  return (
                    <div
                      key={p.id}
                      className="disp-card"
                      onClick={() => onNavigatePrenota && onNavigatePrenota(p.id, occ.data_inizio, occ.data_fine)}
                      style={{ cursor: onNavigatePrenota ? 'pointer' : 'default', borderColor: '#7dd3fc', background: '#f0f9ff' }}
                    >
                      <div className="tipo">
                        {p.tipo === 'palma' ? '🌴 Palma' : `☂ Ombr.${p.settore ? ` S.${p.settore}` : ''}`} · F{p.fila}
                      </div>
                      <div className="num">#{p.numero}</div>
                      <span className="badge badge-sky" style={{ marginTop: 6 }}>Subaffitto</span>
                      <div style={{ fontSize: 10, color: '#0284c7', fontWeight: 600, marginTop: 4 }}>
                        {fmtDate(occ.data_inizio)} → {fmtDate(occ.data_fine)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {occ.cliente || '—'}
                      </div>
                      {occ.note && (
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, fontStyle: 'italic' }}>📝 {occ.note}</div>
                      )}
                      {onNavigatePrenota && (
                        <span style={{ fontSize: 11, color: 'var(--sky)', fontWeight: 600, marginTop: 4, display: 'block' }}>Prenota →</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Postazioni completamente libere */}
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 14 }}>
            {libere.length} postazioni libere · {fmtDate(dataInizio)} → {fmtDate(dataFine)}
          </div>

          {libere.length === 0 && subDisp.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">😔</span>
              <div className="empty-state-title">Nessuna postazione disponibile</div>
              <div className="empty-state-sub">Prova a cambiare le date o i filtri</div>
            </div>
          ) : libere.length > 0 ? (
            <>
              {onNavigatePrenota && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, textAlign: 'center' }}>
                  Tocca una postazione per prenotarla
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                {libere.map(p => (
                  <div
                    key={p.id}
                    className="disp-card"
                    onClick={() => onNavigatePrenota && onNavigatePrenota(p.id, dataInizio, dataFine)}
                    style={{ cursor: onNavigatePrenota ? 'pointer' : 'default' }}
                  >
                    <div className="tipo">
                      {p.tipo === 'palma' ? '🌴 Palma' : `☂ Ombr.${p.settore ? ` S.${p.settore}` : ''}`} · F{p.fila}
                    </div>
                    <div className="num">#{p.numero}</div>
                    <span className="badge badge-green" style={{ marginTop: 6 }}>Libera</span>
                    {onNavigatePrenota && (
                      <span style={{ fontSize: 11, color: 'var(--sky)', fontWeight: 600, marginTop: 4, display: 'block' }}>Prenota →</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : null}
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
