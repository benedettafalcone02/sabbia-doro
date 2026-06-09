import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { today } from '../lib/data'
import '../styles/global.css'

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, g] = d.split('-')
  return `${g}/${m}/${y}`
}

async function sendWhatsApp(r) {
  const phone  = import.meta.env.VITE_CALLMEBOT_PHONE
  const apiKey = import.meta.env.VITE_CALLMEBOT_APIKEY
  if (!phone || !apiKey) return
  const text = encodeURIComponent(
    `🏖️ Nuova richiesta Sabbia d'Oro!\n` +
    `👤 ${r.nome} ${r.cognome}\n` +
    `📱 ${r.telefono}\n` +
    `📍 ${r.tipo === 'palma' ? '🌴 Palma' : '☂️ Ombrellone'} ${r.numero}\n` +
    `📅 ${fmtDate(r.data_inizio)} → ${fmtDate(r.data_fine)}`
  )
  try {
    await fetch(`https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${text}&apikey=${apiKey}`, { mode: 'no-cors' })
  } catch {}
}

export default function PrenotazionePublica({ showToast }) {
  const [saving, setSaving] = useState(false)
  const [sent, setSent]     = useState(false)

  const [form, setForm] = useState({
    nome: '', cognome: '', telefono: '', email: '',
    data_inizio: '', data_fine: '', tipo: 'ombrellone',
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    if (!form.nome.trim() || !form.cognome.trim() || !form.telefono.trim()) {
      showToast('Compila nome, cognome e telefono', 'error'); return
    }
    if (!form.data_inizio || !form.data_fine) { showToast('Scegli il periodo', 'error'); return }
    if (form.data_fine < form.data_inizio) { showToast('Data fine deve essere dopo la data inizio', 'error'); return }

    setSaving(true)
    try {
      const { error } = await supabase.from('richieste_prenotazione').insert({
        nome:            form.nome.trim(),
        cognome:         form.cognome.trim(),
        telefono:        form.telefono.trim(),
        email:           form.email.trim() || null,
        data_inizio:     form.data_inizio,
        data_fine:       form.data_fine,
        tipo_postazione: form.tipo,
      })
      if (error) throw error

      await sendWhatsApp({
        nome: form.nome, cognome: form.cognome, telefono: form.telefono,
        tipo: form.tipo, numero: null,
        data_inizio: form.data_inizio, data_fine: form.data_fine,
      })

      setSent(true)
    } catch (err) {
      console.error(err)
      showToast('Errore nell\'invio. Riprova.', 'error')
    }
    setSaving(false)
  }

  if (sent) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg,#e8f4ff 0%,#f0faf4 100%)', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>🏖️</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--navy)', marginBottom: 12 }}>Richiesta inviata!</h2>
      <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 320 }}>
        Abbiamo ricevuto la tua richiesta per{' '}
        <strong style={{ color: 'var(--navy)' }}>
          {form.tipo === 'palma' ? '🌴 Palma' : '☂ Ombrellone'}
        </strong>{' '}
        dal <strong>{fmtDate(form.data_inizio)}</strong> al <strong>{fmtDate(form.data_fine)}</strong>.
        <br /><br />
        Ti contatteremo presto al numero <strong>{form.telefono}</strong>.
      </p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <div style={{ background: 'var(--navy)', padding: '20px 20px 24px', textAlign: 'center' }}>
        <img src="/logosabbiadoro.png" alt="Sabbia d'Oro" style={{ height: 52, marginBottom: 10 }} />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
          Richiedi una postazione
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>Compila il modulo — ti ricontattiamo per confermare</p>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 60px' }}>

        {/* Dati personali */}
        <div style={{ background: '#fff', borderRadius: 18, padding: 20, marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
          <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15, marginBottom: 16 }}>👤 Dati personali</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Nome *</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Mario" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Cognome *</label>
              <input value={form.cognome} onChange={e => set('cognome', e.target.value)} placeholder="Rossi" />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Telefono *</label>
            <input type="tel" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+39 333 123 4567" />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Email (opzionale)</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="mario@email.com" />
          </div>
        </div>

        {/* Periodo e tipo */}
        <div style={{ background: '#fff', borderRadius: 18, padding: 20, marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
          <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15, marginBottom: 16 }}>📅 Periodo</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Dal *</label>
              <input type="date" value={form.data_inizio} min={today()} onChange={e => set('data_inizio', e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Al *</label>
              <input type="date" value={form.data_fine} min={form.data_inizio || today()} onChange={e => set('data_fine', e.target.value)} />
            </div>
          </div>

          <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 13, marginBottom: 10 }}>Tipo postazione *</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[{ v: 'ombrellone', label: '☂ Ombrellone' }, { v: 'palma', label: '🌴 Palma' }].map(t => (
              <button
                key={t.v}
                onClick={() => set('tipo', t.v)}
                style={{
                  flex: 1, padding: '13px 8px', borderRadius: 12,
                  border: `2px solid ${form.tipo === t.v ? 'var(--navy)' : '#dde3ed'}`,
                  background: form.tipo === t.v ? 'var(--navy)' : '#fff',
                  color: form.tipo === t.v ? '#fff' : 'var(--muted)',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)',
                  transition: '.15s',
                }}
              >{t.label}</button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || !form.nome || !form.cognome || !form.telefono || !form.data_inizio || !form.data_fine}
          style={{
            width: '100%', padding: '16px', borderRadius: 14,
            background: 'var(--navy)', color: '#fff', border: 'none',
            fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800,
            cursor: 'pointer',
            opacity: (saving || !form.nome || !form.cognome || !form.telefono || !form.data_inizio || !form.data_fine) ? .45 : 1,
            transition: 'opacity .15s',
          }}
        >
          {saving ? '⏳ Invio in corso...' : '✉️ Invia richiesta'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 14, lineHeight: 1.6 }}>
          I tuoi dati verranno usati solo per confermare la prenotazione e non ceduti a terzi.
        </p>
      </div>
    </div>
  )
}
