import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { today, fmtEur } from '../lib/data'
import LoadingScreen from '../components/LoadingScreen'

const STAGIONE_INIZIO = '2026-06-01'
const STAGIONE_FINE   = '2026-09-30'

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, g] = d.split('-')
  return `${g}/${m}/${y}`
}

export default function Prenota({ db, showToast, onReload, initialPostId, initialDataInizio, initialDataFine }) {
  const { postazioni, clienti, occupazioni, loading } = db

  const isStagionale = initialDataInizio === STAGIONE_INIZIO && initialDataFine === STAGIONE_FINE
  const [stagionale, setStagionale] = useState(isStagionale)

  const [form, setForm] = useState(() => {
    const base = {
      postazione_id: '',
      cliente_nome:  '',
      dotazione:     '2lettini',
      temporanea:    false,
      data_inizio:   initialDataInizio || today(),
      data_fine:     initialDataFine   || '',
      note:          '',
      lettini:       2,
      sdraio:        0,
      regista:       0,
      prezzo_totale: '',
    }
    if (!initialPostId) return base
    const pos      = postazioni.find(p => p.id === initialPostId)
    const defaults = pos?.tipo === 'palma'
      ? { dotazione: '3lettini_regista', lettini: 3, sdraio: 0, regista: 1 }
      : { dotazione: '2lettini',         lettini: 2, sdraio: 0, regista: 0 }
    return { ...base, postazione_id: initialPostId, ...defaults }
  })

  const [saving, setSaving]             = useState(false)
  const [cercaCliente, setCercaCliente] = useState('')
  const [showSugg, setShowSugg]         = useState(false)

  const postazioneSelezionata = postazioni.find(p => p.id === form.postazione_id)

  // Se arriviamo da una card "disponibile" in Disponibilità, questa è una prenotazione subaffitto
  const subaffittoRow = (() => {
    if (!initialPostId || !initialDataInizio || !initialDataFine) return null
    const pos = postazioni.find(p => p.id === initialPostId)
    if (!pos) return null
    return (occupazioni || []).find(o =>
      o.tipo === pos.tipo &&
      Number(o.numero) === Number(pos.numero) &&
      (o.tipo_occupazione === 'disponibile' || o.tipo_occupazione === 'subaffitto_disponibile') &&
      o.data_inizio === initialDataInizio &&
      o.data_fine   === initialDataFine
    ) || null
  })()

  const suggerimenti = cercaCliente.length >= 2
    ? clienti.filter(c => c.nome.toLowerCase().includes(cercaCliente.toLowerCase())).slice(0, 5)
    : []

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleStagionale(val) {
    setStagionale(val)
    if (val) {
      setForm(f => ({ ...f, data_inizio: STAGIONE_INIZIO, data_fine: STAGIONE_FINE, temporanea: false }))
    } else {
      setForm(f => ({ ...f, data_inizio: today(), data_fine: '' }))
    }
  }

  function handlePostazioneChange(id) {
    const pos      = postazioni.find(p => p.id === id)
    const defaults = !pos ? {}
      : pos.tipo === 'palma'
        ? { dotazione: '3lettini_regista', lettini: 3, sdraio: 0, regista: 1 }
        : { dotazione: '2lettini',         lettini: 2, sdraio: 0, regista: 0 }
    setForm(f => ({ ...f, postazione_id: id, ...defaults }))
  }

  function handleDotazione(dot) {
    const map = {
      '2lettini':         { lettini: 2, sdraio: 0, regista: 0 },
      'lettino_sdraio':   { lettini: 1, sdraio: 1, regista: 0 },
      'lettino_regista':  { lettini: 1, sdraio: 0, regista: 1 },
      '3lettini_regista': { lettini: 3, sdraio: 0, regista: 1 },
    }
    setForm(f => ({ ...f, dotazione: dot, ...(map[dot] || {}) }))
  }

  // Rileva conflitto di date per la postazione selezionata
  // Esclude la riga "disponibile" che stiamo per sostituire con il subaffitto
  const conflict = (() => {
    if (!form.postazione_id || !form.data_inizio || !form.data_fine) return null
    const pos = postazioni.find(p => p.id === form.postazione_id)
    if (!pos) return null
    return (occupazioni || []).find(o =>
      o.tipo === pos.tipo &&
      Number(o.numero) === Number(pos.numero) &&
      o.data_inizio <= form.data_fine &&
      o.data_fine   >= form.data_inizio &&
      !(subaffittoRow && o.id === subaffittoRow.id)
    ) || null
  })()

  async function handleSalva() {
    if (!form.postazione_id)      { showToast('Seleziona una postazione', 'error'); return }
    if (!form.cliente_nome.trim()) { showToast('Inserisci il nome del cliente', 'error'); return }
    if (!form.data_inizio || !form.data_fine) { showToast('Date obbligatorie', 'error'); return }
    if (form.data_fine < form.data_inizio)    { showToast('Data fine deve essere ≥ data inizio', 'error'); return }
    if (conflict) {
      showToast(`Conflitto: già prenotata dal ${fmtDate(conflict.data_inizio)} al ${fmtDate(conflict.data_fine)}`, 'error')
      return
    }

    setSaving(true)
    try {
      const pos = postazioni.find(p => p.id === form.postazione_id)

      // Se è un subaffitto: elimina la riga "disponibile" e salva come subaffitto
      if (subaffittoRow) {
        const { error: delErr } = await supabase.from('occupazioni').delete().eq('id', subaffittoRow.id)
        if (delErr) throw delErr
      }

      const { error } = await supabase.from('occupazioni').insert({
        tipo:             pos.tipo,
        numero:           pos.numero,
        cliente:          subaffittoRow ? subaffittoRow.cliente : form.cliente_nome.trim().toUpperCase(),
        subaffittuario:   subaffittoRow ? form.cliente_nome.trim().toUpperCase() : null,
        tipo_occupazione: subaffittoRow ? 'subaffitto' : null,
        lettini:          form.lettini,
        sdraio:           form.sdraio,
        regista:          form.regista,
        prezzo_totale:    form.prezzo_totale ? parseFloat(form.prezzo_totale) : null,
        temporanea:       form.temporanea,
        data_inizio:      form.data_inizio,
        data_fine:        form.data_fine,
        note:             form.note || null,
      })
      if (error) throw error

      showToast('Prenotazione salvata ✓')
      if (onReload) onReload()
      setStagionale(false)
      setForm({
        postazione_id: '', cliente_nome: '', dotazione: '2lettini',
        temporanea: false, data_inizio: today(), data_fine: '', note: '',
        lettini: 2, sdraio: 0, regista: 0, prezzo_totale: '',
      })
      setCercaCliente('')
    } catch (err) {
      console.error(err)
      showToast('Errore nel salvataggio', 'error')
    }
    setSaving(false)
  }

  if (loading) return <LoadingScreen />

  const palme = postazioni.filter(p => p.tipo === 'palma').sort((a, b) => a.numero - b.numero)
  const ombrA = postazioni.filter(p => p.tipo === 'ombrellone' && p.settore === 'A').sort((a, b) => a.numero - b.numero)
  const ombrB = postazioni.filter(p => p.tipo === 'ombrellone' && p.settore === 'B').sort((a, b) => a.numero - b.numero)

  function postazioneLabel(p) {
    const base = p.tipo === 'palma'
      ? `🌴 Palma ${p.numero} — F${p.fila}`
      : `☂ Ombr. ${p.numero} S.${p.settore} F${p.fila}`
    return p.stato !== 'libero' ? `${base} (occ. oggi)` : base
  }

  return (
    <div className="page-content">
      <h1 className="page-title">Nuova Prenotazione</h1>

      <div className="card">

        {/* Banner subaffitto */}
        {subaffittoRow && (
          <div style={{ background: '#f5f0ff', border: '1.5px solid #c4b5fd', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 4 }}>🟣 Prenotazione subaffitto</div>
            <div style={{ fontSize: 13, color: 'var(--navy)' }}>
              Stagionale: <strong>{subaffittoRow.cliente}</strong>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {fmtDate(subaffittoRow.data_inizio)} → {fmtDate(subaffittoRow.data_fine)}
            </div>
            <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 4 }}>Il cliente che inserisci diventerà il subaffittuario — la postazione apparirà viola in mappa.</div>
          </div>
        )}

        {/* POSTAZIONE */}
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>Postazione</label>
          <select
            value={form.postazione_id}
            onChange={e => handlePostazioneChange(e.target.value)}
            style={{ fontSize: 15, padding: '12px 14px' }}
          >
            <option value="">Seleziona postazione...</option>
            <optgroup label="🌴 Palme">
              {palme.map(p => <option key={p.id} value={p.id}>{postazioneLabel(p)}</option>)}
            </optgroup>
            <optgroup label="☂ Ombrelloni — Sett. A">
              {ombrA.map(p => <option key={p.id} value={p.id}>{postazioneLabel(p)}</option>)}
            </optgroup>
            <optgroup label="☂ Ombrelloni — Sett. B">
              {ombrB.map(p => <option key={p.id} value={p.id}>{postazioneLabel(p)}</option>)}
            </optgroup>
          </select>
        </div>

        {/* Info postazione */}
        {postazioneSelezionata && (
          <div style={{ background: '#f0f4ff', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, border: '1px solid #dde8ff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong style={{ color: 'var(--navy)' }}>
              {postazioneSelezionata.tipo === 'palma' ? '🌴 Palma' : '☂ Ombrellone'} {postazioneSelezionata.numero}
            </strong>
            <span style={{ color: 'var(--muted)' }}>
              F{postazioneSelezionata.fila}{postazioneSelezionata.settore && ` · S.${postazioneSelezionata.settore}`}
            </span>
            {postazioneSelezionata.stato !== 'libero' && (
              <span className="badge badge-red" style={{ fontSize: 11 }}>occupata oggi</span>
            )}
          </div>
        )}

        {/* TOGGLE STAGIONALE — nascosto in contesto subaffitto */}
        {!subaffittoRow && (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: stagionale ? '#e8f0ff' : '#f0f4ff', borderRadius: 10, border: `1.5px solid ${stagionale ? '#4a80e8' : '#dde8ff'}`, marginBottom: 14, cursor: 'pointer' }}
            onClick={() => handleStagionale(!stagionale)}
          >
            <input type="checkbox" checked={stagionale}
              onChange={e => handleStagionale(e.target.checked)}
              onClick={e => e.stopPropagation()}
              style={{ width: 20, height: 20, cursor: 'pointer', accentColor: 'var(--navy)', flexShrink: 0 }}
            />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15 }}>📅 Prenotazione stagionale</div>
              <div style={{ fontSize: 12, color: '#5a7bc7', marginTop: 2 }}>{fmtDate(STAGIONE_INIZIO)} → {fmtDate(STAGIONE_FINE)}</div>
            </div>
          </div>
        )}

        {/* DATE — mostrate solo se non stagionale */}
        {!stagionale && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Data inizio *</label>
              <input type="date" value={form.data_inizio}
                onChange={e => set('data_inizio', e.target.value)}
                style={{ fontSize: 14 }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Data fine *</label>
              <input type="date" value={form.data_fine} min={form.data_inizio}
                onChange={e => set('data_fine', e.target.value)}
                style={{ fontSize: 14 }} />
            </div>
          </div>
        )}

        {/* Avviso conflitto */}
        {conflict && (
          <div style={{ background: '#fff0f0', borderRadius: 8, padding: '10px 12px', marginBottom: 14, border: '1.5px solid var(--red)', fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>
            ⚠️ Conflitto: già prenotata da <strong>{conflict.cliente}</strong> ({fmtDate(conflict.data_inizio)} → {fmtDate(conflict.data_fine)})
          </div>
        )}

        {/* CLIENTE / SUBAFFITTUARIO */}
        <div className="form-group" style={{ marginBottom: 16, position: 'relative' }}>
          <label>{subaffittoRow ? 'Subaffittuario' : 'Cliente'}</label>
          <input
            type="text"
            value={form.cliente_nome}
            onChange={e => { set('cliente_nome', e.target.value); setCercaCliente(e.target.value); setShowSugg(true) }}
            onBlur={() => setTimeout(() => setShowSugg(false), 200)}
            placeholder="Nome cliente (cerca o scrivi nuovo)"
            style={{ fontSize: 15, padding: '12px 14px', textTransform: 'uppercase' }}
          />
          {showSugg && suggerimenti.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid var(--sky)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 50, overflow: 'hidden' }}>
              {suggerimenti.map(c => (
                <div key={c.id} onMouseDown={() => { set('cliente_nome', c.nome); setCercaCliente(c.nome); setShowSugg(false) }}
                  style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f2f5', fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>
                  👤 {c.nome}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DOTAZIONE */}
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>Dotazione</label>
          <div className="dotazione-grid">
            {[
              { val: '2lettini',         label: '2 Lettini' },
              { val: 'lettino_sdraio',   label: '1 Lettino + 1 Sdraio' },
              { val: 'lettino_regista',  label: '1 Lettino + 1 Regista' },
              { val: '3lettini_regista', label: '3 Lettini + Regista' },
            ].map(d => (
              <button key={d.val} className={`dotazione-btn${form.dotazione === d.val ? ' active' : ''}`} onClick={() => handleDotazione(d.val)}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* STEPPER ATTREZZATURA */}
        <div className="stepper-grid">
          {[
            { label: 'Lettini 🛏', key: 'lettini' },
            { label: 'Sdraio 🪑',  key: 'sdraio' },
            { label: 'Regista 🎬', key: 'regista' },
          ].map(a => (
            <div key={a.key} className="stepper-card">
              <div className="stepper-label">{a.label}</div>
              <div className="stepper-controls">
                <button className="stepper-btn" onClick={() => set(a.key, Math.max(0, form[a.key] - 1))}>−</button>
                <span className="stepper-val">{form[a.key]}</span>
                <button className="stepper-btn" onClick={() => set(a.key, form[a.key] + 1)}>+</button>
              </div>
            </div>
          ))}
        </div>

        {/* PREZZO */}
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>Prezzo totale (€)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 700, pointerEvents: 'none' }}>€</span>
            <input
              type="number" value={form.prezzo_totale}
              onChange={e => set('prezzo_totale', e.target.value)}
              placeholder="0.00" min="0" step="0.01"
              style={{ fontSize: 15, padding: '12px 14px', paddingLeft: 28 }}
            />
          </div>
        </div>

        {/* TEMPORANEA — disabilitata se stagionale */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: stagionale ? '#f5f5f5' : '#fffde7', borderRadius: 10, border: `1.5px solid ${stagionale ? '#ddd' : '#ffe082'}`, marginBottom: 20, cursor: stagionale ? 'not-allowed' : 'pointer', opacity: stagionale ? .5 : 1 }}
          onClick={() => !stagionale && set('temporanea', !form.temporanea)}
        >
          <input type="checkbox" checked={form.temporanea}
            onChange={e => !stagionale && set('temporanea', e.target.checked)}
            onClick={e => e.stopPropagation()}
            disabled={stagionale}
            style={{ width: 20, height: 20, cursor: stagionale ? 'not-allowed' : 'pointer', accentColor: '#f0c030', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15 }}>⏳ Prenotazione temporanea</div>
            <div style={{ fontSize: 12, color: '#b8860b', marginTop: 2 }}>Apparirà in giallo sulla mappa</div>
          </div>
        </div>

        {/* NOTE */}
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label>Note (opzionale)</label>
          <textarea value={form.note} onChange={e => set('note', e.target.value)}
            placeholder="Es. porta cane, allergia sole..." rows={2} style={{ fontSize: 14 }} />
        </div>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '14px', opacity: saving ? .7 : 1 }}
          onClick={handleSalva} disabled={saving}
        >
          {saving ? '⏳ Salvataggio...' : '💾 Salva Prenotazione'}
        </button>
      </div>
    </div>
  )
}
