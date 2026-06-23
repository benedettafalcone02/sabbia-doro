import { useState } from 'react'
import styles from './Navbar.module.css'

const PAGES = [
  { id: 'dashboard',     label: 'Home',       icon: '🏠', mobileTab: true  },
  { id: 'calendario',    label: 'Calendario', icon: '📅', mobileTab: true  },
  { id: 'prenota',       label: 'Prenota',    icon: '➕', mobileTab: true  },
  { id: 'mappa',         label: 'Mappa',      icon: '🗺',  mobileTab: true  },
  { id: 'clienti',       label: 'Clienti',    icon: '👤', mobileTab: true  },
  { id: 'disponibilita', label: 'Dispon.',    icon: '🔍', mobileTab: false },
  { id: 'storico',       label: 'Storico',    icon: '💰', mobileTab: false },
  { id: 'admin',         label: 'Gestione',   icon: '⚙️', mobileTab: false },
]

export default function Navbar({ activePage, onNavigate, onLogout, role }) {
  const [moreOpen, setMoreOpen] = useState(false)

  const visibili = role === 'spiaggista'
    ? PAGES.filter(p => p.id === 'mappa' || p.id === 'clienti')
    : PAGES

  const mobileTabs = visibili.filter(p => p.mobileTab)
  const morePages  = visibili.filter(p => !p.mobileTab)
  const moreIsActive = morePages.some(p => p.id === activePage)

  function handleNavigate(id) {
    setMoreOpen(false)
    onNavigate(id)
  }

  return (
    <>
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <img src="/logosabbiadoro.png" alt="Sabbia d'Oro" className={styles.logoImg} />
        </div>

        <div className={styles.links}>
          {visibili.map(p => (
            <button
              key={p.id}
              className={`${styles.navBtn} ${activePage === p.id ? styles.active : ''}`}
              onClick={() => handleNavigate(p.id)}
            >
              <span className={styles.icon}>{p.icon}</span>
              <span className={styles.label}>{p.label}</span>
            </button>
          ))}
        </div>

        {role !== 'spiaggista' && <button className={styles.logoutBtn} onClick={onLogout}>Esci</button>}
      </nav>

      {/* Overlay "Altro" su mobile */}
      {moreOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 199 }}
          onClick={() => setMoreOpen(false)}
        >
          <div
            style={{
              position: 'fixed', bottom: 'calc(68px + env(safe-area-inset-bottom))',
              left: 0, right: 0, zIndex: 200,
              background: '#fff',
              borderRadius: '16px 16px 0 0',
              boxShadow: '0 -4px 24px rgba(0,0,0,.14)',
              borderTop: '1px solid #f0f0f0',
              padding: '8px 12px 4px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, background: '#e0e0e0', borderRadius: 2, margin: '0 auto 12px' }} />
            {morePages.map(p => (
              <button
                key={p.id}
                onClick={() => handleNavigate(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  width: '100%', padding: '14px 8px',
                  background: activePage === p.id ? '#f0f4ff' : 'none',
                  border: 'none', borderRadius: 12,
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  fontSize: 15, fontWeight: activePage === p.id ? 700 : 500,
                  color: activePage === p.id ? 'var(--navy)' : 'var(--text)',
                  borderBottom: '1px solid #f5f5f5',
                }}
              >
                <span style={{ fontSize: 22, width: 32, textAlign: 'center' }}>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.mobileNav}>
        {mobileTabs.map(p => (
          <button
            key={p.id}
            className={`${styles.mobileTab} ${activePage === p.id ? styles.active : ''}`}
            onClick={() => handleNavigate(p.id)}
          >
            <div className={styles.mobileIconWrap}>
              <span className={styles.mobileIcon}>{p.icon}</span>
            </div>
            <span className={styles.mobileLabel}>{p.label}</span>
          </button>
        ))}

        {morePages.length > 0 && (
          <button
            className={`${styles.mobileTab} ${(moreIsActive || moreOpen) ? styles.active : ''}`}
            onClick={() => setMoreOpen(o => !o)}
          >
            <div className={styles.mobileIconWrap}>
              <span className={styles.mobileIcon} style={{ fontSize: 18, letterSpacing: -1 }}>···</span>
            </div>
            <span className={styles.mobileLabel}>Altro</span>
          </button>
        )}
      </div>
      <div className={styles.bodyPad} />
    </>
  )
}
