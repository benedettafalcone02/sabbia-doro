import { useState } from 'react'
import styles from './Navbar.module.css'

const PAGES = [
  { id: 'dashboard',     label: 'Home',       icon: '🏠', mobileTab: true  },
  { id: 'calendario',    label: 'Calendario', icon: '📅', mobileTab: true  },
  { id: 'prenota',       label: 'Prenota',    icon: '➕', mobileTab: true  },
  { id: 'mappa',         label: 'Mappa',      icon: '🗺',  mobileTab: true  },
  { id: 'clienti',       label: 'Clienti',    icon: '👤', mobileTab: true  },
  { id: 'disponibilita', label: 'Disponibilità', icon: '🔍', mobileTab: false },
  { id: 'storico',       label: 'Storico',       icon: '💰', mobileTab: false },
  { id: 'admin',         label: 'Gestione',      icon: '⚙️', mobileTab: false },
]

export default function Navbar({ activePage, onNavigate, onLogout, role }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const visibili = role === 'spiaggista'
    ? PAGES.filter(p => p.id === 'mappa' || p.id === 'clienti')
    : PAGES

  const mobileTabs = visibili.filter(p => p.mobileTab)
  const menuPages  = visibili.filter(p => !p.mobileTab)

  function handleNavigate(id) {
    setMenuOpen(false)
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

        {/* Desktop: solo Esci */}
        {role !== 'spiaggista' && (
          <button className={`${styles.logoutBtn} ${styles.desktopOnly}`} onClick={onLogout}>Esci</button>
        )}

        {/* Mobile: menu ⋮ */}
        {role !== 'spiaggista' && (
          <div style={{ position: 'relative', marginLeft: 'auto' }} className={styles.mobileOnly}>
            <button
              className={styles.menuBtn}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu"
            >
              ⋮
            </button>

            {menuOpen && (
              <>
                {/* Backdrop */}
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 299 }}
                  onClick={() => setMenuOpen(false)}
                />
                {/* Dropdown */}
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 300,
                  background: '#fff', borderRadius: 14,
                  boxShadow: '0 8px 32px rgba(0,0,0,.16)',
                  border: '1px solid #f0f0f0',
                  minWidth: 200, overflow: 'hidden',
                }}>
                  {menuPages.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => handleNavigate(p.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        width: '100%', padding: '14px 16px',
                        background: activePage === p.id ? '#f0f4ff' : 'none',
                        border: 'none',
                        borderBottom: i < menuPages.length - 1 ? '1px solid #f5f5f5' : 'none',
                        cursor: 'pointer', fontFamily: 'var(--font-body)',
                        fontSize: 15, fontWeight: activePage === p.id ? 700 : 500,
                        color: activePage === p.id ? 'var(--navy)' : 'var(--text)',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{p.icon}</span>
                      {p.label}
                    </button>
                  ))}
                  {/* Separatore + Esci */}
                  <button
                    onClick={() => { setMenuOpen(false); onLogout() }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '14px 16px',
                      background: 'none', border: 'none',
                      borderTop: '1.5px solid #f0f0f0',
                      cursor: 'pointer', fontFamily: 'var(--font-body)',
                      fontSize: 15, fontWeight: 500,
                      color: 'var(--red)', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>🚪</span>
                    Esci
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Bottom tab bar — solo 5 tab principali */}
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
      </div>
      <div className={styles.bodyPad} />
    </>
  )
}
