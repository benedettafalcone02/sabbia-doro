import { useState, useCallback, Fragment } from 'react'
import Modal from '../components/Modal'
import { fmtEur } from '../lib/data'
import styles from './Mappa.module.css'

const FILTRI = [
  { id: 'tutti',      label: 'Tutti' },
  { id: 'palme',      label: '🌴 Palme' },
  { id: 'ombrelloni', label: '☂ Ombrelloni' },
  { id: 'liberi',     label: '🟢 Liberi' },
  { id: 'occupati',   label: '🔴 Occupati' },
]

const loadingPlaceholder = (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '60vh', flexDirection: 'column', gap: 12, color: 'var(--muted)' }}>
    <div style={{ fontSize: 40 }}>🌊</div>
    <div style={{ fontWeight: 600, fontSize: 15 }}>Caricamento dati...</div>
  </div>
)

// showToast used in upcoming "libera postazione" feature (Phase 1.5)
// eslint-disable-next-line no-unused-vars
export default function Mappa({ db, onNavigate, showToast }) {
  const { postazioni, loading } = db
  const [filtro, setFiltro] = useState('tutti')
  const [selected, setSelected] = useState(null)

  const isVisible = useCallback((p) => {
    if (filtro === 'palme')      return p.tipo === 'palma'
    if (filtro === 'ombrelloni') return p.tipo === 'ombrellone'
    if (filtro === 'liberi')     return p.stato === 'libero'
    if (filtro === 'occupati')   return p.stato !== 'libero'
    return true
  }, [filtro])

  if (loading) return loadingPlaceholder

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
        onClose={() => setSelected(null)}
        title={selPost ? (selPost.tipo === 'palma' ? `🌴 Palma ${selPost.numero} · F${selPost.fila}` : `☂ Ombr. ${selPost.numero} S.${selPost.settore} · F${selPost.fila}`) : ''}
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
              </div>
            )}

            {selPost.stato === 'libero' ? (
              <button
                className="btn btn-yellow btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { setSelected(null); onNavigate && onNavigate('prenota') }}
              >
                ➕ Prenota questa postazione
              </button>
            ) : (
              <button
                className="btn btn-outline"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setSelected(null)}
              >
                Chiudi
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
