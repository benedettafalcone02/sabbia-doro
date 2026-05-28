import { useState, useCallback, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import LoadingScreen from '../components/LoadingScreen'
import { fmtEur, today } from '../lib/data'
import styles from './Mappa.module.css'

const FILTRI = [
  { id: 'tutti',      label: 'Tutti' },
  { id: 'palme',      label: '🌴 Palme' },
  { id: 'ombrelloni', label: '☂ Ombrelloni' },
  { id: 'liberi',     label: '🟢 Liberi' },
  { id: 'occupati',   label: '🔴 Occupati' },
]

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, g] = d.split('-')
  return `${g}/${m}/${y}`
}

export default function Mappa({ db, onNavigate, showToast, onReload }) {
  const { postazioni, loading } = db
  const [filtro, setFiltro]             = useState('tutti')
  const [selected, setSelected]         = useState(null)
  const [confirmLibera, setConfirmLibera] = useState(false)
  const [pagMode, setPagMode]           = useState(false)
  const [showAddForm, setShowAddForm]   = useState(false)
  const [newPag, setNewPag]             = useState({ importo: '', data: today(), note: '' })
  const [saving, setSaving]             = useState(false)

  function closeModal() {
    setSelected(null)
    setConfirmLibera(false)
    setPagMode(false)
    setShowAddForm(false)
    setNewPag({ importo: '', data: today(), note: '' })
  }

  async function handleAddPagamento() {
    const post = postazioni.find(p => p.id === selected)
    if (!post || !newPag.importo) return
    setSaving(true)
    try {
      const { error } = await supabase.from('pagamenti').insert({
        occupazione_id: post.occ_id,
        importo: parseFloat(newPag.importo),
        data:    newPag.data || today(),
        note:    newPag.note || null,
      })
      if (error) throw error
      showToast('Pagamento aggiunto ✓')
      if (onReload) onReload()
      setShowAddForm(false)
      setNewPag({ importo: '', data: today(), note: '' })
    } catch (err) {
      console.error(err)
      showToast('Errore nel salvataggio', 'error')
    }
    setSaving(false)
  }

  async function handleDeletePagamento(id) {
    setSaving(true)
    try {
      const { error } = await supabase.from('pagamenti').delete().eq('id', id)
      if (error) throw error
      showToast('Pagamento eliminato ✓')
      if (onReload) onReload()
    } catch (err) {
      console.error(err)
      showToast('Errore nell\'eliminazione', 'error')
    }
    setSaving(false)
  }

  async function handleLibera() {
    const post = postazioni.find(p => p.id === selected)
    if (!post) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('occupazioni')
        .delete()
        .eq('tipo', post.tipo)
        .eq('numero', post.numero)
      if (error) throw error
      showToast('Postazione liberata ✓')
      if (onReload) onReload()
      closeModal()
    } catch (err) {
      console.error(err)
      showToast('Errore nella liberazione', 'error')
    }
    setSaving(false)
  }

  const isVisible = useCallback((p) => {
    if (filtro === 'palme')      return p.tipo === 'palma'
    if (filtro === 'ombrelloni') return p.tipo === 'ombrellone'
    if (filtro === 'liberi')     return p.stato === 'libero'
    if (filtro === 'occupati')   return p.stato !== 'libero'
    return true
  }, [filtro])

  if (loading) return <LoadingScreen />

  function renderRigaOmbrelloni(fila, settore, cls) {
    const items = postazioni
      .filter(p => p.tipo === 'ombrellone' && p.settore === settore && p.fila === fila)
      .sort((a, b) => a.col - b.col)
    return (
      <div key={`${settore}-${fila}`} className={styles.row}>
        <div className={styles.rowLabel}>F{fila}</div>
        <div className={styles.rowItems}>
          {items.map((p, idx) => (
            <Fragment key={p.id}>
              {idx === 8 && <div className={styles.passerella} />}
              <div
                className={`${styles.postazione} ${styles[cls]} ${styles[p.stato]} ${!isVisible(p) ? styles.hidden : ''}`}
                onClick={() => isVisible(p) && setSelected(p.id)}
              >
                {p.numero}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    )
  }

  const selPost = selected ? postazioni.find(p => p.id === selected) : null

  const refPrice = selPost
    ? (selPost.tipo === 'palma' ? selPost.prezzo_stagionale : selPost.prezzo_2lettini)
    : 0
  const pagamenti    = selPost?.pagamenti || []
  const totalePagato = pagamenti.reduce((s, pg) => s + Number(pg.importo), 0)
  const saldoResiduo = Math.max(0, refPrice - totalePagato)

  return (
    <div className="page-content">
      <h1 className="page-title">Mappa</h1>

      {/* Legenda + filtri su una riga */}
      <div className={styles.controls}>
        <div className={styles.legenda}>
          <div className={styles.legItem}><div className={styles.dot} style={{ background: '#27ae60' }} />Libero</div>
          <div className={styles.legItem}><div className={styles.dot} style={{ background: 'var(--red)' }} />Occupato</div>
        </div>
        <div className={styles.filtri}>
          {FILTRI.map(f => (
            <button
              key={f.id}
              className={`${styles.filtroBtn} ${filtro === f.id ? styles.filtroBtnActive : ''}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.mappaWrap}>
        <div className={styles.scrollHint}>← scorri orizzontalmente →</div>

        <div className={styles.sezione}>
          <div className={styles.sezLabel}>🌴 Palme (84)</div>
          {[1,2,3,4,5,6].map(fila => {
            const items = postazioni.filter(p => p.tipo === 'palma' && p.fila === fila).sort((a,b) => a.col - b.col)
            return (
              <div key={fila} className={styles.row}>
                <div className={styles.rowLabel}>F{fila}</div>
                <div className={styles.rowItems}>
                  {items.map(p => (
                    <div
                      key={p.id}
                      className={`${styles.postazione} ${styles.palma} ${styles[p.stato]} ${!isVisible(p) ? styles.hidden : ''}`}
                      onClick={() => isVisible(p) && setSelected(p.id)}
                    >
                      {p.numero}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className={styles.sezione}>
          <div className={styles.sezLabel}>☂ Settore A</div>
          {[1,2,3,4,5,6].map(f => renderRigaOmbrelloni(f, 'A', 'ombrA'))}
        </div>

        <div className={styles.sezione}>
          <div className={styles.sezLabel}>☂ Settore B</div>
          {[7,8,9,10,11,12,13].map(f => renderRigaOmbrelloni(f, 'B', 'ombrB'))}
        </div>
      </div>

      {/* POPUP */}
      <Modal
        open={!!selected}
        onClose={closeModal}
        title={selPost
          ? pagMode
            ? `💳 Pagamenti — ${selPost.cliente}`
            : confirmLibera
              ? '⚠️ Conferma liberazione'
              : selPost.tipo === 'palma'
                ? `🌴 Palma ${selPost.numero} · F${selPost.fila}`
                : `☂ Ombr. ${selPost.numero} S.${selPost.settore} · F${selPost.fila}`
          : ''}
        size="modal-sm"
      >
        {selPost && (
          <div>
            {/* Prezzo di riferimento */}
            <div style={{ background: '#f7f9ff', borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 13 }}>
              {selPost.tipo === 'palma'
                ? <div>Stagionale: <strong style={{ color: 'var(--navy)', fontSize: 15 }}>{fmtEur(selPost.prezzo_stagionale)}</strong></div>
                : <div style={{ display: 'flex', gap: 14 }}>
                    <div>2L: <strong>{fmtEur(selPost.prezzo_2lettini)}</strong></div>
                    <div>L+R: <strong>{fmtEur(selPost.prezzo_lettino_regista)}</strong></div>
                  </div>
              }
            </div>

            <div style={{ marginBottom: 14 }}>
              <span className={`badge ${selPost.stato === 'libero' ? 'badge-green' : 'badge-red'}`}>
                {selPost.stato === 'libero' ? '🟢 Libero' : '🔴 Occupato'}
              </span>
            </div>

            {/* Dettagli occupazione */}
            {selPost.stato === 'occupato' && !pagMode && !confirmLibera && (
              <div style={{ background: '#f0f4ff', borderRadius: 10, padding: '14px', marginBottom: 14, border: '1px solid #dde8ff' }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)', marginBottom: 10 }}>
                  👤 {selPost.cliente || '—'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {[
                    { icon: '🛏', label: 'Lettini', val: selPost.lettini },
                    { icon: '🪑', label: 'Sdraio',  val: selPost.sdraio },
                    { icon: '🎬', label: 'Regista', val: selPost.regista },
                  ].map(a => (
                    <div key={a.label} style={{ textAlign: 'center', background: '#fff', borderRadius: 8, padding: '8px 4px' }}>
                      <div style={{ fontSize: 18 }}>{a.icon}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>
                        {a.val > 0 ? a.val : '—'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>{a.label}</div>
                    </div>
                  ))}
                </div>

                {/* Riepilogo pagamenti */}
                <div style={{ borderTop: '1px solid #dde8ff', marginTop: 10, paddingTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
                  {[
                    { label: 'Pagato',  val: totalePagato, color: 'var(--green)' },
                    { label: 'Saldo',   val: saldoResiduo, color: 'var(--red)' },
                  ].map(r => (
                    <div key={r.label} style={{ textAlign: 'center', background: '#fff', borderRadius: 8, padding: '8px 4px' }}>
                      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{r.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: r.color }}>{fmtEur(r.val)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PAGAMENTI MODE */}
            {pagMode && (
              <div>
                {/* Lista pagamenti esistenti */}
                {pagamenti.length === 0 && !showAddForm && (
                  <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>Nessun pagamento registrato</p>
                )}
                {pagamenti.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    {pagamenti.map(pg => (
                      <div key={pg.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#f7f9ff', borderRadius: 8, marginBottom: 6, border: '1px solid #e8edf8' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14 }}>{fmtEur(Number(pg.importo))}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDate(pg.data)}{pg.note ? ` · ${pg.note}` : ''}</div>
                        </div>
                        <button
                          onClick={() => handleDeletePagamento(pg.id)}
                          disabled={saving}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 16, padding: '4px 6px', lineHeight: 1 }}
                        >
                          🗑
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Form aggiunta pagamento */}
                {showAddForm ? (
                  <div style={{ background: '#f0f4ff', borderRadius: 10, padding: '12px', border: '1px solid #dde8ff', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Nuovo pagamento</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: 11 }}>Importo (€)</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 700, pointerEvents: 'none', fontSize: 13 }}>€</span>
                          <input
                            type="number" min="0" step="0.01"
                            value={newPag.importo}
                            onChange={e => setNewPag(f => ({ ...f, importo: e.target.value }))}
                            placeholder="0.00"
                            style={{ paddingLeft: 22, fontSize: 14 }}
                          />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: 11 }}>Data</label>
                        <input
                          type="date"
                          value={newPag.data}
                          onChange={e => setNewPag(f => ({ ...f, data: e.target.value }))}
                          style={{ fontSize: 14 }}
                        />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 11 }}>Note (opzionale)</label>
                      <input
                        type="text"
                        value={newPag.note}
                        onChange={e => setNewPag(f => ({ ...f, note: e.target.value }))}
                        placeholder="es. acconto, saldo finale..."
                        style={{ fontSize: 13 }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }} onClick={() => { setShowAddForm(false); setNewPag({ importo: '', data: today(), note: '' }) }}>
                        Annulla
                      </button>
                      <button
                        className="btn btn-primary"
                        style={{ flex: 2, justifyContent: 'center', fontSize: 13, opacity: saving || !newPag.importo ? .6 : 1 }}
                        disabled={saving || !newPag.importo}
                        onClick={handleAddPagamento}
                      >
                        {saving ? '⏳...' : '✅ Aggiungi'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-outline"
                    style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
                    onClick={() => setShowAddForm(true)}
                  >
                    ➕ Aggiungi pagamento
                  </button>
                )}

                {/* Totale pagato + Saldo residuo */}
                <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #dde8ff', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 12 }}>
                  {[
                    { label: 'Prezzo',  val: refPrice,     color: 'var(--navy)' },
                    { label: 'Pagato',  val: totalePagato, color: 'var(--green)' },
                    { label: 'Saldo',   val: saldoResiduo, color: 'var(--red)' },
                  ].map(r => (
                    <div key={r.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{r.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: r.color }}>{fmtEur(r.val)}</div>
                    </div>
                  ))}
                </div>

                <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setPagMode(false)}>
                  Chiudi
                </button>
              </div>
            )}

            {/* CONFERMA LIBERA */}
            {confirmLibera && (
              <div>
                <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--navy)', marginBottom: 6 }}>
                  Liberare la postazione di <strong>{selPost.cliente}</strong>?
                </p>
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
                  L'occupazione e tutti i pagamenti verranno rimossi.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmLibera(false)}>
                    Annulla
                  </button>
                  <button
                    className="btn"
                    style={{ flex: 1, justifyContent: 'center', background: 'var(--red)', color: '#fff' }}
                    disabled={saving}
                    onClick={handleLibera}
                  >
                    {saving ? '...' : '🗑 Conferma'}
                  </button>
                </div>
              </div>
            )}

            {/* BOTTONI PRINCIPALI (stato normale) */}
            {selPost.stato === 'libero' ? (
              <button
                className="btn btn-yellow btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { closeModal(); onNavigate && onNavigate('prenota') }}
              >
                ➕ Prenota questa postazione
              </button>
            ) : !pagMode && !confirmLibera ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setPagMode(true)}
                >
                  💳 Gestisci pagamenti
                </button>
                <button
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setConfirmLibera(true)}
                >
                  🔓 Libera postazione
                </button>
                <button
                  className="btn"
                  style={{ width: '100%', justifyContent: 'center', background: 'var(--red)', color: '#fff' }}
                  onClick={() => setConfirmLibera(true)}
                >
                  🗑 Elimina prenotazione
                </button>
                <button
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center', color: 'var(--muted)', borderColor: '#ddd' }}
                  onClick={closeModal}
                >
                  Chiudi
                </button>
              </div>
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  )
}
