import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { today } from '../lib/data'
import LoadingScreen from '../components/LoadingScreen'

export default function NuovoCliente({ db, showToast, onReload, onNavigate }) {
  const { postazioni, clienti, loading } = db

  const [form, setForm] = useState({
    nome: '',
    telefono: '',
    email: '',
    n_persone: '',
    postazione_id: '',
    dotazione: '2lettini',
    lettini: 2,
    sdraio: 0,
    regista: 0,
    data_inizio: today(),
    data_fine: '',
    acconto: '',
    note: '',
  })
  const [saving, setSaving] = useState(false)
  const [cercaNome, setCercaNome] = useState('')
  const [showSuggerimenti, setShowSuggerimenti] = useState(false)
  const [errors, setErrors] = useState({})

  const postazioneSelezionata = postazioni.find(p => p.id === form.postazione_id)
  const libere = postazioni.filter(p => p.stato === 'libero')

  const suggerimenti = cercaNome.length >= 2
    ? clienti.filter(c => c.nome.toLowerCase().includes(cercaNome.toLowerCase())).slice(0, 6)
    : []

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function clearErr(k) { setErrors(e => { const n = { ...e }; delete n[k]; return n }) }

  function handlePostazioneChange(id) {
    const pos = postazioni.find(p => p.id === id)
    const defaults = !pos ? {}
      : pos.tipo === 'palma'
        ? { dotazione: '3lettini_regista', lettini: 3, sdraio: 0, regista: 1 }
        : { dotazione: '2lettini',         lettini: 2, sdraio: 0, regista: 0 }
    setForm(f => ({ ...f, postazione_id: id, ...defaults }))
    clearErr('postazione_id')
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

  function handleSelectCliente(c) {
    setForm(f => ({
      ...f,
      nome:     c.nome,
      telefono: c.telefono || '',
      email:    c.email    || '',
      n_persone: c.n_persone || '',
      note:     c.note     || '',
      acconto:  c.acconto  != null ? String(c.acconto) : '',
      data_inizio: c.data_inizio || today(),
      data_fine:   c.data_fine   || '',
    }))
    setCercaNome(c.nome)
    setShowSuggerimenti(false)
    clearErr('nome')
  }

  async function handleSalva() {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome obbligatorio'
    if (!form.postazione_id) e.postazione_id = 'Seleziona una postazione'
    if (Object.keys(e).length > 0) {
      setErrors(e)
      showToast('Compila i campi obbligatori', 'error')
      return
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

      const { error } = await supabase.from('occupazioni').insert({
        tipo:     pos.tipo,
        numero:   pos.numero,
        cliente:  form.nome.trim().toUpperCase(),
        stato:    'occupato',
        lettini:  form.lettini,
        sdraio:   form.sdraio,
        regista:  form.regista,
        telefono:   form.telefono.trim()  || null,
        email:      form.email.trim()     || null,
        n_persone:  form.n_persone        ? parseInt(form.n_persone)    : null,
        data_inizio: form.data_inizio     || null,
        data_fine:   form.data_fine       || null,
        note:       form.note.trim()      || null,
        acconto:    form.acconto          ? parseFloat(form.acconto)    : null,
      })

      if (error) throw error

      showToast('Cliente registrato con successo ✓')
      if (onReload) onReload()
      onNavigate('clienti')
    } catch (err) {
      console.error(err)
      showToast('Errore nel salvataggio', 'error')
    }
    setSaving(false)
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="page-content">

      {/* Back */}
      <button
        onClick={() => onNavigate('clienti')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--muted)', fontSize: 13, fontWeight: 600,
          fontFamily: 'var(--font-body)', marginBottom: 10, padding: 0,
          display: 'flex', alignItems: 'center', gap: 5,
        }}
      >
        ← Torna ai Clienti
      </button>

      <h1 className="page-title">Nuovo Cliente</h1>

      {/* ── SEZIONE 1: Anagrafica ── */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="form-section-header">
          <div className="form-section-icon">👤</div>
          <div className="form-section-title">Anagrafica</div>
        </div>

        {/* Nome con autocomplete */}
        <div className="form-group" style={{ marginBottom: 14, position: 'relative' }}>
          <label>Nome completo *</label>
          <input
            type="text"
            value={form.nome}
            onChange={e => {
              set('nome', e.target.value)
              setCercaNome(e.target.value)
              setShowSuggerimenti(true)
              clearErr('nome')
            }}
            onBlur={() => setTimeout(() => setShowSuggerimenti(false), 200)}
            placeholder="Cerca cliente esistente o inserisci nuovo"
            style={{
              fontSize: 15,
              padding: '12px 14px',
              textTransform: 'uppercase',
              borderColor: errors.nome ? 'var(--red)' : undefined,
            }}
          />
          {errors.nome && <div className="field-error">{errors.nome}</div>}

          {showSuggerimenti && suggerimenti.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: '#fff', border: '1.5px solid var(--sky)', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,.12)', overflow: 'hidden',
            }}>
              {suggerimenti.map(c => (
                <div
                  key={c.id}
                  onMouseDown={() => handleSelectCliente(c)}
                  style={{
                    padding: '11px 14px', cursor: 'pointer',
                    borderBottom: '1px solid #f0f2f5',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>👤 {c.nome}</div>
                  {c.telefono && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, marginTop: 2 }}>
                      {c.telefono}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Telefono + Email */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div className="form-group">
            <label>Telefono</label>
            <input
              type="tel"
              value={form.telefono}
              onChange={e => set('telefono', e.target.value)}
              placeholder="+39 3xx xxx xxxx"
              style={{ fontSize: 14, padding: '11px 14px' }}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="nome@email.com"
              style={{ fontSize: 14, padding: '11px 14px' }}
            />
          </div>
        </div>

        {/* N. persone */}
        <div className="form-group">
          <label>N. persone</label>
          <input
            type="number"
            value={form.n_persone}
            onChange={e => set('n_persone', e.target.value)}
            min="1" max="20"
            placeholder="Es. 2"
            style={{ fontSize: 14, padding: '11px 14px', maxWidth: 120 }}
          />
        </div>
      </div>

      {/* ── SEZIONE 2: Postazione & Dotazione ── */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="form-section-header">
          <div className="form-section-icon">🏖</div>
          <div className="form-section-title">Postazione & Dotazione</div>
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label>Postazione *</label>
          <select
            value={form.postazione_id}
            onChange={e => handlePostazioneChange(e.target.value)}
            style={{
              fontSize: 15,
              padding: '12px 14px',
              borderColor: errors.postazione_id ? 'var(--red)' : undefined,
            }}
          >
            <option value="">Seleziona postazione libera...</option>
            <optgroup label="🌴 Palme libere">
              {libere.filter(p => p.tipo === 'palma').map(p => (
                <option key={p.id} value={p.id}>
                  Palma {p.numero} — Fila {p.fila} — €{p.prezzo_stagionale}
                </option>
              ))}
            </optgroup>
            <optgroup label="☂ Ombrelloni liberi — Sett. A">
              {libere.filter(p => p.tipo === 'ombrellone' && p.settore === 'A').map(p => (
                <option key={p.id} value={p.id}>
                  Ombr. {p.numero} S.A F{p.fila} — €{p.prezzo_2lettini}
                </option>
              ))}
            </optgroup>
            <optgroup label="☂ Ombrelloni liberi — Sett. B">
              {libere.filter(p => p.tipo === 'ombrellone' && p.settore === 'B').map(p => (
                <option key={p.id} value={p.id}>
                  Ombr. {p.numero} S.B F{p.fila} — €{p.prezzo_2lettini}
                </option>
              ))}
            </optgroup>
          </select>
          {errors.postazione_id && <div className="field-error">{errors.postazione_id}</div>}
        </div>

        {postazioneSelezionata && (
          <div style={{
            background: '#f0f4ff', borderRadius: 10, padding: '10px 14px',
            marginBottom: 14, fontSize: 13, border: '1px solid #dde8ff',
          }}>
            <strong style={{ color: 'var(--navy)' }}>
              {postazioneSelezionata.tipo === 'palma' ? '🌴 Palma' : '☂ Ombrellone'} {postazioneSelezionata.numero}
            </strong>
            <span style={{ color: 'var(--muted)', marginLeft: 8 }}>
              Fila {postazioneSelezionata.fila}
              {postazioneSelezionata.settore && ` · Sett. ${postazioneSelezionata.settore}`}
            </span>
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 14 }}>
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

        <div className="stepper-grid" style={{ marginBottom: 0 }}>
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
      </div>

      {/* ── SEZIONE 3: Soggiorno & Pagamento ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-section-header">
          <div className="form-section-icon">📅</div>
          <div className="form-section-title">Soggiorno & Pagamento</div>
        </div>

        {/* Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div className="form-group">
            <label>Check-in</label>
            <input
              type="date"
              value={form.data_inizio}
              onChange={e => set('data_inizio', e.target.value)}
              style={{ fontSize: 14, padding: '11px 14px' }}
            />
          </div>
          <div className="form-group">
            <label>Check-out</label>
            <input
              type="date"
              value={form.data_fine}
              onChange={e => set('data_fine', e.target.value)}
              style={{ fontSize: 14, padding: '11px 14px' }}
            />
          </div>
        </div>

        {/* Acconto */}
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label>Acconto ricevuto (€)</label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--muted)', fontWeight: 700, fontSize: 15, pointerEvents: 'none',
            }}>€</span>
            <input
              type="number"
              value={form.acconto}
              onChange={e => set('acconto', e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              style={{ fontSize: 15, padding: '11px 14px', paddingLeft: 32 }}
            />
          </div>
        </div>

        {/* Note */}
        <div className="form-group">
          <label>Note</label>
          <textarea
            value={form.note}
            onChange={e => set('note', e.target.value)}
            placeholder="Es. porta cane, allergia sole, capanno richiesto..."
            rows={3}
            style={{ fontSize: 14 }}
          />
        </div>
      </div>

      {/* SALVA */}
      <button
        className="btn btn-primary btn-lg"
        style={{ width: '100%', justifyContent: 'center', fontSize: 16, opacity: saving ? .7 : 1 }}
        onClick={handleSalva}
        disabled={saving}
      >
        {saving ? '⏳ Salvataggio...' : '✅ Registra Cliente'}
      </button>
    </div>
  )
}
