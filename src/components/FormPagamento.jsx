import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import { fmtEur, today } from '../lib/data'

export default function FormPagamento({ open, onClose, db, prenotazioneId, onRegistra, showToast }) {
  const { prenotazioni, clienti, postazioni, pagamenti } = db
  const pren = prenotazioneId ? prenotazioni.find(r => r.id === prenotazioneId) : null
  const cl   = pren ? clienti.find(c => c.id === pren.cliente_id) : null
  const pos  = pren ? postazioni.find(p => p.id === pren.postazione_id) : null
  const storici = pren ? pagamenti.filter(p => p.prenotazione_id === prenotazioneId) : []

  const [importo, setImporto] = useState('')
  const [data, setData]       = useState(today())
  const [metodo, setMetodo]   = useState('contanti')
  const [note, setNote]       = useState('')

  useEffect(() => { if (open) { setImporto(''); setData(today()); setMetodo('contanti'); setNote('') } }, [open])

  function handleSalva() {
    const imp = parseFloat(importo)
    if (!imp || imp <= 0) { showToast('Inserisci un importo valido', 'error'); return }
    onRegistra(prenotazioneId, imp, data, metodo, note)
    showToast(`Pagamento €${imp} registrato ✓`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Registra Pagamento" size="modal-sm">
      {pren && (
        <div style={{ background: '#f0f4ff', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14 }}>{cl ? `${cl.nome} ${cl.cognome}` : '—'}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{pos ? `${pos.tipo} ${pos.numero}` : '?'}</div>
          <div style={{ marginTop: 6, display: 'flex', gap: 16 }}>
            <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Totale</div><div style={{ fontWeight: 700, color: 'var(--navy)' }}>{fmtEur(pren.prezzo_totale)}</div></div>
            <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Incassato</div><div style={{ fontWeight: 700, color: 'var(--green)' }}>{fmtEur(pren.acconto_versato)}</div></div>
            <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Saldo</div><div style={{ fontWeight: 700, color: 'var(--red)' }}>{fmtEur(pren.saldo_residuo)}</div></div>
          </div>
        </div>
      )}

      <div className="form-row">
        <div className="form-group"><label>Importo (€)</label><input type="number" step="0.01" value={importo} onChange={e => setImporto(e.target.value)} placeholder="0.00" /></div>
        <div className="form-group"><label>Data</label><input type="date" value={data} onChange={e => setData(e.target.value)} /></div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Metodo</label>
          <select value={metodo} onChange={e => setMetodo(e.target.value)}>
            <option value="contanti">Contanti</option>
            <option value="carta">Carta</option>
            <option value="bonifico">Bonifico</option>
          </select>
        </div>
        <div className="form-group"><label>Note</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="Facoltativo" /></div>
      </div>

      {/* Storico pagamenti */}
      {storici.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Storico Pagamenti</div>
          {storici.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 13 }}>
              <div>{p.data} · <span style={{ textTransform: 'capitalize' }}>{p.metodo}</span></div>
              <div style={{ fontWeight: 700, color: 'var(--green)' }}>{fmtEur(p.importo)}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
        <button className="btn btn-outline" onClick={onClose}>Annulla</button>
        <button className="btn btn-primary" onClick={handleSalva}>💳 Registra</button>
      </div>
    </Modal>
  )
}
