import { useState, useMemo } from 'react'
import Modal from '../components/Modal'
import LoadingScreen from '../components/LoadingScreen'
import { normalizeCliente } from '../lib/data'
import { supabase } from '../lib/supabase'

function fmtAttr(val) {
  if (val === null || val === undefined || val === 0) return '—'
  return val
}

function fmtDate(d) {
  if (!d) return null
  const [y, m, g] = d.split('-')
  return `${g}/${m}/${y}`
}

function fmtAcconto(v) {
  if (!v && v !== 0) return null
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v)
}

export default function Clienti({ db, onNavigate, showToast, onReload, role }) {
  const isAdmin = role === 'admin'
  const { clienti, postazioni, loading } = db

  const [search, setSearch]           = useState('')
  const [modalOpen, setModalOpen]     = useState(false)
  const [selected, setSelected]       = useState(null)
  const [editMode, setEditMode]       = useState(false)
  const [editForm, setEditForm]       = useState({})
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [saving, setSaving]           = useState(false)

  const lista = useMemo(() => {
    const q = search.toLowerCase()
    return clienti.filter(c =>
      `${c.nome} ${c.telefono || ''} ${c.email || ''}`.toLowerCase().includes(q)
    )
  }, [clienti, search])

  const postazioniCliente = useMemo(() => {
    if (!selected) return []
    return postazioni.filter(p =>
      p.cliente && normalizeCliente(p.cliente) === normalizeCliente(selected.nome)
    )
  }, [selected, postazioni])

  const totAttr = useMemo(() => {
    const haLettini = postazioniCliente.some(p => p.lettini > 0)
    const haSdraio  = postazioniCliente.some(p => p.sdraio > 0)
    const haRegista = postazioniCliente.some(p => p.regista > 0)
    return {
      lettini: haLettini ? postazioniCliente.reduce((a, p) => a + (p.lettini || 0), 0) : null,
      sdraio:  haSdraio  ? postazioniCliente.reduce((a, p) => a + (p.sdraio  || 0), 0) : null,
      regista: haRegista ? postazioniCliente.reduce((a, p) => a + (p.regista  || 0), 0) : null,
    }
  }, [postazioniCliente])

  if (loading) return <LoadingScreen />

  function openDettaglio(c) {
    setSelected(c)
    setEditMode(false)
    setDeleteConfirm(false)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setSelected(null)
    setEditMode(false)
    setDeleteConfirm(false)
  }

  function openEdit() {
    setEditForm({
      nome:        selected.nome,
      telefono:    selected.telefono    || '',
      email:       selected.email       || '',
      n_persone:   selected.n_persone   != null ? String(selected.n_persone) : '',
      note:        selected.note        || '',
      acconto:       selected.acconto       != null ? String(selected.acconto)       : '',
      prezzo_totale: selected.prezzo_totale != null ? String(selected.prezzo_totale) : '',
      data_inizio: selected.data_inizio || '',
      data_fine:   selected.data_fine   || '',
    })
    setEditMode(true)
    setDeleteConfirm(false)
  }

  function setEF(k, v) { setEditForm(f => ({ ...f, [k]: v })) }

  async function handleSaveEdit() {
    if (!editForm.nome.trim()) { showToast('Nome obbligatorio', 'error'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('occupazioni')
        .update({
          cliente:     editForm.nome.trim().toUpperCase(),
          telefono:    editForm.telefono.trim()  || null,
          email:       editForm.email.trim()     || null,
          n_persone:   editForm.n_persone        ? parseInt(editForm.n_persone)  : null,
          note:        editForm.note.trim()      || null,
          acconto:       editForm.acconto       ? parseFloat(editForm.acconto)       : null,
          prezzo_totale: editForm.prezzo_totale ? parseFloat(editForm.prezzo_totale) : null,
          data_inizio: editForm.data_inizio      || null,
          data_fine:   editForm.data_fine        || null,
        })
        .eq('cliente', selected.nome)

      if (error) throw error

      showToast('Cliente aggiornato ✓')
      if (onReload) onReload()
      closeModal()
    } catch (err) {
      console.error(err)
      showToast('Errore nel salvataggio', 'error')
    }
    setSaving(false)
  }

  async function handleDelete() {
    setSaving(true)
    try {
      const { error } = await supabase.from('occupazioni')
        .delete()
        .eq('cliente', selected.nome)

      if (error) throw error

      showToast(`${selected.nome} eliminato ✓`)
      if (onReload) onReload()
      closeModal()
    } catch (err) {
      console.error(err)
      showToast('Errore nell\'eliminazione', 'error')
    }
    setSaving(false)
  }

  async function liberaPostazione(p) {
    setSaving(true)
    try {
      const { error } = await supabase.from('occupazioni')
        .delete()
        .eq('tipo', p.tipo)
        .eq('numero', p.numero)

      if (error) throw error

      showToast(`Postazione liberata ✓`)
      if (onReload) onReload()
      setSelected(prev => prev ? { ...prev } : null)
      closeModal()
    } catch (err) {
      console.error(err)
      showToast('Errore', 'error')
    }
    setSaving(false)
  }

  const modalTitle = editMode
    ? `✏️ Modifica — ${selected?.nome}`
    : deleteConfirm
      ? '⚠️ Conferma eliminazione'
      : selected?.nome ?? ''

  return (
    <div className="page-content">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Clienti</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
            {clienti.length} clienti
          </div>
          {isAdmin && onNavigate && (
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate('nuovo-cliente')}>
              ➕ Nuovo
            </button>
          )}
        </div>
      </div>

      <div className="search-bar">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Cerca per nome o telefono..."
        />
      </div>

      {lista.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">👤</span>
          <div className="empty-state-title">Nessun cliente trovato</div>
          <div className="empty-state-sub">
            {search
              ? 'Nessun risultato per la ricerca effettuata'
              : 'I clienti appaiono automaticamente dopo le prenotazioni'}
          </div>
          {!search && onNavigate && (
            <button
              className="btn btn-primary"
              style={{ marginTop: 20 }}
              onClick={() => onNavigate('nuovo-cliente')}
            >
              ➕ Registra primo cliente
            </button>
          )}
        </div>
      ) : (
        <>
          {/* MOBILE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="mobile-only">
            {lista.map(c => {
              const posts = postazioni.filter(p =>
                p.cliente && normalizeCliente(p.cliente) === normalizeCliente(c.nome)
              )
              const haAttr = posts.some(p => p.lettini > 0 || p.sdraio > 0 || p.regista > 0)
              return (
                <div key={c.id} className="card" style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => openDettaglio(c)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{c.nome}</div>
                      {c.telefono && (
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{c.telefono}</div>
                      )}
                    </div>
                    <span className="badge badge-blue">{posts.length} post.</span>
                  </div>
                  {posts.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                      {posts.map(p => `${p.tipo === 'palma' ? '🌴' : '☂'} ${p.numero}`).join(' · ')}
                    </div>
                  )}
                  {haAttr && (
                    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--navy)', fontWeight: 600 }}>
                      {posts.map(p => {
                        const parts = []
                        if (p.lettini > 0) parts.push(`${p.lettini}L`)
                        if (p.sdraio  > 0) parts.push(`${p.sdraio}S`)
                        if (p.regista > 0) parts.push(`${p.regista}R`)
                        return parts.length ? parts.join(' ') : null
                      }).filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {isAdmin && (c.acconto != null || c.prezzo_totale != null) && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {c.acconto != null && (
                        <span className="badge badge-green">Acc. {fmtAcconto(c.acconto)}</span>
                      )}
                      {c.prezzo_totale != null && (
                        <span className="badge" style={{ background: '#fff0f0', color: 'var(--red)', fontWeight: 700 }}>
                          Saldo {fmtAcconto(Math.max(0, c.prezzo_totale - (c.acconto ?? 0)))}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* DESKTOP */}
          <div className="tbl-wrap desktop-only">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Postazioni</th>
                  <th>Lettini</th>
                  <th>Sdraio</th>
                  <th>Regista</th>
                  {isAdmin && <th>Telefono</th>}
                  {isAdmin && <th>Acconto</th>}
                  {isAdmin && <th>Saldo</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.map(c => {
                  const posts = postazioni.filter(p =>
                    p.cliente && normalizeCliente(p.cliente) === normalizeCliente(c.nome)
                  )
                  const tot = posts.reduce((a, p) => ({
                    lettini: a.lettini + (p.lettini || 0),
                    sdraio:  a.sdraio  + (p.sdraio  || 0),
                    regista: a.regista + (p.regista  || 0),
                  }), { lettini: 0, sdraio: 0, regista: 0 })
                  const hasAny = posts.some(p => p.lettini > 0 || p.sdraio > 0 || p.regista > 0)
                  return (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => openDettaglio(c)}>
                      <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{c.nome}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {posts.map(p => (
                            <span key={p.id} className="badge badge-blue">
                              {p.tipo === 'palma' ? '🌴' : '☂'}{p.numero}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{hasAny ? fmtAttr(tot.lettini) : '—'}</td>
                      <td style={{ fontWeight: 700 }}>{hasAny ? fmtAttr(tot.sdraio)  : '—'}</td>
                      <td style={{ fontWeight: 700 }}>{hasAny ? fmtAttr(tot.regista) : '—'}</td>
                      {isAdmin && <td style={{ color: 'var(--sky)' }}>{c.telefono || '—'}</td>}
                      {isAdmin && (
                        <td style={{ fontWeight: 600, color: c.acconto ? 'var(--green)' : 'var(--muted)' }}>
                          {c.acconto != null ? fmtAcconto(c.acconto) : '—'}
                        </td>
                      )}
                      {isAdmin && (
                        <td style={{ fontWeight: 600, color: c.prezzo_totale != null ? 'var(--red)' : 'var(--muted)' }}>
                          {c.prezzo_totale != null ? fmtAcconto(Math.max(0, c.prezzo_totale - (c.acconto ?? 0))) : '—'}
                        </td>
                      )}
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={e => { e.stopPropagation(); openDettaglio(c) }}>
                          Dettaglio
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── MODAL DETTAGLIO / EDIT / DELETE ── */}
      <Modal open={modalOpen} onClose={closeModal} title={modalTitle} size="modal-sm">
        {selected && !editMode && !deleteConfirm && (
          <div>
            {/* Azioni — solo admin */}
            {isAdmin && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button className="btn btn-outline btn-sm" onClick={openEdit} style={{ flex: 1 }}>✏️ Modifica</button>
                <button
                  className="btn btn-sm"
                  onClick={() => setDeleteConfirm(true)}
                  style={{ flex: 1, background: '#fff5f5', color: 'var(--red)', border: '1.5px solid #fde2e2' }}
                >
                  🗑 Elimina
                </button>
              </div>
            )}

            {/* Contatti — solo admin */}
            {isAdmin && (
              <div style={{ background: '#f7f9ff', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: selected.n_persone || selected.data_inizio ? 12 : 0 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Telefono</div>
                    {selected.telefono
                      ? <a href={`tel:${selected.telefono}`} style={{ fontSize: 14, fontWeight: 700, color: 'var(--sky)' }}>{selected.telefono}</a>
                      : <span style={{ color: 'var(--muted)', fontSize: 13 }}>—</span>
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Email</div>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{selected.email || '—'}</span>
                  </div>
                </div>

                {(selected.n_persone || selected.data_inizio || selected.acconto != null || selected.prezzo_totale != null) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid #e8edff' }}>
                    {selected.n_persone && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Persone</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', marginTop: 2 }}>{selected.n_persone}</div>
                      </div>
                    )}
                    {selected.data_inizio && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Check-in</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginTop: 2 }}>{fmtDate(selected.data_inizio)}</div>
                      </div>
                    )}
                    {selected.acconto != null && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Acconto</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)', marginTop: 2 }}>{fmtAcconto(selected.acconto)}</div>
                      </div>
                    )}
                  </div>
                )}

                {selected.prezzo_totale != null && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #e8edff' }}>
                    {[
                      { label: 'Totale',  val: selected.prezzo_totale,                                          color: 'var(--navy)' },
                      { label: 'Acconto', val: selected.acconto ?? 0,                                           color: 'var(--green)' },
                      { label: 'Saldo',   val: Math.max(0, selected.prezzo_totale - (selected.acconto ?? 0)),   color: 'var(--red)' },
                    ].map(r => (
                      <div key={r.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{r.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: r.color }}>{fmtAcconto(r.val)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {selected.note && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e8edff', fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                    📝 {selected.note}
                  </div>
                )}
              </div>
            )}

            {/* Riepilogo attrezzatura */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
              {[
                { label: 'Lettini', val: totAttr.lettini, icon: '🛏' },
                { label: 'Sdraio',  val: totAttr.sdraio,  icon: '🪑' },
                { label: 'Regista', val: totAttr.regista, icon: '🎬' },
              ].map(a => (
                <div key={a.label} style={{ background: '#f0f4ff', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{a.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: a.val ? 'var(--navy)' : 'var(--muted)' }}>
                    {a.val !== null ? a.val : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{a.label}</div>
                </div>
              ))}
            </div>

            {/* Lista postazioni */}
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
              Postazioni ({postazioniCliente.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {postazioniCliente.map(p => {
                const parts = []
                if (p.lettini > 0) parts.push(`${p.lettini} Lettini`)
                if (p.sdraio  > 0) parts.push(`${p.sdraio} Sdraio`)
                if (p.regista > 0) parts.push(`${p.regista} Regista`)
                return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f7f9ff', borderRadius: 8, gap: 8 }}>
                    <div style={{ fontWeight: 700, color: 'var(--navy)' }}>
                      {p.tipo === 'palma' ? '🌴 Palma' : '☂ Ombrellone'} {p.numero}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
                        {parts.length > 0 ? parts.join(' · ') : '—'}
                      </span>
                      {isAdmin && (
                        <button
                          className="btn btn-sm"
                          style={{ background: '#fff5f5', color: 'var(--red)', border: '1px solid #fde2e2', height: 28, padding: '0 10px', fontSize: 11 }}
                          onClick={() => liberaPostazione(p)}
                          disabled={saving}
                        >
                          Libera
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── EDIT MODE ── */}
        {selected && editMode && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label>Nome completo</label>
                <input
                  value={editForm.nome}
                  onChange={e => setEF('nome', e.target.value)}
                  style={{ fontSize: 15, textTransform: 'uppercase' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Telefono</label>
                  <input
                    type="tel"
                    value={editForm.telefono}
                    onChange={e => setEF('telefono', e.target.value)}
                    placeholder="+39 3xx..."
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEF('email', e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>N. persone</label>
                  <input
                    type="number"
                    value={editForm.n_persone}
                    onChange={e => setEF('n_persone', e.target.value)}
                    min="1" max="20"
                  />
                </div>
                <div className="form-group">
                  <label>Prezzo totale (€)</label>
                  <input
                    type="number"
                    value={editForm.prezzo_totale}
                    onChange={e => setEF('prezzo_totale', e.target.value)}
                    placeholder="0.00"
                    min="0" step="0.01"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Acconto (€)</label>
                  <input
                    type="number"
                    value={editForm.acconto}
                    onChange={e => setEF('acconto', e.target.value)}
                    placeholder="0.00"
                    min="0" step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Saldo residuo</label>
                  <div style={{ padding: '10px 12px', background: '#f7f9ff', borderRadius: 8, fontSize: 15, fontWeight: 700, color: 'var(--navy)', border: '1.5px solid #e0e6f8' }}>
                    {editForm.prezzo_totale
                      ? fmtAcconto(Math.max(0, (parseFloat(editForm.prezzo_totale) || 0) - (parseFloat(editForm.acconto) || 0)))
                      : '—'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Check-in</label>
                  <input type="date" value={editForm.data_inizio} onChange={e => setEF('data_inizio', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Check-out</label>
                  <input type="date" value={editForm.data_fine} onChange={e => setEF('data_fine', e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label>Note</label>
                <textarea
                  value={editForm.note}
                  onChange={e => setEF('note', e.target.value)}
                  rows={2}
                  style={{ fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditMode(false)}>Annulla</button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 2, opacity: saving ? .7 : 1 }}
                  onClick={handleSaveEdit}
                  disabled={saving}
                >
                  {saving ? '⏳...' : '✅ Salva modifiche'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DELETE CONFIRM ── */}
        {selected && deleteConfirm && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              Eliminare {selected.nome}?
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
              Questa azione rimuoverà il cliente e libererà tutte le sue postazioni ({postazioniCliente.length}).
              L&apos;operazione non è reversibile.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDeleteConfirm(false)}>Annulla</button>
              <button
                className="btn btn-red"
                style={{ flex: 1, opacity: saving ? .7 : 1 }}
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? '⏳...' : '🗑 Conferma'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
