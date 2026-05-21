import { useState, useMemo } from 'react'
import Modal from '../components/Modal'
import { fmtEur, uid } from '../lib/data'

export default function Clienti({ db, onSalvaCliente, showToast }) {
  const { clienti, prenotazioni, pagamenti } = db
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({})

  const lista = useMemo(() => {
    const q = search.toLowerCase()
    return clienti.filter(c => `${c.nome} ${c.cognome} ${c.telefono||''} ${c.email||''}`.toLowerCase().includes(q))
  }, [clienti, search])

  function openNuovo() {
    setForm({ nome: '', cognome: '', telefono: '', email: '', note: '' })
    setModalOpen(true)
  }
  function openEdit(c) {
    setForm({ ...c })
    setModalOpen(true)
  }
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleSalva() {
    if (!form.nome || !form.cognome) { showToast('Nome e cognome obbligatori', 'error'); return }
    onSalvaCliente({ ...form, id: form.id || uid() })
    showToast(form.id ? 'Cliente aggiornato ✓' : 'Cliente aggiunto ✓')
    setModalOpen(false)
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Gestione Clienti</h1>
        <button className="btn btn-yellow" onClick={openNuovo}>+ Nuovo Cliente</button>
      </div>

      <div className="search-bar">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per nome, telefono, email..." />
      </div>

      <div className="tbl-wrap">
        <table>
          <thead>
            <tr><th>Nome</th><th>Cognome</th><th>Telefono</th><th>Email</th><th>Pren.</th><th>Tot. Speso</th><th>Note</th><th></th></tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>Nessun cliente trovato.</td></tr>
            ) : lista.map(c => {
              const pren = prenotazioni.filter(r => r.cliente_id === c.id)
              const tot  = pagamenti.filter(p => pren.some(r => r.id === p.prenotazione_id)).reduce((s, p) => s + p.importo, 0)
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{c.nome}</td>
                  <td>{c.cognome}</td>
                  <td><a href={`tel:${c.telefono}`} style={{ color: 'var(--navy)', fontWeight: 600 }}>{c.telefono || '—'}</a></td>
                  <td style={{ fontSize: 12 }}>{c.email || '—'}</td>
                  <td style={{ textAlign: 'center' }}><span className="badge badge-blue">{pren.length}</span></td>
                  <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{fmtEur(tot)}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.note || '—'}</td>
                  <td><button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>✏</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? `${form.nome} ${form.cognome}` : 'Nuovo Cliente'} size="modal-sm">
        <div className="form-row">
          <div className="form-group"><label>Nome</label><input value={form.nome || ''} onChange={e => set('nome', e.target.value)} /></div>
          <div className="form-group"><label>Cognome</label><input value={form.cognome || ''} onChange={e => set('cognome', e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Telefono</label><input type="tel" value={form.telefono || ''} onChange={e => set('telefono', e.target.value)} /></div>
          <div className="form-group"><label>Email</label><input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} /></div>
        </div>
        <div className="form-row single">
          <div className="form-group"><label>Note</label><textarea value={form.note || ''} onChange={e => set('note', e.target.value)} placeholder="Es. porta cane, allergia sole, cliente storico..." /></div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Annulla</button>
          <button className="btn btn-primary" onClick={handleSalva}>💾 Salva</button>
        </div>
      </Modal>
    </div>
  )
}
