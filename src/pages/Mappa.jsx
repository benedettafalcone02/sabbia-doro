import { useState, useCallback, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import LoadingScreen from '../components/LoadingScreen'
import { fmtEur } from '../lib/data'
import styles from './Mappa.module.css'

const FILTRI = [
  { id: 'tutti',      label: 'Tutti' },
  { id: 'palme',      label: '🌴 Palme' },
  { id: 'ombrelloni', label: '☂ Ombrelloni' },
  { id: 'liberi',     label: '🟢 Liberi' },
  { id: 'occupati',   label: '🔴 Occupati' },
]

export default function Mappa({ db, onNavigate, showToast, onReload }) {
  const { postazioni, loading } = db
  const [filtro, setFiltro]               = useState('tutti')
  const [selected, setSelected]           = useState(null)
  const [confirmLibera, setConfirmLibera] = useState(false)
  const [editMode, setEditMode]           = useState(false)
  const [editForm, setEditForm]           = useState({ prezzo_totale: '', acconto: '' })
  const [saving, setSaving]               = useState(false)

  function closeModal() {
    setSelected(null)
    setConfirmLibera(false)
    setEditMode(false)
  }

  function openEdit(post) {
    setEditForm({
      prezzo_totale: post.prezzo_totale != null ? String(post.prezzo_totale) : '',
      acconto:       post.acconto       != null ? String(post.acconto)       : '',
    })
    setEditMode(true)
    setConfirmLibera(false)
  }

  // saldo calcolato dal form in tempo reale
  const saldoPreview = Math.max(
    0,
    (parseFloat(editForm.prezzo_totale) || 0) - (parseFloat(editForm.acconto) || 0)
  )

  async function handleSaveEdit() {
    const post = postazioni.find(p => p.id === selected)
    if (!post) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('occupazioni')
        .update({
          prezzo_totale: editForm.prezzo_totale ? parseFloat(editForm.prezzo_totale) : null,
          acconto:       editForm.acconto       ? parseFloat(editForm.acconto)       : null,
        })
        .eq('tipo', post.tipo)
        .eq('numero', post.numero)
      if (error) throw error
      showToast('Prezzi aggiornati ✓')
      if (onReload) onReload()
      closeModal()
    } catch (err) {
      console.error(err)
      showToast('Errore nel salvataggio', 'error')
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
          ? editMode
            ? `✏️ Modifica prezzi — ${selPost.cliente}`
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

            {selPost.stato === 'occupato' && (
              <div style={{ background: '#f0f4ff', borderRadius: 10, padding: '14px', marginBottom: 14, border: '1px solid #dde8ff' }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)', marginBottom: 10 }}>
                  👤 {selPost.cliente || '—'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: selPost.prezzo_totale != null ? 12 : 0 }}>
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

                {selPost.prezzo_totale != null && (
                  <div style={{ borderTop: '1px solid #dde8ff', paddingTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                    {[
                      { label: 'Totale',  val: selPost.prezzo_totale, color: 'var(--navy)' },
                      { label: 'Acconto', val: selPost.acconto ?? 0,  color: 'var(--green)' },
                      { label: 'Saldo',   val: Math.max(0, selPost.prezzo_totale - (selPost.acconto ?? 0)), color: 'var(--red)' },
                    ].map(r => (
                      <div key={r.label} style={{ textAlign: 'center', background: '#fff', borderRadius: 8, padding: '8px 4px' }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{r.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: r.color }}>{fmtEur(r.val)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selPost.stato === 'libero' ? (
              <button
                className="btn btn-yellow btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { closeModal(); onNavigate && onNavigate('prenota') }}
              >
                ➕ Prenota questa postazione
              </button>
            ) : editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label style={{ fontSize: 12 }}>Prezzo totale (€)</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 700, pointerEvents: 'none' }}>€</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={editForm.prezzo_totale}
                        onChange={e => setEditForm(f => ({ ...f, prezzo_totale: e.target.value }))}
                        placeholder="es. 800"
                        style={{ paddingLeft: 26, fontSize: 15 }}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: 12 }}>Acconto (€)</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 700, pointerEvents: 'none' }}>€</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={editForm.acconto}
                        onChange={e => setEditForm(f => ({ ...f, acconto: e.target.value }))}
                        placeholder="es. 200"
                        style={{ paddingLeft: 26, fontSize: 15 }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #dde8ff', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                  {[
                    { label: 'Totale',  val: parseFloat(editForm.prezzo_totale) || 0, color: 'var(--navy)' },
                    { label: 'Acconto', val: parseFloat(editForm.acconto) || 0,        color: 'var(--green)' },
                    { label: 'Saldo',   val: saldoPreview,                             color: 'var(--red)' },
                  ].map(r => (
                    <div key={r.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{r.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: r.color }}>{fmtEur(r.val)}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditMode(false)}>
                    Annulla
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 2, justifyContent: 'center', opacity: saving ? .7 : 1 }}
                    disabled={saving}
                    onClick={handleSaveEdit}
                  >
                    {saving ? '⏳...' : '✅ Salva'}
                  </button>
                </div>
              </div>
            ) : confirmLibera ? (
              <div>
                <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--navy)', marginBottom: 6 }}>
                  Liberare la postazione di <strong>{selPost.cliente}</strong>?
                </p>
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
                  L'occupazione verrà rimossa e la postazione tornerà disponibile.
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
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => openEdit(selPost)}
                >
                  ✏️ Modifica prezzi
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
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
