import { useState, useCallback, useEffect, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import LoadingScreen from '../components/LoadingScreen'
import { fmtEur, today } from '../lib/data'
import styles from './Mappa.module.css'

const FILTRI = [
  { id: 'tutti',       label: 'Tutti' },
  { id: 'palme',       label: '🌴 Palme' },
  { id: 'ombrelloni',  label: '☂ Ombrelloni' },
  { id: 'liberi',      label: '🟢 Liberi' },
  { id: 'occupati',    label: '🔴 Occupati' },
  { id: 'temporanee',  label: '🟡 Temporanee' },
  { id: 'subaffitti',  label: '🟣 Subaffitti' },
  { id: 'disponibili', label: '🔵 Libere temp.' },
]

function getPostazioneClass(p, styles) {
  if (p.stato === 'libero') return styles.libero
  if (p.tipo_occupazione === 'subaffitto')             return styles.subaffitto
  if (p.tipo_occupazione === 'subaffitto_disponibile') return styles.disponibile
  if (p.tipo_occupazione === 'disponibile')            return styles.disponibile
  if (p.temporanea) return styles.temporanea
  return styles.occupato
}

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, g] = d.split('-')
  return `${g}/${m}/${y}`
}

export default function Mappa({ db, onNavigate, onNavigatePrenota, showToast, onReload, role }) {
  const isAdmin = role === 'admin'
  const { postazioni, occupazioni, loading } = db
  const [filtro, setFiltro]             = useState('tutti')
  const [selected, setSelected]         = useState(null)
  const [confirmLibera, setConfirmLibera] = useState(false)
  const [pagMode, setPagMode]           = useState(false)
  const [showAddForm, setShowAddForm]   = useState(false)
  const [newPag, setNewPag]             = useState({ importo: '', data: today(), note: '' })
  const [saving, setSaving]             = useState(false)
  const [editPrezzo, setEditPrezzo]     = useState('')
  const [savingPrezzo, setSavingPrezzo] = useState(false)
  const [isEditingPrezzo, setIsEditingPrezzo] = useState(false)
  const [deletingPrenId, setDeletingPrenId] = useState(null)
  const [editPren, setEditPren]         = useState(null)
  const [subForm, setSubForm]           = useState(null)
  const [dispForm, setDispForm]         = useState(null)
  const [confirmAnnulla, setConfirmAnnulla] = useState(false)
  const [filterDateInizio, setFilterDateInizio] = useState('')
  const [filterDateFine,   setFilterDateFine]   = useState('')

  useEffect(() => {
    if (selPost) {
      setEditPrezzo(selPost.prezzo_totale != null ? String(selPost.prezzo_totale) : '')
      setIsEditingPrezzo(false)
    }
  }, [selected])

  function closeModal() {
    setSelected(null)
    setConfirmLibera(false)
    setPagMode(false)
    setShowAddForm(false)
    setIsEditingPrezzo(false)
    setNewPag({ importo: '', data: today(), note: '' })
    setDeletingPrenId(null)
    setEditPren(null)
    setSubForm(null)
    setDispForm(null)
    setConfirmAnnulla(false)
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

  async function handleSavePrezzo() {
    const post = postazioni.find(p => p.id === selected)
    if (!post) return
    setSavingPrezzo(true)
    try {
      const { error } = await supabase
        .from('occupazioni')
        .update({ prezzo_totale: editPrezzo !== '' ? parseFloat(editPrezzo) : null })
        .eq('id', post.occ_id)
      if (error) throw error
      showToast('Prezzo salvato ✓')
      if (onReload) onReload()
    } catch (err) {
      console.error(err)
      showToast('Errore nel salvataggio', 'error')
    }
    setSavingPrezzo(false)
  }

  async function handleDeletePren(id) {
    setSaving(true)
    try {
      const { error } = await supabase.from('occupazioni').delete().eq('id', id)
      if (error) throw error
      showToast('Prenotazione eliminata ✓')
      setDeletingPrenId(null)
      if (onReload) onReload()
    } catch (err) {
      console.error(err)
      showToast('Errore nell\'eliminazione', 'error')
    }
    setSaving(false)
  }

  async function handleUpdatePren() {
    if (!editPren) return
    setSaving(true)
    try {
      const { error } = await supabase.from('occupazioni').update({
        cliente:       editPren.cliente.trim().toUpperCase(),
        data_inizio:   editPren.data_inizio,
        data_fine:     editPren.data_fine,
        prezzo_totale: editPren.prezzo_totale !== '' ? parseFloat(editPren.prezzo_totale) : null,
        note:          editPren.note || null,
        temporanea:    editPren.temporanea,
      }).eq('id', editPren.id)
      if (error) throw error
      showToast('Prenotazione aggiornata ✓')
      setEditPren(null)
      if (onReload) onReload()
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
        .eq('id', post.occ_id)
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

  async function handleSubaffitta() {
    if (!subForm?.subaffittuario || !subForm.data_inizio || !subForm.data_fine) return
    const post = postazioni.find(p => p.id === selected)
    if (!post) return
    setSaving(true)
    try {
      // Se stiamo confermando su una riga "disponibile", eliminala prima
      if ((post.tipo_occupazione === 'disponibile' || post.tipo_occupazione === 'subaffitto_disponibile') && post.occ_id) {
        const { error: delErr } = await supabase.from('occupazioni').delete().eq('id', post.occ_id)
        if (delErr) throw delErr
      }
      const { error } = await supabase.from('occupazioni').insert({
        tipo:             post.tipo,
        numero:           post.numero,
        cliente:          post.cliente,
        tipo_occupazione: 'subaffitto',
        subaffittuario:   subForm.subaffittuario.trim().toUpperCase(),
        data_inizio:      subForm.data_inizio,
        data_fine:        subForm.data_fine,
        lettini: 0, sdraio: 0, regista: 0,
      })
      if (error) throw error
      showToast('Subaffitto registrato ✓')
      if (onReload) onReload()
      closeModal()
    } catch (err) {
      console.error(err)
      showToast('Errore nel salvataggio', 'error')
    }
    setSaving(false)
  }

  async function handleSegnaDisponibile() {
    if (!dispForm?.data_inizio || !dispForm.data_fine) return
    const post = postazioni.find(p => p.id === selected)
    if (!post) return
    setSaving(true)
    try {
      const { error } = await supabase.from('occupazioni').insert({
        tipo:             post.tipo,
        numero:           post.numero,
        cliente:          post.cliente,
        tipo_occupazione: 'disponibile',
        data_inizio:      dispForm.data_inizio,
        data_fine:        dispForm.data_fine,
        note:             dispForm.note || null,
        lettini: 0, sdraio: 0, regista: 0,
      })
      if (error) throw error
      showToast('Postazione segnata disponibile ✓')
      if (onReload) onReload()
      closeModal()
    } catch (err) {
      console.error(err)
      showToast('Errore nel salvataggio', 'error')
    }
    setSaving(false)
  }

  async function handleAnnullaSubDisp() {
    const post = postazioni.find(p => p.id === selected)
    if (!post) return
    setSaving(true)
    try {
      const { error } = await supabase.from('occupazioni').delete().eq('id', post.occ_id)
      if (error) throw error
      showToast('Annullato ✓')
      if (onReload) onReload()
      closeModal()
    } catch (err) {
      console.error(err)
      showToast('Errore', 'error')
    }
    setSaving(false)
  }

  const filterActive = !!(filterDateInizio && filterDateFine && filterDateFine >= filterDateInizio)

  const isVisible = useCallback((p) => {
    if (filterActive) {
      const occupato = (occupazioni || []).some(o =>
        o.tipo === p.tipo &&
        Number(o.numero) === Number(p.numero) &&
        o.data_inizio <= filterDateFine &&
        o.data_fine   >= filterDateInizio
      )
      return !occupato
    }
    if (filtro === 'palme')        return p.tipo === 'palma'
    if (filtro === 'ombrelloni')   return p.tipo === 'ombrellone'
    if (filtro === 'liberi')       return p.stato === 'libero'
    if (filtro === 'occupati')     return p.stato !== 'libero'
    if (filtro === 'temporanee')   return !!p.temporanea
    if (filtro === 'subaffitti')  return (occupazioni || []).some(o =>
      o.tipo === p.tipo && Number(o.numero) === Number(p.numero) &&
      o.tipo_occupazione === 'subaffitto' && o.data_fine >= today()
    )
    if (filtro === 'disponibili') return (occupazioni || []).some(o =>
      o.tipo === p.tipo && Number(o.numero) === Number(p.numero) &&
      (o.tipo_occupazione === 'disponibile' || o.tipo_occupazione === 'subaffitto_disponibile') &&
      o.data_fine >= today()
    )
    return true
  }, [filtro, filterActive, filterDateInizio, filterDateFine, occupazioni])

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
                className={`${styles.postazione} ${styles[cls]} ${getPostazioneClass(p, styles)} ${!isVisible(p) ? styles.hidden : ''}`}
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

  const pagamenti    = selPost?.pagamenti || []
  const totalePagato = pagamenti.reduce((s, pg) => s + Number(pg.importo), 0)
  const saldoResiduo = selPost?.prezzo_totale != null
    ? Math.max(0, selPost.prezzo_totale - totalePagato)
    : null

  return (
    <div className="page-content">
      <h1 className="page-title">Mappa</h1>

      {/* Filtro disponibilità per periodo */}
      <div style={{
        background: filterActive ? '#e8f0ff' : '#f7f9ff',
        border: `1.5px solid ${filterActive ? '#4a80e8' : '#dde8ff'}`,
        borderRadius: 12, padding: '12px 14px', marginBottom: 14,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>
          🔍 Mostra postazioni libere nel periodo
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>Dal</div>
            <input type="date" value={filterDateInizio}
              onChange={e => setFilterDateInizio(e.target.value)}
              style={{ fontSize: 14, width: '100%', padding: '8px 10px', border: '1.5px solid #dde8ff', borderRadius: 8, outline: 'none' }} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>Al</div>
            <input type="date" value={filterDateFine} min={filterDateInizio}
              onChange={e => setFilterDateFine(e.target.value)}
              style={{ fontSize: 14, width: '100%', padding: '8px 10px', border: '1.5px solid #dde8ff', borderRadius: 8, outline: 'none' }} />
          </div>
          {filterActive && (
            <button
              onClick={() => { setFilterDateInizio(''); setFilterDateFine('') }}
              style={{ padding: '8px 14px', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              ✕ Reset
            </button>
          )}
        </div>
        {filterActive && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#4a80e8', fontWeight: 600 }}>
            ✓ Filtro attivo — solo postazioni libere dal {filterDateInizio.split('-').reverse().join('/')} al {filterDateFine.split('-').reverse().join('/')}
          </div>
        )}
      </div>

      {/* Legenda + filtri su una riga */}
      <div className={styles.controls}>
        <div className={styles.legenda}>
          <div className={styles.legItem}><div className={styles.dot} style={{ background: '#27ae60' }} />Libero</div>
          <div className={styles.legItem}><div className={styles.dot} style={{ background: 'var(--red)' }} />Occupato</div>
          <div className={styles.legItem}><div className={styles.dot} style={{ background: 'var(--yellow)' }} />Temporanea</div>
          <div className={styles.legItem}><div className={styles.dot} style={{ background: '#8b5cf6' }} />Subaffitto</div>
          <div className={styles.legItem}><div className={styles.dot} style={{ background: '#0ea5e9' }} />Libera temp.</div>
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

        <div className={styles.mappaContent}>
          {/* Barra unica continua che attraversa tutte le sezioni */}
          <div className={styles.passerellaLine} />

          <div className={styles.sezione}>
            <div className={styles.sezLabel}>🌴 Palme (84)</div>
            {[1,2,3,4,5,6].map(fila => {
              const items = postazioni.filter(p => p.tipo === 'palma' && p.fila === fila).sort((a,b) => a.col - b.col)
              return (
                <div key={fila} className={styles.row}>
                  <div className={styles.rowLabel}>F{fila}</div>
                  <div className={styles.rowItems}>
                    {items.map((p, idx) => (
                      <Fragment key={p.id}>
                        {idx === 7 && <div className={styles.passerella} />}
                        <div
                          className={`${styles.postazione} ${styles.palma} ${getPostazioneClass(p, styles)} ${!isVisible(p) ? styles.hidden : ''}`}
                          onClick={() => isVisible(p) && setSelected(p.id)}
                        >
                          {p.numero}
                        </div>
                      </Fragment>
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
            {/* Prezzo totale — solo admin, editabile inline */}
            {isAdmin && selPost.stato !== 'libero' && (
              <div style={{ background: '#f7f9ff', borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Prezzo tot.:</span>
                {isEditingPrezzo ? (
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 700, fontSize: 13, pointerEvents: 'none' }}>€</span>
                    <input
                      type="number" min="0" step="0.01"
                      value={editPrezzo}
                      onChange={e => setEditPrezzo(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                      onBlur={() => { setIsEditingPrezzo(false); handleSavePrezzo() }}
                      autoFocus
                      style={{ paddingLeft: 22, fontSize: 14, width: '100%' }}
                    />
                  </div>
                ) : (
                  <strong
                    onClick={() => setIsEditingPrezzo(true)}
                    title="Clicca per modificare"
                    style={{ color: 'var(--navy)', fontSize: 15, cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}
                  >
                    {selPost.prezzo_totale != null
                      ? fmtEur(selPost.prezzo_totale)
                      : <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 13 }}>— clicca per impostare</span>
                    }
                  </strong>
                )}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <span className={`badge ${
                selPost.stato === 'libero' ? 'badge-green' :
                selPost.tipo_occupazione === 'subaffitto' ? 'badge-purple' :
                selPost.tipo_occupazione === 'subaffitto_disponibile' ? 'badge-sky' :
                selPost.tipo_occupazione === 'disponibile' ? 'badge-sky' :
                selPost.temporanea ? 'badge-yellow' : 'badge-red'
              }`}>
                {selPost.stato === 'libero' ? '🟢 Libero' :
                 selPost.tipo_occupazione === 'subaffitto' ? '🟣 In subaffitto' :
                 selPost.tipo_occupazione === 'subaffitto_disponibile' ? '🔵 Disponibile subaffitto' :
                 selPost.tipo_occupazione === 'disponibile' ? '🔵 Disponibile subaffitto' :
                 selPost.temporanea ? '🟡 Temporanea' : '🔴 Occupato'}
              </span>
            </div>

            {/* Date prenotazione corrente */}
            {selPost.stato !== 'libero' && selPost.data_inizio && (
              <div style={{
                background: selPost.temporanea ? '#fffde7' : '#f0f4ff',
                border: `1.5px solid ${selPost.temporanea ? '#ffe082' : '#dde8ff'}`,
                borderRadius: 10, padding: '10px 14px', marginBottom: 14,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  {selPost.temporanea && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#b8860b', textTransform: 'uppercase', marginBottom: 4 }}>⏳ Temporanea</div>
                  )}
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>
                    {fmtDate(selPost.data_inizio)} → {fmtDate(selPost.data_fine)}
                  </div>
                </div>
                {selPost.temporanea && selPost.data_fine && (() => {
                  const giorni = Math.ceil((new Date(selPost.data_fine) - new Date()) / (1000 * 60 * 60 * 24))
                  return (
                    <div style={{ textAlign: 'center', background: giorni < 0 ? 'var(--red)' : '#ffe082', borderRadius: 8, padding: '6px 12px', flexShrink: 0 }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: giorni < 0 ? '#fff' : 'var(--navy)', lineHeight: 1 }}>{Math.abs(giorni)}</div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: giorni < 0 ? '#fff' : '#b8860b', textTransform: 'uppercase', marginTop: 2 }}>
                        {giorni < 0 ? 'scaduta' : 'giorni'}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Info subaffitto */}
            {selPost.tipo_occupazione === 'subaffitto' && !pagMode && !confirmLibera && !subForm && !dispForm && !confirmAnnulla && (
              <div style={{ background: '#f5f0ff', border: '1.5px solid #c4b5fd', borderRadius: 10, padding: '14px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 8 }}>Subaffittuario</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)', marginBottom: 6 }}>
                  👤 {selPost.subaffittuario || '—'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
                  📅 {fmtDate(selPost.data_inizio)} → {fmtDate(selPost.data_fine)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Stagionale: <strong>{selPost.cliente || '—'}</strong>
                </div>
              </div>
            )}

            {/* Info disponibile per subaffitto */}
            {(selPost.tipo_occupazione === 'subaffitto_disponibile' || selPost.tipo_occupazione === 'disponibile') && !pagMode && !confirmLibera && !subForm && !dispForm && !confirmAnnulla && (
              <div style={{ background: '#e0f2fe', border: '1.5px solid #7dd3fc', borderRadius: 10, padding: '14px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: 8 }}>Disponibile per subaffitto</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>
                  📅 {fmtDate(selPost.data_inizio)} → {fmtDate(selPost.data_fine)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: selPost.note ? 6 : 0 }}>
                  Stagionale: <strong>{selPost.cliente || '—'}</strong>
                </div>
                {selPost.note && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginTop: 4 }}>
                    📝 {selPost.note}
                  </div>
                )}
              </div>
            )}

            {/* Form subaffitta */}
            {subForm && !pagMode && !confirmLibera && (
              <div style={{ background: '#f5f0ff', border: '1.5px solid #c4b5fd', borderRadius: 10, padding: '14px', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', marginBottom: 12 }}>🟣 Registra subaffitto</div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11 }}>Nome subaffittuario</label>
                  <input type="text" value={subForm.subaffittuario}
                    onChange={e => setSubForm(f => ({ ...f, subaffittuario: e.target.value }))}
                    placeholder="es. ROSSI MARIO"
                    style={{ fontSize: 14, textTransform: 'uppercase' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 11 }}>Dal</label>
                    <input type="date" value={subForm.data_inizio}
                      onChange={e => setSubForm(f => ({ ...f, data_inizio: e.target.value }))}
                      style={{ fontSize: 13 }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 11 }}>Al</label>
                    <input type="date" value={subForm.data_fine} min={subForm.data_inizio}
                      onChange={e => setSubForm(f => ({ ...f, data_fine: e.target.value }))}
                      style={{ fontSize: 13 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }} onClick={() => setSubForm(null)}>
                    Annulla
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 2, justifyContent: 'center', fontSize: 13, background: '#8b5cf6', opacity: saving || !subForm.subaffittuario || !subForm.data_inizio || !subForm.data_fine ? .6 : 1 }}
                    disabled={saving || !subForm.subaffittuario || !subForm.data_inizio || !subForm.data_fine}
                    onClick={handleSubaffitta}
                  >
                    {saving ? '⏳...' : '💾 Salva subaffitto'}
                  </button>
                </div>
              </div>
            )}

            {/* Form segna disponibile per subaffitto */}
            {dispForm && !pagMode && !confirmLibera && (
              <div style={{ background: '#e0f2fe', border: '1.5px solid #7dd3fc', borderRadius: 10, padding: '14px', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0284c7', marginBottom: 12 }}>🔵 Segna disponibile per subaffitto</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 11 }}>Dal</label>
                    <input type="date" value={dispForm.data_inizio}
                      onChange={e => setDispForm(f => ({ ...f, data_inizio: e.target.value }))}
                      style={{ fontSize: 13 }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 11 }}>Al</label>
                    <input type="date" value={dispForm.data_fine} min={dispForm.data_inizio}
                      onChange={e => setDispForm(f => ({ ...f, data_fine: e.target.value }))}
                      style={{ fontSize: 13 }} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11 }}>Note (opzionale)</label>
                  <input type="text" value={dispForm.note}
                    onChange={e => setDispForm(f => ({ ...f, note: e.target.value }))}
                    placeholder="es. disponibile per famiglia"
                    style={{ fontSize: 13 }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }} onClick={() => setDispForm(null)}>
                    Annulla
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 2, justifyContent: 'center', fontSize: 13, background: '#0ea5e9', opacity: saving || !dispForm.data_inizio || !dispForm.data_fine ? .6 : 1 }}
                    disabled={saving || !dispForm.data_inizio || !dispForm.data_fine}
                    onClick={handleSegnaDisponibile}
                  >
                    {saving ? '⏳...' : '💾 Conferma'}
                  </button>
                </div>
              </div>
            )}

            {/* Conferma annulla sub/disp */}
            {confirmAnnulla && (
              <div>
                <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--navy)', marginBottom: 6 }}>
                  Annullare {selPost.tipo_occupazione === 'subaffitto' ? `il subaffitto a ${selPost.subaffittuario}` : 'la disponibilità per subaffitto'}?
                </p>
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
                  La postazione tornerà al cliente stagionale.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmAnnulla(false)}>
                    Indietro
                  </button>
                  <button
                    className="btn"
                    style={{ flex: 1, justifyContent: 'center', background: selPost.tipo_occupazione === 'subaffitto' ? '#8b5cf6' : '#0ea5e9', color: '#fff' }}
                    disabled={saving}
                    onClick={handleAnnullaSubDisp}
                  >
                    {saving ? '...' : '✓ Conferma'}
                  </button>
                </div>
              </div>
            )}

            {/* Dettagli occupazione — solo per stagionale/temporanea */}
            {selPost.stato === 'occupato' && !pagMode && !confirmLibera && !subForm && !dispForm && !confirmAnnulla &&
             selPost.tipo_occupazione !== 'subaffitto' && selPost.tipo_occupazione !== 'subaffitto_disponibile' && selPost.tipo_occupazione !== 'disponibile' && (
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

                {/* Riepilogo pagamenti — solo admin */}
                {isAdmin && (
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
                )}
              </div>
            )}

            {/* Timeline prenotazioni — con modifica/elimina per singola */}
            {!pagMode && !confirmLibera && !editPren && !subForm && !dispForm && !confirmAnnulla &&
             selPost.prenotazioni?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                  📅 Prenotazioni ({selPost.prenotazioni.length})
                </div>
                {selPost.prenotazioni.map(pr => (
                  <div key={pr.id} style={{
                    borderRadius: 8, marginBottom: 6,
                    background: pr.id === selPost.occ_id ? '#e8f0ff' : '#f7f9ff',
                    border: `1px solid ${pr.id === selPost.occ_id ? '#c5d5f5' : '#eee'}`,
                    overflow: 'hidden',
                  }}>
                    {deletingPrenId === pr.id ? (
                      <div style={{ padding: '10px 12px' }}>
                        <div style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 600, marginBottom: 8 }}>
                          Eliminare la prenotazione di <strong>{pr.cliente}</strong>?
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }} onClick={() => setDeletingPrenId(null)}>
                            Annulla
                          </button>
                          <button
                            className="btn"
                            style={{ flex: 1, justifyContent: 'center', fontSize: 13, background: 'var(--red)', color: '#fff' }}
                            disabled={saving}
                            onClick={() => handleDeletePren(pr.id)}
                          >
                            {saving ? '...' : '🗑 Elimina'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            {pr.tipo_occupazione === 'subaffitto'
                              ? (pr.subaffittuario || pr.cliente || '—')
                              : (pr.cliente || '—')}
                            {pr.id === selPost.occ_id && <span style={{ fontSize: 10, color: 'var(--sky)', fontWeight: 600 }}>● oggi</span>}
                            {pr.temporanea && <span className="badge badge-yellow" style={{ fontSize: 10 }}>temp</span>}
                            {pr.tipo_occupazione === 'subaffitto' && <span className="badge badge-purple" style={{ fontSize: 10 }}>subaffitto</span>}
                            {(pr.tipo_occupazione === 'disponibile' || pr.tipo_occupazione === 'subaffitto_disponibile') && <span className="badge badge-sky" style={{ fontSize: 10 }}>disponibile</span>}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDate(pr.data_inizio)} → {fmtDate(pr.data_fine)}</div>
                        </div>
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button
                              onClick={() => setEditPren({ ...pr, prezzo_totale: pr.prezzo_totale != null ? String(pr.prezzo_totale) : '' })}
                              style={{ background: '#f0f4ff', border: '1px solid #dde8ff', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 15, lineHeight: 1, minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Modifica"
                            >✏️</button>
                            <button
                              onClick={() => setDeletingPrenId(pr.id)}
                              style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 15, lineHeight: 1, minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Elimina"
                            >🗑</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Form modifica prenotazione */}
            {editPren && !pagMode && !confirmLibera && (
              <div style={{ background: '#f0f4ff', borderRadius: 10, padding: '14px', border: '1px solid #dde8ff', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>✏️ Modifica prenotazione</div>

                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11 }}>Cliente</label>
                  <input type="text" value={editPren.cliente || ''}
                    onChange={e => setEditPren(f => ({ ...f, cliente: e.target.value }))}
                    style={{ fontSize: 14, textTransform: 'uppercase' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 11 }}>Inizio</label>
                    <input type="date" value={editPren.data_inizio}
                      onChange={e => setEditPren(f => ({ ...f, data_inizio: e.target.value }))}
                      style={{ fontSize: 13 }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 11 }}>Fine</label>
                    <input type="date" value={editPren.data_fine} min={editPren.data_inizio}
                      onChange={e => setEditPren(f => ({ ...f, data_fine: e.target.value }))}
                      style={{ fontSize: 13 }} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11 }}>Prezzo totale (€)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 700, fontSize: 13, pointerEvents: 'none' }}>€</span>
                    <input type="number" min="0" step="0.01" value={editPren.prezzo_totale}
                      onChange={e => setEditPren(f => ({ ...f, prezzo_totale: e.target.value }))}
                      placeholder="0.00" style={{ paddingLeft: 22, fontSize: 14 }} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11 }}>Note</label>
                  <input type="text" value={editPren.note || ''}
                    onChange={e => setEditPren(f => ({ ...f, note: e.target.value }))}
                    style={{ fontSize: 13 }} />
                </div>

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fffde7', borderRadius: 8, border: '1px solid #ffe082', marginBottom: 12, cursor: 'pointer' }}
                  onClick={() => setEditPren(f => ({ ...f, temporanea: !f.temporanea }))}
                >
                  <input type="checkbox" checked={!!editPren.temporanea}
                    onChange={e => setEditPren(f => ({ ...f, temporanea: e.target.checked }))}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 16, height: 16, accentColor: '#f0c030', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>⏳ Prenotazione temporanea</span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }} onClick={() => setEditPren(null)}>
                    Annulla
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 2, justifyContent: 'center', fontSize: 13, opacity: saving ? .7 : 1 }}
                    disabled={saving || !editPren.cliente || !editPren.data_inizio || !editPren.data_fine}
                    onClick={handleUpdatePren}
                  >
                    {saving ? '⏳...' : '💾 Salva modifiche'}
                  </button>
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
                    { label: 'Prezzo',  val: selPost?.prezzo_totale || 0, color: 'var(--navy)' },
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
              isAdmin ? (
                <button
                  className="btn btn-yellow btn-lg"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    closeModal()
                    onNavigatePrenota
                      ? onNavigatePrenota(selPost.id, filterActive ? filterDateInizio : null, filterActive ? filterDateFine : null)
                      : onNavigate && onNavigate('prenota')
                  }}
                >
                  {filterActive
                    ? `➕ Prenota ${filterDateInizio.split('-').reverse().join('/')} → ${filterDateFine.split('-').reverse().join('/')}`
                    : '➕ Prenota questa postazione'}
                </button>
              ) : (
                <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={closeModal}>
                  Chiudi
                </button>
              )
            ) : !pagMode && !confirmLibera && !subForm && !dispForm && !confirmAnnulla ? (
              isAdmin ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Bottoni per subaffitto/disponibile */}
                  {(selPost.tipo_occupazione === 'subaffitto' || selPost.tipo_occupazione === 'subaffitto_disponibile' || selPost.tipo_occupazione === 'disponibile') && (
                    <>
                      {(selPost.tipo_occupazione === 'subaffitto_disponibile' || selPost.tipo_occupazione === 'disponibile') && (
                        <>
                          <button
                            className="btn btn-yellow btn-lg"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => {
                              closeModal()
                              onNavigatePrenota
                                ? onNavigatePrenota(selPost.id, selPost.data_inizio, selPost.data_fine)
                                : onNavigate && onNavigate('prenota')
                            }}
                          >
                            ➕ Prenota su questi giorni
                          </button>
                          <button
                            className="btn"
                            style={{ width: '100%', justifyContent: 'center', background: '#8b5cf6', color: '#fff' }}
                            onClick={() => setSubForm({ subaffittuario: '', data_inizio: selPost.data_inizio, data_fine: selPost.data_fine })}
                          >
                            🟣 Registra subaffittuario
                          </button>
                        </>
                      )}
                      <button
                        className="btn"
                        style={{ width: '100%', justifyContent: 'center', background: selPost.tipo_occupazione === 'subaffitto' ? '#8b5cf6' : '#0ea5e9', color: '#fff' }}
                        onClick={() => setConfirmAnnulla(true)}
                      >
                        ✕ Annulla {selPost.tipo_occupazione === 'subaffitto' ? 'subaffitto' : 'disponibilità'}
                      </button>
                      <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', color: 'var(--muted)', borderColor: '#ddd' }} onClick={closeModal}>
                        Chiudi
                      </button>
                    </>
                  )}

                  {/* Bottoni per stagionale/temporanea */}
                  {selPost.tipo_occupazione !== 'subaffitto' && selPost.tipo_occupazione !== 'subaffitto_disponibile' && selPost.tipo_occupazione !== 'disponibile' && (
                    <>
                      {selPost.data_fine < '2026-09-30' && (
                        <button
                          className="btn btn-yellow btn-lg"
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={() => { closeModal(); onNavigatePrenota ? onNavigatePrenota(selPost.id) : onNavigate && onNavigate('prenota') }}
                        >
                          ➕ Aggiungi prenotazione
                        </button>
                      )}
                      <button
                        className="btn"
                        style={{ width: '100%', justifyContent: 'center', background: '#8b5cf6', color: '#fff' }}
                        onClick={() => setSubForm({ subaffittuario: '', data_inizio: '', data_fine: '' })}
                      >
                        🟣 Subaffitta direttamente
                      </button>
                      <button
                        className="btn"
                        style={{ width: '100%', justifyContent: 'center', background: '#0ea5e9', color: '#fff' }}
                        onClick={() => setDispForm({ data_inizio: '', data_fine: '', note: '' })}
                      >
                        🔵 Segna disponibile per subaffitto
                      </button>
                      <button
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => { setPagMode(true); setShowAddForm(true) }}
                      >
                        💰 Aggiungi acconto
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => setPagMode(true)}
                      >
                        💳 Gestisci pagamenti
                      </button>
                      <button
                        className="btn"
                        style={{ width: '100%', justifyContent: 'center', background: 'var(--red)', color: '#fff' }}
                        onClick={() => setConfirmLibera(true)}
                      >
                        🗑 Elimina prenotazione oggi
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ width: '100%', justifyContent: 'center', color: 'var(--muted)', borderColor: '#ddd' }}
                        onClick={closeModal}
                      >
                        Chiudi
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={closeModal}>
                  Chiudi
                </button>
              )
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  )
}
