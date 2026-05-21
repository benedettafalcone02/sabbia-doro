import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import { calcolaStato, fmtEurDec, today, uid } from '../lib/data'

export default function FormPrenotazione({ open, onClose, db, prenotazioneId, postazionePreselezionata, onSalva, onPagamento, showToast }) {
  const { postazioni, clienti, prenotazioni } = db

  const pren = prenotazioneId ? prenotazioni.find(r => r.id === prenotazioneId) : null
  const isEdit = !!pren

  const [form, setForm] = useState({})
  const [nuovoCliente, setNuovoCliente] = useState(false)
  const [ncForm, setNcForm] = useState({ nome: '', cognome: '', telefono: '', email: '', note: '' })

  useEffect(() => {
    if (!open) return
    if (pren) {
      setForm({ ...pren })
    } else {
      setForm({
        postazione_id: postazionePreselezionata || '',
        cliente_id: '',
        tipo: 'stagionale',
        dotazione: '2lettini',
        data_inizio: '',
        data_fine: '',
        prezzo_totale: '',
        acconto_versato: '',
        data_acconto: today(),
        metodo_pagamento: 'contanti',
        stato_pagamento: 'da_pagare',
        note: '',
      })
    }
    setNuovoCliente(false)
  }, [open, prenotazioneId, postazionePreselezionata])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // Quando cambia postazione o dotazione → suggerisci prezzo
  useEffect(() => {
    if (!form.postazione_id) return
    const p = postazioni.find(x => x.id === form.postazione_id)
    if (!p) return
    let pr = 0
    if (p.tipo === 'palma') pr = p.prezzo_stagionale
    else if (form.dotazione === '2lettini') pr = p.prezzo_2lettini
    else pr = p.prezzo_lettino_regista
    set('prezzo_totale', pr || 0)
  }, [form.postazione_id, form.dotazione])

  const saldo = (parseFloat(form.prezzo_totale) || 0) - (parseFloat(form.acconto_versato) || 0)

  function handleSalva() {
    if (!form.postazione_id) { showToast('Seleziona una postazione', 'error'); return }
    let clienteId = form.cliente_id
    if (nuovoCliente) {
      if (!ncForm.nome || !ncForm.cognome) { showToast('Nome e cognome obbligatori', 'error'); return }
      clienteId = uid()
      // salva il nuovo cliente tramite callback
      onSalva({ tipo: 'cliente', data: { ...ncForm, id: clienteId } })
    }
    if (!clienteId) { showToast('Seleziona o crea un cliente', 'error'); return }
    const tot = parseFloat(form.prezzo_totale) || 0
    const acc = parseFloat(form.acconto_versato) || 0
    const obj = {
      ...form,
      id: pren?.id,
      cliente_id: clienteId,
      prezzo_totale: tot,
      acconto_versato: acc,
      saldo_residuo: tot - acc,
      stato_pagamento: calcolaStato(tot, acc),
    }
    onSalva({ tipo: 'prenotazione', data: obj })
    showToast(isEdit ? 'Prenotazione aggiornata ✓' : 'Prenotazione salvata ✓')
    onClose()
  }

  const postazioneSelezionata = postazioni.find(p => p.id === form.postazione_id)

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifica Prenotazione' : 'Nuova Prenotazione'}>
      {/* Postazione */}
      <div className="form-row">
        <div className="form-group">
          <label>Postazione</label>
          <select value={form.postazione_id || ''} onChange={e => set('postazione_id', e.target.value)}>
            <option value="">Seleziona...</option>
            {postazioni.map(p => (
              <option key={p.id} value={p.id} style={{ color: p.stato !== 'libero' && p.id !== form.postazione_id ? '#aaa' : '' }}>
                {p.tipo === 'palma' ? '🌴' : '☂'} {p.tipo === 'palma' ? 'Palma' : 'Ombr.'} {p.numero}
                {p.settore ? ` S.${p.settore}` : ''} F{p.fila}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Dotazione</label>
          <select value={form.dotazione || '2lettini'} onChange={e => set('dotazione', e.target.value)}>
            <option value="2lettini">2 Lettini</option>
            <option value="lettino_regista">Lettino + Regista</option>
            <option value="3lettini_regista">3 Lettini + Regista (palme)</option>
          </select>
        </div>
      </div>

      {/* Cliente */}
      <div className="form-row single">
        <div className="form-group">
          <label>Cliente</label>
          {!nuovoCliente ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <select style={{ flex: 1 }} value={form.cliente_id || ''} onChange={e => set('cliente_id', e.target.value)}>
                <option value="">Seleziona cliente...</option>
                {clienti.map(c => (
                  <option key={c.id} value={c.id}>{c.nome} {c.cognome}{c.telefono ? ` — ${c.telefono}` : ''}</option>
                ))}
              </select>
              <button className="btn btn-outline btn-sm" onClick={() => setNuovoCliente(true)}>+ Nuovo</button>
            </div>
          ) : (
            <div style={{ background: '#f0f4ff', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong style={{ fontSize: 12, color: 'var(--navy)' }}>NUOVO CLIENTE</strong>
                <button className="btn btn-sm" style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }} onClick={() => setNuovoCliente(false)}>✕</button>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Nome</label><input value={ncForm.nome} onChange={e => setNcForm(f => ({...f, nome: e.target.value}))} /></div>
                <div className="form-group"><label>Cognome</label><input value={ncForm.cognome} onChange={e => setNcForm(f => ({...f, cognome: e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Telefono</label><input value={ncForm.telefono} onChange={e => setNcForm(f => ({...f, telefono: e.target.value}))} /></div>
                <div className="form-group"><label>Email</label><input value={ncForm.email} onChange={e => setNcForm(f => ({...f, email: e.target.value}))} /></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tipo + Date */}
      <div className="form-row triple">
        <div className="form-group">
          <label>Tipo</label>
          <select value={form.tipo || 'stagionale'} onChange={e => set('tipo', e.target.value)}>
            <option value="stagionale">Stagionale</option>
            <option value="periodo">Periodo</option>
            <option value="giornaliero">Giornaliero</option>
          </select>
        </div>
        <div className="form-group"><label>Data Inizio</label><input type="date" value={form.data_inizio || ''} onChange={e => set('data_inizio', e.target.value)} /></div>
        <div className="form-group"><label>Data Fine</label><input type="date" value={form.data_fine || ''} onChange={e => set('data_fine', e.target.value)} /></div>
      </div>

      {/* Prezzi */}
      <div className="form-row">
        <div className="form-group">
          <label>Prezzo Totale (€)</label>
          <input type="number" step="0.01" value={form.prezzo_totale || ''} onChange={e => set('prezzo_totale', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Acconto Versato (€)</label>
          <input type="number" step="0.01" value={form.acconto_versato || ''} onChange={e => set('acconto_versato', e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>Data Acconto</label><input type="date" value={form.data_acconto || ''} onChange={e => set('data_acconto', e.target.value)} /></div>
        <div className="form-group">
          <label>Metodo</label>
          <select value={form.metodo_pagamento || 'contanti'} onChange={e => set('metodo_pagamento', e.target.value)}>
            <option value="contanti">Contanti</option>
            <option value="carta">Carta</option>
            <option value="bonifico">Bonifico</option>
          </select>
        </div>
      </div>

      {/* Saldo */}
      <div className="saldo-box">
        <div><div className="label">Saldo Residuo</div></div>
        <div className="val">{fmtEurDec(saldo)}</div>
      </div>

      {/* Note */}
      <div className="form-row single">
        <div className="form-group">
          <label>Note</label>
          <textarea value={form.note || ''} onChange={e => set('note', e.target.value)} placeholder="Note libere..." />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        {isEdit && <button className="btn btn-outline" onClick={() => { onPagamento(pren.id); onClose() }}>💳 Pagamento</button>}
        <button className="btn btn-outline" onClick={onClose}>Annulla</button>
        <button className="btn btn-primary" onClick={handleSalva}>💾 Salva</button>
      </div>
    </Modal>
  )
}
