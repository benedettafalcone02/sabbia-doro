import { useState, useMemo } from 'react'
import LoadingScreen from '../components/LoadingScreen'
import { today } from '../lib/data'

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, g] = d.split('-')
  return `${g}/${m}/${y}`
}

function fmtEur(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v)
}

function tipoLabel(occ) {
  if (!occ) return '—'
  if (occ.tipo_occupazione === 'subaffitto') return 'Subaffitto'
  if (!occ.temporanea) return 'Stagionale'
  const ms = new Date(occ.data_fine) - new Date(occ.data_inizio)
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1
  if (days <= 1)  return 'Giornaliero'
  if (days <= 7)  return 'Settimanale'
  return 'Mensile'
}

const TIPO_BADGE = {
  'Stagionale':  { bg: '#e8f0ff', color: 'var(--navy)' },
  'Subaffitto':  { bg: '#f5f0ff', color: '#7c3aed' },
  'Giornaliero': { bg: '#fff7ed', color: '#ea580c' },
  'Settimanale': { bg: '#fff7ed', color: '#c2410c' },
  'Mensile':     { bg: '#fef9c3', color: '#854d0e' },
}

export default function StoricoPagements({ db }) {
  const { pagamenti, occupazioni, loading } = db

  const curYear = new Date().getFullYear()
  const [filterDal,  setFilterDal]  = useState(`${curYear}-01-01`)
  const [filterAl,   setFilterAl]   = useState(today())
  const [filterTipo, setFilterTipo] = useState('tutti')

  const ricchi = useMemo(() => {
    return (pagamenti || []).map(pg => {
      const occ = (occupazioni || []).find(o => o.id === pg.occupazione_id)
      return {
        ...pg,
        cliente:           occ?.cliente || '—',
        tipo_post:         occ?.tipo    || null,
        numero:            occ?.numero  || null,
        tipo_prenotazione: tipoLabel(occ),
      }
    }).sort((a, b) => (b.data || '').localeCompare(a.data || ''))
  }, [pagamenti, occupazioni])

  const filtered = useMemo(() => {
    return ricchi.filter(pg => {
      if (filterDal && pg.data < filterDal) return false
      if (filterAl  && pg.data > filterAl)  return false
      if (filterTipo !== 'tutti' && pg.tipo_prenotazione !== filterTipo) return false
      return true
    })
  }, [ricchi, filterDal, filterAl, filterTipo])

  const totale = useMemo(() => filtered.reduce((s, pg) => s + Number(pg.importo || 0), 0), [filtered])

  if (loading) return <LoadingScreen />

  return (
    <div className="page-content">
      <h1 className="page-title">Storico Pagamenti</h1>

      {/* Filtri */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 11 }}>Dal</label>
            <input
              type="date" value={filterDal}
              onChange={e => setFilterDal(e.target.value)}
              style={{ fontSize: 14 }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 11 }}>Al</label>
            <input
              type="date" value={filterAl}
              onChange={e => setFilterAl(e.target.value)}
              style={{ fontSize: 14 }}
            />
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: 11 }}>Tipo prenotazione</label>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={{ fontSize: 14 }}>
            <option value="tutti">Tutti i tipi</option>
            <option value="Stagionale">Stagionale</option>
            <option value="Mensile">Mensile</option>
            <option value="Settimanale">Settimanale</option>
            <option value="Giornaliero">Giornaliero</option>
            <option value="Subaffitto">Subaffitto</option>
          </select>
        </div>
      </div>

      {/* Riepilogo */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, padding: '10px 14px',
        background: '#f0f4ff', borderRadius: 10, border: '1px solid #dde8ff',
      }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700 }}>
          {filtered.length} pagament{filtered.length === 1 ? 'o' : 'i'}
        </span>
        <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--navy)' }}>{fmtEur(totale)}</span>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">💰</span>
          <div className="empty-state-title">Nessun pagamento trovato</div>
          <div className="empty-state-sub">Prova a modificare il periodo o il tipo</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(pg => {
            const badge = TIPO_BADGE[pg.tipo_prenotazione] || { bg: '#f0f4ff', color: 'var(--navy)' }
            return (
              <div key={pg.id} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14, marginBottom: 4 }}>
                      {pg.cliente}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {pg.tipo_post && (
                        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                          {pg.tipo_post === 'palma' ? '🌴' : '☂'} {pg.numero}
                        </span>
                      )}
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        padding: '2px 7px', borderRadius: 6,
                        background: badge.bg, color: badge.color,
                      }}>
                        {pg.tipo_prenotazione}
                      </span>
                    </div>
                    {pg.note && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>
                        📝 {pg.note}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--green)' }}>
                      {fmtEur(Number(pg.importo))}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {fmtDate(pg.data)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
