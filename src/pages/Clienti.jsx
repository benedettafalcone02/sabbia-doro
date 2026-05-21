import { useState, useMemo } from 'react'
import Modal from '../components/Modal'
import { uid } from '../lib/data'

export default function Clienti({ db, onSalvaCliente, showToast }) {
  const { clienti, postazioni } = db
  const [search, setSearch]   = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected]   = useState(null)

  const lista = useMemo(() => {
    const q = search.toLowerCase()
    return clienti.filter(c =>
      `${c.nome} ${c.cognome} ${c.telefono || ''} ${c.email || ''}`.toLowerCase().includes(q)
    )
  }, [clienti, search])

  function openDettaglio(c) { setSelected(c); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setSelected(null) }

  // Postazioni occupate da questo cliente
  const postazioniCliente = useMemo(() => {
    if (!selected) return []
    return postazioni.filter(p =>
      p.cliente && p.cliente.trim().toUpperCase() === selected.nome.trim().toUpperCase()
    )
  }, [selected, postazioni])

  const totAttr = useMemo(() => {
    return postazioniCliente.reduce((acc, p) => ({
      lettini: acc.lettini + (p.lettini || 0),
      sdraio: acc.sdraio + (p.sdraio || 0),
      regista: acc.regista + (p.regista || 0),
    }), { lettini: 0, sdraio: 0, regista: 0 })
  }, [postazioniCliente])

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Clienti</h1>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
          {clienti.length} clienti trovati
        </div>
      </div>

      <div className="search-bar">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Cerca per nome..."
        />
      </div>

      {lista.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
          <div style={{ fontWeight: 600 }}>Nessun cliente trovato</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>I clienti vengono importati automaticamente dall'Excel</div>
        </div>
      ) : (
        <>
          {/* MOBILE: cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="mobile-only">
            {lista.map(c => {
              const posts = postazioni.filter(p =>
                p.cliente && p.cliente.trim().toUpperCase() === c.nome.trim().toUpperCase()
              )
              return (
                <div key={c.id} className="card" style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => openDettaglio(c)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{c.nome}</div>
                      {c.telefono && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{c.telefono}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-blue">{posts.length} post.</span>
                    </div>
                  </div>
                  {posts.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                      {posts.map(p => `${p.tipo === 'palma' ? '🌴' : '☂'} ${p.numero}`).join(' · ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* DESKTOP: tabella */}
          <div className="tbl-wrap desktop-only">
            <table>
              <thead>
                <tr><th>Cliente</th><th>Postazioni</th><th>Lettini</th><th>Sdraio</th><th>Regista</th><th>Telefono</th><th></th></tr>
              </thead>
              <tbody>
                {lista.map(c => {
                  const posts = postazioni.filter(p =>
                    p.cliente && p.cliente.trim().toUpperCase() === c.nome.trim().toUpperCase()
                  )
                  const tot = posts.reduce((a, p) => ({
                    lettini: a.lettini + (p.lettini || 0),
                    sdraio: a.sdraio + (p.sdraio || 0),
                    regista: a.regista + (p.regista || 0),
                  }), { lettini: 0, sdraio: 0, regista: 0 })
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
                      <td style={{ fontWeight: 700 }}>{tot.lettini || '—'}</td>
                      <td style={{ fontWeight: 700 }}>{tot.sdraio || '—'}</td>
                      <td style={{ fontWeight: 700 }}>{tot.regista || '—'}</td>
                      <td style={{ color: 'var(--sky)' }}>{c.telefono || '—'}</td>
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

      {/* MODAL DETTAGLIO CLIENTE */}
      <Modal open={modalOpen} onClose={closeModal} title={selected ? selected.nome : ''} size="modal-sm">
        {selected && (
          <div>
            {/* Info contatto */}
            <div style={{ background: '#f7f9ff', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Telefono</div>
                  {selected.telefono
                    ? <a href={`tel:${selected.telefono}`} style={{ fontSize: 14, fontWeight: 700, color: 'var(--sky)' }}>{selected.telefono}</a>
                    : <span style={{ color: 'var(--muted)', fontSize: 13 }}>—</span>
                  }
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Email</div>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{selected.email || '—'}</span>
                </div>
              </div>
            </div>

            {/* Riepilogo attrezzatura */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Lettini', val: totAttr.lettini, icon: '🛏' },
                { label: 'Sdraio', val: totAttr.sdraio, icon: '🪑' },
                { label: 'Regista', val: totAttr.regista, icon: '🎬' },
              ].map(a => (
                <div key={a.label} style={{ background: '#f0f4ff', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{a.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)' }}>{a.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{a.label}</div>
                </div>
              ))}
            </div>

            {/* Lista postazioni */}
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
              Postazioni ({postazioniCliente.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {postazioniCliente.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f7f9ff', borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, color: 'var(--navy)' }}>
                    {p.tipo === 'palma' ? '🌴 Palma' : '☂ Ombrellone'} {p.numero}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {p.lettini}L · {p.sdraio}S · {p.regista}R
                  </div>
                </div>
              ))}
            </div>

            {selected.note && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: '#fffbec', borderRadius: 8, fontSize: 13, color: '#7a5500', borderLeft: '3px solid var(--yellow)' }}>
                📝 {selected.note}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
