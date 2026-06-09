import { useState, useMemo } from 'react'
import LoadingScreen from '../components/LoadingScreen'
import WaBtnLink from '../components/WaBtnLink'
import { fmtEur } from '../lib/data'

const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
const EXCLUDE = new Set(['disponibile', 'subaffitto_disponibile'])

function toStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function fmtShort(s) {
  if (!s) return '—'
  const [, mm, dd] = s.split('-')
  return `${dd}/${mm}`
}
function badgeStyle(n) {
  if (!n) return { bg: '#f3f4f6', color: '#9ca3af' }
  if (n < 100) return { bg: '#dcfce7', color: '#15803d' }
  if (n < 200) return { bg: '#fef3c7', color: '#b45309' }
  return { bg: '#fee2e2', color: '#dc2626' }
}

function PrenotaCard({ o }) {
  const isSub = o.tipo_occupazione === 'subaffitto'
  const nomeDisplay = isSub ? (o.subaffittuario || o.cliente) : o.cliente
  const equip = [
    o.lettini  && `${o.lettini}L`,
    o.sdraio   && `${o.sdraio}S`,
    o.regista  && `${o.regista}R`,
  ].filter(Boolean).join(' ')

  return (
    <div className="card" style={{
      padding: '10px 12px',
      borderLeft: `4px solid ${isSub ? '#7c3aed' : 'var(--navy)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>
            {o.tipo === 'palma' ? '🌴' : '☂'} {o.tipo === 'palma' ? 'P' : 'O'}·{o.numero}
          </span>
          {isSub && <span className="badge badge-purple" style={{ fontSize: 10 }}>Sub</span>}
        </div>
        <WaBtnLink tel={o.telefono} size={32} />
      </div>

      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)', marginBottom: 3 }}>
        {nomeDisplay || '—'}
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: o.prezzo_totale != null ? 6 : 0 }}>
        {fmtShort(o.data_inizio)} → {fmtShort(o.data_fine)}
        {equip ? ` · ${equip}` : ''}
      </div>

      {o.prezzo_totale != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Totale: {fmtEur(o.prezzo_totale)}</span>
          {o.saldo > 0 ? (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', background: '#fee2e2', borderRadius: 4, padding: '1px 6px' }}>
              Da saldare: {fmtEur(o.saldo)}
            </span>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d', background: '#dcfce7', borderRadius: 4, padding: '1px 6px' }}>
              Pagato ✓
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function Calendario({ db }) {
  const { occupazioni, pagamenti, loading } = db
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [sel, setSel] = useState(todayStr)

  const { year, month } = view

  const prevMonth = () =>
    setView(v => { const d = new Date(v.year, v.month - 1); return { year: d.getFullYear(), month: d.getMonth() } })
  const nextMonth = () =>
    setView(v => { const d = new Date(v.year, v.month + 1); return { year: d.getFullYear(), month: d.getMonth() } })

  const calDays = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    let startWday = (new Date(year, month, 1).getDay() + 6) % 7 // Mon=0
    const arr = []
    for (let i = 0; i < startWday; i++) arr.push(null)
    for (let d = 1; d <= daysInMonth; d++) arr.push(d)
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [year, month])

  const dayCounts = useMemo(() => {
    const counts = {}
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const relevant = (occupazioni || []).filter(o => !EXCLUDE.has(o.tipo_occupazione))
    for (let d = 1; d <= daysInMonth; d++) {
      const s = toStr(year, month, d)
      const seen = new Set()
      for (const o of relevant) {
        if (o.data_inizio && o.data_fine && o.data_inizio <= s && o.data_fine >= s) {
          seen.add(`${o.tipo}_${o.numero}`)
        }
      }
      counts[s] = seen.size
    }
    return counts
  }, [occupazioni, year, month])

  const detail = useMemo(() => {
    if (!sel) return { list: [], arrivi: 0, partenze: 0, daSaldare: 0 }

    // Tutte le righe reali (no disponibile)
    const sort = arr => [...arr].sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === 'palma' ? -1 : 1
      return Number(a.numero) - Number(b.numero)
    })

    const mapped = (occupazioni || [])
      .filter(o => !EXCLUDE.has(o.tipo_occupazione) && o.data_inizio && o.data_fine)
      .map(o => {
        const pags = (pagamenti || []).filter(pg => pg.occupazione_id === o.id)
        const pagato = pags.reduce((s, pg) => s + Number(pg.importo || 0), 0)
        const saldo = o.prezzo_totale != null ? Math.max(0, Number(o.prezzo_totale) - pagato) : null
        return { ...o, pagato, saldo }
      })

    // Solo arrivi e partenze del giorno
    const arriviList  = sort(mapped.filter(o => o.data_inizio === sel))
    const partenzeList = sort(mapped.filter(o => o.data_fine === sel))

    // Da saldare = subaffitti e temporanee che arrivano O partono oggi con saldo aperto
    const ids = new Set()
    const daSaldare = [...arriviList, ...partenzeList].filter(o => {
      if (ids.has(o.id)) return false
      ids.add(o.id)
      return (o.tipo_occupazione === 'subaffitto' || o.temporanea) && o.saldo > 0
    }).length

    return { arriviList, partenzeList, arrivi: arriviList.length, partenze: partenzeList.length, daSaldare }
  }, [sel, occupazioni, pagamenti])

  if (loading) return <LoadingScreen />

  const selDate = sel ? new Date(sel + 'T00:00:00') : null
  const selLabel = selDate
    ? `${selDate.getDate()} ${MONTHS[selDate.getMonth()]} ${selDate.getFullYear()}`
    : ''

  return (
    <div className="page-content">
      <h1 className="page-title">Calendario</h1>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button className="btn" style={{ padding: '6px 16px', fontSize: 20, lineHeight: 1 }} onClick={prevMonth}>‹</button>
        <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--navy)', fontFamily: 'var(--font-display)' }}>
          {MONTHS[month]} {year}
        </div>
        <button className="btn" style={{ padding: '6px 16px', fontSize: 20, lineHeight: 1 }} onClick={nextMonth}>›</button>
      </div>

      {/* Calendar grid */}
      <div className="card" style={{ padding: '10px 6px', marginBottom: 16 }}>
        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {WEEKDAYS.map((wd, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted)', padding: '2px 0' }}>
              {wd}
            </div>
          ))}
        </div>
        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {calDays.map((day, idx) => {
            if (!day) return <div key={idx} />
            const s = toStr(year, month, day)
            const cnt = dayCounts[s] || 0
            const bs = badgeStyle(cnt)
            const isToday = s === todayStr
            const isSel = s === sel
            return (
              <div
                key={idx}
                onClick={() => setSel(s)}
                style={{
                  cursor: 'pointer',
                  borderRadius: 8,
                  padding: '4px 2px',
                  textAlign: 'center',
                  background: isSel ? 'var(--navy)' : 'transparent',
                  border: isToday && !isSel ? '2px solid var(--navy)' : '2px solid transparent',
                  minHeight: 54,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <div style={{
                  fontSize: 13,
                  fontWeight: isSel || isToday ? 700 : 500,
                  color: isSel ? '#fff' : 'var(--navy)',
                }}>
                  {day}
                </div>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: isSel ? 'rgba(255,255,255,.25)' : bs.bg,
                  color: isSel ? '#fff' : bs.color,
                  borderRadius: 4,
                  padding: '1px 4px',
                  lineHeight: 1.5,
                  minWidth: 22,
                }}>
                  {cnt}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {sel && (
        <>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Arrivi',     value: detail.arrivi,    bg: '#dcfce7', color: '#15803d' },
              { label: 'Partenze',   value: detail.partenze,  bg: '#fef3c7', color: '#b45309' },
              { label: 'Da saldare', value: detail.daSaldare, bg: '#fee2e2', color: '#dc2626' },
            ].map(({ label, value, bg, color }) => (
              <div key={label} className="card" style={{ padding: '10px 6px', textAlign: 'center', background: bg, border: 'none' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Day title */}
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>
            {selLabel}
          </div>

          {detail.arrivi === 0 && detail.partenze === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🏖</span>
              <div className="empty-state-title">Nessun movimento</div>
              <div className="empty-state-sub">Nessun arrivo né partenza in questa data</div>
            </div>
          ) : (
            <div style={{ paddingBottom: 24 }}>
              {/* Arrivi */}
              {detail.arriviList.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ background: '#dcfce7', borderRadius: 4, padding: '2px 7px' }}>▶ Arrivi ({detail.arriviList.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {detail.arriviList.map(o => <PrenotaCard key={o.id} o={o} sel={sel} />)}
                  </div>
                </>
              )}

              {/* Partenze */}
              {detail.partenzeList.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ background: '#fef3c7', borderRadius: 4, padding: '2px 7px' }}>◀ Partenze ({detail.partenzeList.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detail.partenzeList.map(o => <PrenotaCard key={o.id} o={o} sel={sel} />)}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
