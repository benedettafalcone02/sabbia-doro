import { useState, useMemo } from 'react'
import { getStatoBadgeClass, getStatoLabel, fmtEur } from '../lib/data'

export default function Prenotazioni({ db, onNuova, onEdit, onPagamento }) {
  const { prenotazioni, clienti, postazioni } = db
  const [search, setSearch]       = useState('')
  const [statoFilter, setStatoFilter] = useState('')

  const lista = useMemo(() => {
    return prenotazioni.filter(r => {
      const cl  = clienti.find(c => c.id === r.cliente_id)
      const pos = postazioni.find(p => p.id === r.postazione_id)
      const q   = search.toLowerCase()
      const matchSearch = !q || `${cl?.nome||''} ${cl?.cognome||''} ${pos?.numero||''}`.toLowerCase().includes(q)
      const matchStato  = !statoFilter || r.stato_pagamento === statoFilter
      return matchSearch && matchStato
    })
  }, [prenotazioni, clienti, postazioni, search, statoFilter])

  function exportCSV() {
    const rows = [['ID','Cliente','Postazione','Tipo','Dal','Al','Totale','Acconto','Saldo','Stato']]
    prenotazioni.forEach(r => {
      const cl  = clienti.find(c => c.id === r.cliente_id)
      const pos = postazioni.find(p => p.id === r.postazione_id)
      rows.push([r.id, cl ? `${cl.nome} ${cl.cognome}` : '', pos ? `${pos.tipo} ${pos.numero}` : '',
        r.tipo||'', r.data_inizio||'', r.data_fine||'', r.prezzo_totale||0,
        r.acconto_versato||0, r.saldo_residuo||0, r.stato_pagamento||''])
    })
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv)
    a.download = 'prenotazioni_sabbiadoro.csv'
    a.click()
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Prenotazioni</h1>
        <button className="btn btn-yellow" onClick={() => onNuova()} style={{ flexShrink: 0 }}>
          + Nuova
        </button>
      </div>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Cerca cliente o postazione..."
          style={{ flex: 1, minWidth: 180, padding: '10px 14px', borderRadius: 8, border: '1.5px solid #dde3ed', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none' }}
        />
        <select
          value={statoFilter}
          onChange={e => setStatoFilter(e.target.value)}
          style={{ padding: '10px 13px', borderRadius: 8, border: '1.5px solid #dde3ed', fontFamily: 'var(--font-body)', fontSize: 13, background: '#fff' }}
        >
          <option value="">Tutti gli stati</option>
          <option value="da_pagare">Da pagare</option>
          <option value="acconto_versato">Acconto versato</option>
          <option value="saldo">Pagato</option>
        </select>
        <button className="btn btn-outline btn-sm" onClick={exportCSV} style={{ flexShrink: 0 }}>⬇ CSV</button>
      </div>

      {/* Cards mobile / tabella desktop */}
      {lista.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontWeight: 600 }}>Nessuna prenotazione trovata</div>
          <button className="btn btn-yellow" style={{ marginTop: 16 }} onClick={() => onNuova()}>+ Crea la prima</button>
        </div>
      ) : (
        <>
          {/* MOBILE: card list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="mobile-only">
            {lista.map(r => {
              const cl  = clienti.find(c => c.id === r.cliente_id)
              const pos = postazioni.find(p => p.id === r.postazione_id)
              const saldo = (r.prezzo_totale || 0) - (r.acconto_versato || 0)
              return (
                <div key={r.id} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>
                        {cl ? `${cl.nome} ${cl.cognome}` : '—'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {pos ? `${pos.tipo === 'palma' ? '🌴' : '☂'} ${pos.numero}` : '—'} · {r.data_inizio} → {r.data_fine}
                      </div>
                    </div>
                    <span className={`badge ${getStatoBadgeClass(r.stato_pagamento)}`}>
                      {getStatoLabel(r.stato_pagamento)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13 }}>
                      Totale: <strong>{fmtEur(r.prezzo_totale)}</strong>
                      {saldo > 0 && <span style={{ color: 'var(--red)', marginLeft: 8 }}>Saldo: <strong>{fmtEur(saldo)}</strong></span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => onEdit(r.id)}>✏</button>
                      <button className="btn btn-yellow btn-sm" onClick={() => onPagamento(r.id)}>💳</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* DESKTOP: tabella */}
          <div className="tbl-wrap desktop-only">
            <table>
              <thead>
                <tr><th>Cliente</th><th>Postazione</th><th>Periodo</th><th>Tipo</th><th>Totale</th><th>Saldo</th><th>Stato</th><th>Azioni</th></tr>
              </thead>
              <tbody>
                {lista.map(r => {
                  const cl  = clienti.find(c => c.id === r.cliente_id)
                  const pos = postazioni.find(p => p.id === r.postazione_id)
                  const saldo = (r.prezzo_totale || 0) - (r.acconto_versato || 0)
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700 }}>{cl ? `${cl.nome} ${cl.cognome}` : '—'}</td>
                      <td>{pos ? `${pos.tipo === 'palma' ? '🌴' : '☂'} ${pos.numero}${pos.settore ? ` S.${pos.settore}` : ''}` : '—'}</td>
                      <td style={{ fontSize: 12 }}>{r.data_inizio} → {r.data_fine}</td>
                      <td><span className="badge badge-blue">{r.tipo}</span></td>
                      <td style={{ fontWeight: 700 }}>{fmtEur(r.prezzo_totale)}</td>
                      <td style={{ fontWeight: 700, color: saldo > 0 ? 'var(--red)' : 'var(--green)' }}>{fmtEur(saldo)}</td>
                      <td><span className={`badge ${getStatoBadgeClass(r.stato_pagamento)}`}>{getStatoLabel(r.stato_pagamento)}</span></td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => onEdit(r.id)}>✏</button>
                        <button className="btn btn-yellow btn-sm" onClick={() => onPagamento(r.id)}>💳</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
