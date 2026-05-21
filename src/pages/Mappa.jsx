import { useState, useCallback } from 'react'
import Modal from '../components/Modal'
import { getStatoBadgeClass, getStatoLabel, fmtEur } from '../lib/data'
import styles from './Mappa.module.css'

const FILTRI = [
  { id: 'tutti',       label: 'Tutti' },
  { id: 'palme',       label: '🌴 Palme' },
  { id: 'ombrelloni',  label: '☂ Ombrelloni' },
  { id: 'liberi',      label: '🟢 Liberi' },
  { id: 'occupati',    label: '🔴 Occupati' },
]

export default function Mappa({ db, onNuovaPrenotazione }) {
  const { postazioni, prenotazioni, clienti } = db
  const [filtro, setFiltro] = useState('tutti')
  const [selected, setSelected] = useState(null)

  const isVisible = useCallback((p) => {
    if (filtro === 'palme')      return p.tipo === 'palma'
    if (filtro === 'ombrelloni') return p.tipo === 'ombrellone'
    if (filtro === 'liberi')     return p.stato === 'libero'
    if (filtro === 'occupati')   return p.stato !== 'libero'
    return true
  }, [filtro])

  function renderRigaOmbrelloni(fila, settore, cls) {
    const items = postazioni
      .filter(p => p.tipo === 'ombrellone' && p.settore === settore && p.fila === fila)
      .sort((a, b) => a.col - b.col)

    return (
      <div key={`${settore}-${fila}`} className={styles.row}>
        <div className={styles.rowLabel}>F{fila}</div>
        <div className={styles.rowItems}>
          {items.map((p, idx) => (
            <>
              {idx === 8 && <div key={`pass-${fila}`} className={styles.passerella} />}
              <div
                key={p.id}
                className={`${styles.postazione} ${styles[cls]} ${styles[p.stato]} ${!isVisible(p) ? styles.hidden : ''}`}
                title={`Ombr. ${p.numero} S.${p.settore} F${p.fila}`}
                onClick={() => isVisible(p) && setSelected(p.id)}
              >
                {p.numero}
              </div>
            </>
          ))}
        </div>
      </div>
    )
  }

  const selPost = selected ? postazioni.find(p => p.id === selected) : null
  const selPren = selPost?.prenotazione_id ? prenotazioni.find(r => r.id === selPost.prenotazione_id) : null
  const selCl   = selPren ? clienti.find(c => c.id === selPren.cliente_id) : null

  return (
    <div className="page-content">
      <h1 className="page-title">Mappa Interattiva</h1>

      <div className={styles.controls}>
        {/* Legenda */}
        <div className={styles.legenda}>
          <div className={styles.legItem}><div className={styles.dot} style={{ background: '#27ae60' }} />Libero</div>
          <div className={styles.legItem}><div className={styles.dot} style={{ background: 'var(--red)' }} />Occupato</div>
          <div className={styles.legItem}><div className={styles.dot} style={{ background: 'var(--orange)' }} />Acconto versato</div>
        </div>
        {/* Filtri */}
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
        <div className={styles.scrollHint}>← scorri per vedere tutta la mappa →</div>

        {/* PALME */}
        <div className={styles.sezione}>
          <div className={styles.sezLabel}>🌴 Palme — Settore Premium (84)</div>
          {[1,2,3,4,5,6].map(fila => {
            const items = postazioni
              .filter(p => p.tipo === 'palma' && p.fila === fila)
              .sort((a, b) => a.col - b.col)
            return (
              <div key={fila} className={styles.row}>
                <div className={styles.rowLabel}>F{fila}</div>
                <div className={styles.rowItems}>
                  {items.map(p => (
                    <div
                      key={p.id}
                      className={`${styles.postazione} ${styles.palma} ${styles[p.stato]} ${!isVisible(p) ? styles.hidden : ''}`}
                      title={`Palma ${p.numero} F${p.fila} — ${fmtEur(p.prezzo_stagionale)}`}
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

        {/* OMBRELLONI A */}
        <div className={styles.sezione}>
          <div className={styles.sezLabel}>☂ Settore A — File 1–6</div>
          {[1,2,3,4,5,6].map(f => renderRigaOmbrelloni(f, 'A', 'ombrA'))}
        </div>

        {/* OMBRELLONI B */}
        <div className={styles.sezione}>
          <div className={styles.sezLabel}>☂ Settore B — File 7–13</div>
          {[7,8,9,10,11,12,13].map(f => renderRigaOmbrelloni(f, 'B', 'ombrB'))}
        </div>
      </div>

      {/* POPUP POSTAZIONE */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selPost
          ? selPost.tipo === 'palma'
            ? `🌴 Palma ${selPost.numero} — Fila ${selPost.fila}`
            : `☂ Ombrellone ${selPost.numero} Sett.${selPost.settore} — Fila ${selPost.fila}`
          : ''}
        size="modal-sm"
      >
        {selPost && (
          <div>
            {/* Info prezzi */}
            <div style={{
              background: '#f7f9ff',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 16,
              fontSize: 13,
              fontWeight: 500
            }}>
              {selPost.tipo === 'palma' ? (
                <div>Stagionale: <strong style={{ color: 'var(--navy)', fontSize: 15 }}>{fmtEur(selPost.prezzo_stagionale)}</strong>
                  <span style={{ color: 'var(--muted)', marginLeft: 8 }}>· 3 lettini + regista</span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div>2 Lettini: <strong style={{ color: 'var(--navy)' }}>{fmtEur(selPost.prezzo_2lettini)}</strong></div>
                  <div>Lett.+Regista: <strong style={{ color: 'var(--navy)' }}>{fmtEur(selPost.prezzo_lettino_regista)}</strong></div>
                </div>
              )}
            </div>

            {/* Stato */}
            <div style={{ marginBottom: 14 }}>
              <span className={`badge ${selPost.stato === 'libero' ? 'badge-green' : selPost.stato === 'acconto' ? 'badge-orange' : 'badge-red'}`}>
                {selPost.stato === 'libero' ? '🟢 Libero' : selPost.stato === 'acconto' ? '🟠 Acconto versato' : '🔴 Occupato'}
              </span>
            </div>

            {/* Info prenotazione se occupato */}
            {/* Info occupazione */}
{selPost.stato === 'occupato' && (
  <div
    style={{
      background: '#f0f4ff',
      borderRadius: 10,
      padding: '14px 16px',
      marginBottom: 16,
      border: '1px solid #dde8ff'
    }}
  >
    <div
      style={{
        fontWeight: 700,
        fontSize: 15,
        color: 'var(--navy)',
        marginBottom: 10
      }}
    >
      👤 {selPost.cliente || 'Cliente non disponibile'}
    </div>

    <div style={{ fontSize: 14, lineHeight: 1.8 }}>
      ☀️ Lettini: <strong>{selPost.lettini > 0 ? selPost.lettini : "—"}</strong>
      <br />

      🪑 Sdraio: <strong>{selPost.sdraio > 0 ? selPost.sdraio : "—"}</strong>
      <br />

      🎬 Regista: <strong>{selPost.regista > 0 ? selPost.regista : "—"}</strong>
    </div>
  </div>
)}

            {/* Azioni */}
            {selPost.stato === 'libero' ? (
              <button
                className="btn btn-yellow btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { onNuovaPrenotazione(selPost.id); setSelected(null) }}
              >
                + Prenota questa postazione
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => { onNuovaPrenotazione(selPost.id, selPren?.id); setSelected(null) }}
                >
                  ✏ Modifica
                </button>
                <button
                  className="btn btn-yellow"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => { /* TODO: pagamento */ setSelected(null) }}
                >
                  💳 Pagamento
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
