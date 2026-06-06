import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { today } from '../lib/data'
import LoadingScreen from '../components/LoadingScreen'

export default function Prenota({ db, showToast, onReload, initialPostId }) {
  const { postazioni, clienti, loading } = db

  const [form, setForm] = useState(() => {
    const base = {
      postazione_id: '',
      cliente_nome: '',
      tipo: 'stagionale',
      dotazione: '2lettini',
      temporanea: false,
      data_inizio: today(),
      data_fine: '',
      note: '',
      lettini: 0,
      sdraio: 0,
      regista: 0,
      prezzo_totale: '',
      acconto: '',
    }
    if (!initialPostId) return base
    const pos = postazioni.find(p => p.id === initialPostId)
    const defaults = pos?.tipo === 'palma'
      ? { dotazione: '3lettini_regista', lettini: 3, sdraio: 0, regista: 1 }
      : { dotazione: '2lettini', lettini: 2, sdraio: 0, regista: 0 }
    return { ...base, postazione_id: initialPostId, ...defaults }
  })
  const [saving, setSaving] = useState(false)
  const [cercaCliente, setCercaCliente] = useState('')
  const [showSuggerimenti, setShowSuggerimenti] = useState(false)

  const postazioneSelezionata = postazioni.find(p => p.id === form.postazione_id)

  const suggerimenti = cercaCliente.length >= 2
    ? clienti.filter(c => c.nome.toLowerCase().includes(cercaCliente.toLowerCase())).slice(0, 5)
    : []

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handlePostazioneChange(id) {
    const pos = postazioni.find(p => p.id === id)
    const defaults = !pos ? {}
      : pos.tipo === 'palma'
        ? { dotazione: '3lettini_regista', lettini: 3, sdraio: 0, regista: 1 }
        : { dotazione: '2lettini', lettini: 2, sdraio: 0, regista: 0 }
    setForm(f => ({ ...f, postazione_id: id, ...defaults }))
  }

  function handleDotazione(dot) {
    const map = {
      '2lettini':          { lettini: 2, sdraio: 0, regista: 0 },
      'lettino_sdraio':    { lettini: 1, sdraio: 1, regista: 0 },
      'lettino_regista':   { lettini: 1, sdraio: 0, regista: 1 },
      '3lettini_regista':  { lettini: 3, sdraio: 0, regista: 1 },
    }
    setForm(f => ({ ...f, dotazione: dot, ...(map[dot] || {}) }))
  }

  async function handleSalva() {
    if (!form.postazione_id) { showToast('Seleziona una postazione', 'error'); return }
    if (!form.cliente_nome.trim()) { showToast('Inserisci il nome del cliente', 'error'); return }
    if (form.temporanea && (!form.data_inizio || !form.data_fine)) {
      showToast('Inserisci data inizio e data fine', 'error'); return
    }

    setSaving(true)
    try {
      const pos = postazioni.find(p => p.id === form.postazione_id)

      const { error: delError } = await supabase
        .from('occupazioni')
        .delete()
        .eq('tipo', pos.tipo)
        .eq('numero', pos.numero)

      if (delError) throw delError

      const { error } = await supabase
        .from('occupazioni')
        .insert({
          tipo: pos.tipo,
          numero: pos.numero,
          cliente: form.cliente_nome.trim().toUpperCase(),
          stato: 'occupato',
          lettini: form.lettini,
          sdraio: form.sdraio,
          regista: form.regista,
          prezzo_totale: form.prezzo_totale ? parseFloat(form.prezzo_totale) : null,
          acconto:       form.acconto       ? parseFloat(form.acconto)       : null,
          temporanea:    form.temporanea,
          data_inizio:   form.temporanea ? form.data_inizio : null,
          data_fine:     form.temporanea ? form.data_fine   : null,
        })

      if (error) throw error

      showToast('Prenotazione salvata ✓')
      if (onReload) onReload()

      setForm({
        postazione_id: '', cliente_nome: '', tipo: 'stagionale',
        dotazione: '2lettini', temporanea: false, data_inizio: today(), data_fine: '', note: '',
        lettini: 2, sdraio: 0, regista: 0, prezzo_totale: '', acconto: '',
      })
      setCercaCliente('')
    } catch (err) {
      console.error(err)
      showToast('Errore nel salvataggio', 'error')
    }
    setSaving(false)
  }

  if (loading) return <LoadingScreen />

  const libere = postazioni.filter(p => p.stato === 'libero')

  return (
    <div className="page-content">
      <h1 className="page-title">Nuova Prenotazione</h1>

      <div className="card">

        {/* POSTAZIONE */}
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>Postazione</label>
          <select
            value={form.postazione_id}
            onChange={e => handlePostazioneChange(e.target.value)}
            style={{ fontSize: 15, padding: '12px 14px' }}
          >
            <option value="">Seleziona postazione libera...</option>
            <optgroup label="🌴 Palme libere">
              {libere.filter(p => p.tipo === 'palma').map(p => (
                <option key={p.id} value={p.id}>Palma {p.numero} — Fila {p.fila} — €{p.prezzo_stagionale}</option>
              ))}
            </optgroup>
            <optgroup label="☂ Ombrelloni liberi — Sett. A">
              {libere.filter(p => p.tipo === 'ombrellone' && p.settore === 'A').map(p => (
                <option key={p.id} value={p.id}>Ombr. {p.numero} S.A F{p.fila} — €{p.prezzo_2lettini}</option>
              ))}
            </optgroup>
            <optgroup label="☂ Ombrelloni liberi — Sett. B">
              {libere.filter(p => p.tipo === 'ombrellone' && p.settore === 'B').map(p => (
                <option key={p.id} value={p.id}>Ombr. {p.numero} S.B F{p.fila} — €{p.prezzo_2lettini}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Info postazione selezionata */}
        {postazioneSelezionata && (
          <div style={{ background: '#f0f4ff', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, border: '1px solid #dde8ff' }}>
            <strong style={{ color: 'var(--navy)' }}>
              {postazioneSelezionata.tipo === 'palma' ? '🌴 Palma' : '☂ Ombrellone'} {postazioneSelezionata.numero}
            </strong>
            <span style={{ color: 'var(--muted)', marginLeft: 8 }}>
              Fila {postazioneSelezionata.fila}
              {postazioneSelezionata.settore && ` · Sett. ${postazioneSelezionata.settore}`}
            </span>
          </div>
        )}

        {/* CLIENTE */}
        <div className="form-group" style={{ marginBottom: 16, position: 'relative' }}>
          <label>Cliente</label>
          <input
            type="text"
            value={form.cliente_nome}
            onChange={e => {
              set('cliente_nome', e.target.value)
              setCercaCliente(e.target.value)
              setShowSuggerimenti(true)
            }}
            onBlur={() => setTimeout(() => setShowSuggerimenti(false), 200)}
            placeholder="Nome cliente (cerca o scrivi nuovo)"
            style={{ fontSize: 15, padding: '12px 14px', textTransform: 'uppercase' }}
          />
          {showSuggerimenti && suggerimenti.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: '#fff', border: '1.5px solid var(--sky)', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 50, overflow: 'hidden',
            }}>
              {suggerimenti.map(c => (
                <div
                  key={c.id}
                  onMouseDown={() => { set('cliente_nome', c.nome); setCercaCliente(c.nome); setShowSuggerimenti(false) }}
                  style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f2f5', fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}
                >
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
              <button
                key={d.val}
                className={`dotazione-btn${form.dotazione === d.val ? ' active' : ''}`}
                onClick={() => handleDotazione(d.val)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* RIEPILOGO ATTREZZATURA */}
        <div className="stepper-grid">
          {[
            { label: 'Lettini 🛏', key: 'lettini' },
            { label: 'Sdraio 🪑',  key: 'sdraio' },
            { label: 'Regista 🎬', key: 'regista' },
          ].map(a => (
            <div key={a.key} className="stepper-card">
              <div className="stepper-label">{a.label}</div>
              <div className="stepper-controls">
                <button
                  className="stepper-btn"
                  onClick={() => set(a.key, Math.max(0, form[a.key] - 1))}
                >−</button>
                <span className="stepper-val">{form[a.key]}</span>
                <button
                  className="stepper-btn"
                  onClick={() => set(a.key, form[a.key] + 1)}
                >+</button>
              </div>
            </div>
          ))}
        </div>

        {/* PREZZI */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div className="form-group">
            <label>Prezzo totale (€)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 700, pointerEvents: 'none' }}>€</span>
              <input
                type="number"
                value={form.prezzo_totale}
                onChange={e => set('prezzo_totale', e.target.value)}
                placeholder="0.00"
                min="0" step="0.01"
                style={{ fontSize: 15, padding: '12px 14px', paddingLeft: 28 }}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Acconto (€)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 700, pointerEvents: 'none' }}>€</span>
              <input
                type="number"
                value={form.acconto}
                onChange={e => set('acconto', e.target.value)}
                placeholder="0.00"
                min="0" step="0.01"
                style={{ fontSize: 15, padding: '12px 14px', paddingLeft: 28 }}
              />
            </div>
          </div>
        </div>

        {form.prezzo_totale && (
          <div style={{ background: '#f0f4ff', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, border: '1px solid #dde8ff', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Saldo residuo</span>
            <strong style={{ color: 'var(--navy)', fontSize: 15 }}>
              € {Math.max(0, (parseFloat(form.prezzo_totale) || 0) - (parseFloat(form.acconto) || 0)).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </strong>
          </div>
        )}

        {/* PRENOTAZIONE TEMPORANEA */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#fffde7', borderRadius: 10, border: '1.5px solid #ffe082', marginBottom: 16, cursor: 'pointer' }}
          onClick={() => set('temporanea', !form.temporanea)}
        >
          <input
            type="checkbox"
            checked={form.temporanea}
            onChange={e => set('temporanea', e.target.checked)}
            onClick={e => e.stopPropagation()}
            style={{ width: 20, height: 20, cursor: 'pointer', accentColor: '#f0c030', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15 }}>⏳ Prenotazione temporanea</div>
            <div style={{ fontSize: 12, color: '#b8860b', marginTop: 2 }}>Apparirà in giallo sulla mappa</div>
          </div>
        </div>

        {form.temporanea && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Data inizio *</label>
              <input
                type="date"
                value={form.data_inizio}
                onChange={e => set('data_inizio', e.target.value)}
                style={{ fontSize: 14 }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Data fine *</label>
              <input
                type="date"
                value={form.data_fine}
                onChange={e => set('data_fine', e.target.value)}
                style={{ fontSize: 14 }}
              />
            </div>
          </div>
        )}

        {/* NOTE */}
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label>Note (opzionale)</label>
          <textarea
            value={form.note}
            onChange={e => set('note', e.target.value)}
            placeholder="Es. porta cane, allergia sole..."
            rows={2}
            style={{ fontSize: 14 }}
          />
        </div>

        {/* SALVA */}
        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '14px', opacity: saving ? .7 : 1 }}
          onClick={handleSalva}
          disabled={saving}
        >
          {saving ? '⏳ Salvataggio...' : '💾 Salva Prenotazione'}
        </button>
      </div>
    </div>
  )
}
