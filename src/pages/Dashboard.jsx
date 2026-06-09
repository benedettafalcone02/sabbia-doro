import { useState, useEffect, useMemo } from 'react'
import LoadingScreen from '../components/LoadingScreen'
import { fmtEur, today, tomorrow } from '../lib/data'
import { supabase } from '../lib/supabase'

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, g] = d.split('-')
  return `${g}/${m}/${y}`
}

function fmtDay(dateStr) {
  const d = new Date(dateStr)
  const days   = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
  const months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`
}

function wmoInfo(code) {
  if (code === 0)  return { icon: '☀️', desc: 'Sereno' }
  if (code <= 3)   return { icon: '⛅', desc: 'Poco nuvoloso' }
  if (code <= 48)  return { icon: '🌫️', desc: 'Nebbia' }
  if (code <= 55)  return { icon: '🌦️', desc: 'Pioggerella' }
  if (code <= 65)  return { icon: '🌧️', desc: 'Pioggia' }
  if (code <= 75)  return { icon: '❄️', desc: 'Neve' }
  if (code <= 82)  return { icon: '🌦️', desc: 'Rovesci' }
  return { icon: '⛈️', desc: 'Temporale' }
}

export default function Dashboard({ db, onNavigate, showToast, onReload }) {
  const { postazioni, clienti, occupazioni, richieste, loading } = db

  const [rifiutandoId,     setRifiutandoId]     = useState(null)
  const [noteRifiuto,      setNoteRifiuto]      = useState('')
  const [savingR,          setSavingR]          = useState(false)
  const [approvandoId,     setApprovandoId]     = useState(null)
  const [approvandoNumero, setApprovandoNumero] = useState('')

  function getPostazioniDisponibili(r) {
    const tipo  = r.tipo_postazione
    const tutte = postazioni.filter(p => p.tipo === tipo)
    const occupate = new Set(
      (occupazioni || [])
        .filter(o => o.tipo === tipo && o.data_inizio <= r.data_fine && o.data_fine >= r.data_inizio)
        .map(o => Number(o.numero))
    )
    return tutte.filter(p => !occupate.has(Number(p.numero))).map(p => Number(p.numero)).sort((a, b) => a - b)
  }

  async function handleApprova(r, numero) {
    setSavingR(true)
    try {
      const lettini = r.tipo_postazione === 'palma' ? 3 : 2
      const regista = r.tipo_postazione === 'palma' ? 1 : 0
      const { error: errOcc } = await supabase.from('occupazioni').insert({
        tipo:          r.tipo_postazione,
        numero:        Number(numero),
        cliente:       `${r.nome} ${r.cognome}`.toUpperCase(),
        data_inizio:   r.data_inizio,
        data_fine:     r.data_fine,
        lettini,
        sdraio:        0,
        regista,
        temporanea:    false,
      })
      if (errOcc) throw errOcc

      const { error: errR } = await supabase
        .from('richieste_prenotazione')
        .update({ stato: 'approvata' })
        .eq('id', r.id)
      if (errR) throw errR

      showToast('Prenotazione approvata ✓')
      setApprovandoId(null)
      setApprovandoNumero('')
      if (onReload) onReload()
    } catch (err) {
      console.error(err)
      showToast('Errore nell\'approvazione', 'error')
    }
    setSavingR(false)
  }

  async function handleRifiuta(id) {
    setSavingR(true)
    try {
      const { error } = await supabase
        .from('richieste_prenotazione')
        .update({ stato: 'rifiutata', note_admin: noteRifiuto || null })
        .eq('id', id)
      if (error) throw error
      showToast('Richiesta rifiutata')
      setRifiutandoId(null)
      setNoteRifiuto('')
      if (onReload) onReload()
    } catch (err) {
      console.error(err)
      showToast('Errore', 'error')
    }
    setSavingR(false)
  }
  const [meteo, setMeteo] = useState(null)

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=42.4618&longitude=14.2168&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FRome&forecast_days=3')
      .then(r => r.json())
      .then(data => setMeteo(data.daily))
      .catch(() => {})
  }, [])

  const stats = useMemo(() => ({
    occupate: postazioni.filter(p => p.stato === 'occupato').length,
    libere:   postazioni.filter(p => p.stato === 'libero').length,
    palme:    postazioni.filter(p => p.tipo === 'palma' && p.stato === 'occupato').length,
    ombrA:    postazioni.filter(p => p.tipo === 'ombrellone' && p.settore === 'A' && p.stato === 'occupato').length,
    ombrB:    postazioni.filter(p => p.tipo === 'ombrellone' && p.settore === 'B' && p.stato === 'occupato').length,
  }), [postazioni])

  const scadenze = useMemo(() => {
    return postazioni
      .filter(p => !!p.temporanea && p.prezzo_totale != null)
      .map(p => {
        const pagamenti    = p.pagamenti || []
        const totalePagato = pagamenti.reduce((s, pg) => s + Number(pg.importo), 0)
        const saldo        = Math.max(0, p.prezzo_totale - totalePagato)
        return { ...p, totalePagato, saldo }
      })
      .sort((a, b) => b.saldo - a.saldo)
  }, [postazioni])

  const arriviOggi = useMemo(() => {
    const t = today()
    return (occupazioni || [])
      .filter(o => o.data_inizio === t)
      .map(o => {
        const pos = postazioni.find(p => p.tipo === o.tipo && Number(p.numero) === Number(o.numero))
        return { ...o, settore: pos?.settore || null }
      })
      .sort((a, b) => (a.cliente || '').localeCompare(b.cliente || ''))
  }, [occupazioni, postazioni])

  const arriviDomani = useMemo(() => {
    const d = tomorrow()
    return (occupazioni || [])
      .filter(o => o.data_inizio === d)
      .map(o => {
        const pos = postazioni.find(p => p.tipo === o.tipo && Number(p.numero) === Number(o.numero))
        return { ...o, settore: pos?.settore || null }
      })
      .sort((a, b) => (a.cliente || '').localeCompare(b.cliente || ''))
  }, [occupazioni, postazioni])

  const prenotazioniFuture = useMemo(() => {
    const t = today()
    const future = (occupazioni || []).filter(o => o.data_inizio > t)
    const grouped = {}
    future.forEach(o => {
      const key = `${o.tipo}_${o.numero}`
      if (!grouped[key]) {
        const pos = postazioni.find(p => p.tipo === o.tipo && Number(p.numero) === Number(o.numero))
        grouped[key] = { key, tipo: o.tipo, numero: o.numero, settore: pos?.settore || null, bookings: [] }
      }
      grouped[key].bookings.push(o)
    })
    return Object.values(grouped)
      .map(g => ({ ...g, bookings: g.bookings.sort((a, b) => a.data_inizio.localeCompare(b.data_inizio)) }))
      .sort((a, b) => a.bookings[0].data_inizio.localeCompare(b.bookings[0].data_inizio))
  }, [occupazioni, postazioni])

  const subaffitti = useMemo(() => {
    const oggi = today()
    return (occupazioni || [])
      .filter(o => o.tipo_occupazione === 'subaffitto' && o.data_fine >= oggi)
      .sort((a, b) => a.data_inizio.localeCompare(b.data_inizio))
      .map(o => {
        const pos = postazioni.find(p => p.tipo === o.tipo && Number(p.numero) === Number(o.numero))
        return { ...o, settore: pos?.settore || null, fila: pos?.fila || null }
      })
  }, [occupazioni, postazioni])

  const disponibili = useMemo(() => {
    const oggi = today()
    return (occupazioni || [])
      .filter(o => (o.tipo_occupazione === 'disponibile' || o.tipo_occupazione === 'subaffitto_disponibile') && o.data_fine >= oggi)
      .sort((a, b) => a.data_inizio.localeCompare(b.data_inizio))
      .map(o => {
        const pos = postazioni.find(p => p.tipo === o.tipo && Number(p.numero) === Number(o.numero))
        return { ...o, settore: pos?.settore || null, fila: pos?.fila || null }
      })
  }, [occupazioni, postazioni])

  const temporanee = useMemo(() => {
    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)
    return postazioni
      .filter(p => !!p.temporanea)
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

      {/* RICHIESTE IN ATTESA */}
      {richieste && richieste.length > 0 && (
        <>
          <div className="section-label" style={{ color: 'var(--red)' }}>
            🔔 Richieste in attesa ({richieste.length})
          </div>
          <div style={{ marginBottom: 24 }}>
            {richieste.map(r => (
              <div key={r.id} style={{ background: '#fff', borderRadius: 16, marginBottom: 10, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.07)', border: '1.5px solid #fee2e2' }}>
                {/* Info */}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15 }}>
                      {r.nome} {r.cognome}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
                      {fmtDate(r.created_at?.slice(0,10))}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
                    {r.tipo_postazione === 'palma' ? '🌴 Palma' : '☂ Ombrellone'} {r.numero_postazione}
                    {' · '}{fmtDate(r.data_inizio)} → {fmtDate(r.data_fine)}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    📱 {r.telefono}{r.email ? ` · ${r.email}` : ''}
                  </div>
                </div>

                {/* Conferma rifiuto */}
                {rifiutandoId === r.id ? (
                  <div style={{ background: '#fff8f8', borderTop: '1px solid #fee2e2', padding: '12px 16px' }}>
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11 }}>Motivo rifiuto (opzionale)</label>
                      <input type="text" value={noteRifiuto}
                        onChange={e => setNoteRifiuto(e.target.value)}
                        placeholder="es. periodo non disponibile..."
                        style={{ fontSize: 14 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
                        onClick={() => { setRifiutandoId(null); setNoteRifiuto('') }}>
                        Annulla
                      </button>
                      <button
                        className="btn"
                        style={{ flex: 1, justifyContent: 'center', fontSize: 13, background: 'var(--red)', color: '#fff' }}
                        disabled={savingR}
                        onClick={() => handleRifiuta(r.id)}
                      >
                        {savingR ? '...' : '✕ Conferma rifiuto'}
                      </button>
                    </div>
                  </div>
                ) : approvandoId === r.id ? (
                  <div style={{ background: '#f0fff4', borderTop: '1px solid #bbf7d0', padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 10 }}>
                      Assegna una postazione libera:
                    </div>
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11 }}>
                        {r.tipo_postazione === 'palma' ? 'Numero palma' : 'Numero ombrellone'}
                      </label>
                      <select
                        value={approvandoNumero}
                        onChange={e => setApprovandoNumero(e.target.value)}
                        style={{ fontSize: 14 }}
                      >
                        <option value="">— Seleziona —</option>
                        {getPostazioniDisponibili(r).map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
                        onClick={() => { setApprovandoId(null); setApprovandoNumero('') }}>
                        Annulla
                      </button>
                      <button
                        className="btn"
                        style={{ flex: 1, justifyContent: 'center', fontSize: 13, background: 'var(--green)', color: '#fff', opacity: !approvandoNumero ? .45 : 1 }}
                        disabled={savingR || !approvandoNumero}
                        onClick={() => handleApprova(r, approvandoNumero)}
                      >
                        {savingR ? '...' : '✓ Conferma'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 0, borderTop: '1px solid #f0f2f5' }}>
                    <button
                      onClick={() => { setRifiutandoId(r.id); setNoteRifiuto('') }}
                      disabled={savingR}
                      style={{ flex: 1, padding: '12px', background: '#fff8f8', border: 'none', borderRight: '1px solid #f0f2f5', color: 'var(--red)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                    >
                      ✕ Rifiuta
                    </button>
                    <button
                      onClick={() => { setApprovandoId(r.id); setApprovandoNumero('') }}
                      disabled={savingR}
                      style={{ flex: 1, padding: '12px', background: '#f0fff4', border: 'none', color: '#166534', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                    >
                      ✓ Approva
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* PRENOTAZIONI TEMPORANEE — in cima */}
      {temporanee.length > 0 && (
        <>
          <div className="section-label">Prenotazioni temporanee ({temporanee.length})</div>
          <div className="card" style={{ marginBottom: 24 }}>
            {temporanee.map((p, i) => {
              const scaduta = p.giorni !== null && p.giorni < 0
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    paddingTop: i > 0 ? 12 : 0,
                    paddingBottom: i < temporanee.length - 1 ? 12 : 0,
                    borderBottom: i < temporanee.length - 1 ? '1px solid #f0f2f5' : 'none',
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

      {/* SUBAFFITTI ATTIVI */}
      {subaffitti.length > 0 && (
        <>
          <div className="section-label" style={{ color: '#7c3aed' }}>🟣 Subaffitti attivi ({subaffitti.length})</div>
          <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
            {subaffitti.map((o, i) => (
              <div key={o.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderBottom: i < subaffitti.length - 1 ? '1px solid #f0f2f5' : 'none',
                background: '#faf5ff',
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#8b5cf6', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {o.subaffittuario || '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                    {o.tipo === 'palma' ? '🌴 Palma' : '☂ Ombr.'} {o.numero}{o.settore ? ` S.${o.settore}` : ''}
                    {' · '}Stagionale: {o.cliente || '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed' }}>{fmtDate(o.data_inizio)}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>→ {fmtDate(o.data_fine)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* POSTAZIONI RESE LIBERE */}
      {disponibili.length > 0 && (
        <>
          <div className="section-label" style={{ color: '#0284c7' }}>🔵 Disponibili per subaffitto ({disponibili.length})</div>
          <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
            {disponibili.map((o, i) => (
              <div key={o.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderBottom: i < disponibili.length - 1 ? '1px solid #f0f2f5' : 'none',
                background: '#f0f9ff',
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#0ea5e9', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {o.tipo === 'palma' ? '🌴 Palma' : '☂ Ombr.'} {o.numero}{o.settore ? ` S.${o.settore}` : ''}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                    Stagionale: {o.cliente || '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0284c7' }}>{fmtDate(o.data_inizio)}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>→ {fmtDate(o.data_fine)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ARRIVI OGGI */}
      {arriviOggi.length > 0 && (
        <>
          <div className="section-label">Arrivano oggi ({arriviOggi.length})</div>
          <div className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
            {arriviOggi.map((o, i) => (
              <div key={o.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                borderBottom: i < arriviOggi.length - 1 ? '1px solid #f0f2f5' : 'none',
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{o.tipo === 'palma' ? '🌴' : '☂'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.cliente || '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {o.tipo === 'palma' ? 'Palma' : 'Ombr.'} {o.numero}{o.settore ? ` S.${o.settore}` : ''} · fino al {fmtDate(o.data_fine)}
                  </div>
                </div>
                <span className="badge badge-green" style={{ fontSize: 10, flexShrink: 0 }}>oggi</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ARRIVI DOMANI */}
      {arriviDomani.length > 0 && (
        <>
          <div className="section-label">Arrivano domani ({arriviDomani.length})</div>
          <div className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
            {arriviDomani.map((o, i) => (
              <div key={o.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                borderBottom: i < arriviDomani.length - 1 ? '1px solid #f0f2f5' : 'none',
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{o.tipo === 'palma' ? '🌴' : '☂'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.cliente || '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {o.tipo === 'palma' ? 'Palma' : 'Ombr.'} {o.numero}{o.settore ? ` S.${o.settore}` : ''} · fino al {fmtDate(o.data_fine)}
                  </div>
                </div>
                <span className="badge badge-yellow" style={{ fontSize: 10, flexShrink: 0 }}>domani</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* PRENOTAZIONI FUTURE */}
      {prenotazioniFuture.length > 0 && (
        <>
          <div className="section-label">Prenotazioni future ({prenotazioniFuture.reduce((s, g) => s + g.bookings.length, 0)})</div>
          <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
            {prenotazioniFuture.map((g, gi) => (
              <div key={g.key} style={{ borderBottom: gi < prenotazioniFuture.length - 1 ? '1px solid #f0f2f5' : 'none' }}>
                <div style={{ padding: '8px 14px 4px', fontSize: 12, fontWeight: 700, color: 'var(--navy)', background: '#fafbff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{g.tipo === 'palma' ? '🌴' : '☂'}</span>
                  <span>{g.tipo === 'palma' ? 'Palma' : 'Ombrellone'} {g.numero}{g.settore ? ` S.${g.settore}` : ''}</span>
                  <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {g.bookings.length} prenotaz.</span>
                </div>
                {g.bookings.map((o, bi) => (
                  <div key={o.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px 7px 28px',
                    borderTop: '1px solid #f4f6fb',
                    background: bi % 2 === 0 ? '#fff' : '#fafbff',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.cliente || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDate(o.data_inizio)} → {fmtDate(o.data_fine)}</div>
                    </div>
                    {o.temporanea && <span className="badge badge-yellow" style={{ fontSize: 10, flexShrink: 0 }}>temp</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* SCADENZE E PAGAMENTI — solo temporanee */}
      {scadenze.length > 0 && (
        <>
          <div className="section-label">Scadenze e pagamenti ({scadenze.length})</div>
          <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
            {scadenze.map((p, i) => {
              const pagato = p.saldo === 0
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    borderBottom: i < scadenze.length - 1 ? '1px solid #f0f2f5' : 'none',
                    background: pagato ? '#f6fff8' : '#fff8f8',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.cliente || '—'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                      {p.tipo === 'palma' ? '🌴 Palma' : '☂ Ombr.'} {p.numero}
                      {p.settore ? ` S.${p.settore}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: pagato ? 'var(--green)' : 'var(--red)' }}>
                      {pagato ? fmtEur(p.prezzo_totale) : `−${fmtEur(p.saldo)}`}
                    </div>
                    <span
                      className={`badge ${pagato ? 'badge-green' : 'badge-red'}`}
                      style={{ fontSize: 10, marginTop: 4 }}
                    >
                      {pagato ? '✓ Saldato' : 'Da pagare'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* STAT PRINCIPALI: Occupate + Libere */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
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

      {/* METEO PESCARA */}
      {meteo && (
        <>
          <div className="section-label">Meteo Pescara</div>
          <div className="card" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {meteo.time.map((date, i) => {
                const { icon, desc } = wmoInfo(meteo.weathercode[i])
                const max = Math.round(meteo.temperature_2m_max[i])
                const min = Math.round(meteo.temperature_2m_min[i])
                return (
                  <div key={date} style={{ textAlign: 'center', background: '#f7f9ff', borderRadius: 10, padding: '10px 8px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                      {fmtDay(date)}
                    </div>
                    <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 4 }}>{icon}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{desc}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>
                      {max}° <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{min}°</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* STAT SECONDARIE: Totali + Clienti */}
      <div className="section-label" style={{ marginTop: 24 }}>Riepilogo</div>
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card navy">
          <div className="stat-label">Totali</div>
          <div className="stat-val">292</div>
          <div className="stat-sub">84 Palme · 208 Ombrelloni</div>
        </div>
        <div className="stat-card sky">
          <div className="stat-label">Clienti</div>
          <div className="stat-val">{clienti.length}</div>
          <div className="stat-sub">stagione 2025</div>
        </div>
      </div>

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
