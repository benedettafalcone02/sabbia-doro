import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { today } from '../lib/data'
import LoadingScreen from '../components/LoadingScreen'

export default function Prenota({ db, showToast, onReload }) {
  const { postazioni, clienti, loading } = db

  const [form, setForm] = useState({
    postazione_id: '',
    cliente_nome: '',
    tipo: 'stagionale',
    dotazione: '2lettini',
    data_inizio: today(),
    data_fine: '',
    note: '',
    lettini: 0,
    sdraio: 0,
    regista: 0,
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

    setSaving(true)
    try {
      const pos = postazioni.find(p => p.id === form.postazione_id)

      // Upsert in occupazioni
      const { error } = await supabase
        .from('occupazioni')
        .upsert({
          tipo: pos.tipo,
          numero: pos.numero,
          cliente: form.cliente_nome.trim().toUpperCase(),
          stato: 'occupato',
          lettini: form.lettini,
          sdraio: form.sdraio,
          regista: form.regista,
        }, { onConflict: 'tipo,numero' })

      if (error) throw error

      showToast('Prenotazione salvata ✓')
      if (onReload) onReload()

      // Reset form
      setForm({
        postazione_id: '', cliente_nome: '', tipo: 'stagionale',
        dotazione: '2lettini', data_inizio: today(), data_fine: '', note: '',
        lettini: 2, sdraio: 0, regista: 0,
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

      <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(31,78,121,.07)' }}>

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
          <div style={{ background: '#f0f4ff', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
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
          {/* Suggerimenti clienti esistenti */}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
            {[
              { val: '2lettini',         label: '2 Lettini' },
              { val: 'lettino_sdraio',   label: '1 Lettino + 1 Sdraio' },
              { val: 'lettino_regista',  label: '1 Lettino + 1 Regista' },
              { val: '3lettini_regista', label: '3 Lettini + Regista' },
            ].map(d => (
              <button
                key={d.val}
                onClick={() => handleDotazione(d.val)}
                style={{
                  padding: '10px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: '2px solid',
                  borderColor: form.dotazione === d.val ? 'var(--navy)' : '#dde3ed',
                  background: form.dotazione === d.val ? 'var(--navy)' : '#fff',
                  color: form.dotazione === d.val ? '#fff' : 'var(--muted)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)', transition: '.15s',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* RIEPILOGO ATTREZZATURA */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Lettini 🛏', key: 'lettini' },
            { label: 'Sdraio 🪑', key: 'sdraio' },
            { label: 'Regista 🎬', key: 'regista' },
          ].map(a => (
            <div key={a.key} style={{ background: '#f7f9ff', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>{a.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <button onClick={() => set(a.key, Math.max(0, form[a.key] - 1))}
                  style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid #dde3ed', background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', minWidth: 20, textAlign: 'center' }}>{form[a.key]}</span>
                <button onClick={() => set(a.key, form[a.key] + 1)}
                  style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid #dde3ed', background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            </div>
          ))}
        </div>

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
