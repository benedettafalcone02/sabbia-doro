import styles from './Navbar.module.css'

// mobileTab: true  → appears in the bottom tab bar on mobile
// mobileTab: false → desktop nav only (use for low-frequency pages)
const PAGES = [
  { id: 'dashboard',     label: 'Home',     icon: '🏠', mobileTab: true  },
  { id: 'disponibilita', label: 'Dispon.',  icon: '🔍', mobileTab: true  },
  { id: 'prenota',       label: 'Prenota',  icon: '➕', mobileTab: true  },
  { id: 'mappa',         label: 'Mappa',    icon: '🗺',  mobileTab: true  },
  { id: 'clienti',       label: 'Clienti',  icon: '👤', mobileTab: true  },
  { id: 'admin',         label: 'Gestione', icon: '⚙️', mobileTab: false },
]

export default function Navbar({ activePage, onNavigate, onLogout }) {
  return (
    <>
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <img src="/logosabbiadoro.png" alt="Sabbia d'Oro" className={styles.logoImg} />
        </div>

        {/* Desktop links — all pages */}
        <div className={styles.links}>
          {PAGES.map(p => (
            <button
              key={p.id}
              className={`${styles.navBtn} ${activePage === p.id ? styles.active : ''}`}
              onClick={() => onNavigate(p.id)}
            >
              <span className={styles.icon}>{p.icon}</span>
              <span className={styles.label}>{p.label}</span>
            </button>
          ))}
        </div>

        <button className={styles.logoutBtn} onClick={onLogout}>Esci</button>
      </nav>

      {/* Mobile bottom tab bar — mobileTab: true pages only */}
      <div className={styles.mobileNav}>
        {PAGES.filter(p => p.mobileTab).map(p => (
          <button
            key={p.id}
            className={`${styles.mobileTab} ${activePage === p.id ? styles.active : ''}`}
            onClick={() => onNavigate(p.id)}
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
