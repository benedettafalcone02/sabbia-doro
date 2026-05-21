import styles from './Navbar.module.css'

const PAGES = [
  { id: 'dashboard', label: 'Home', icon: '🏠' },

  { id: 'disponibilita', label: 'Dispon.', icon: '🔍' },

  { id: 'prenotazioni', label: 'Prenota', icon: '➕' },

  { id: 'clienti', label: 'Clienti', icon: '👤' },

  { id: 'admin', label: 'Gestione', icon: '⚙️' },
]

export default function Navbar({ activePage, onNavigate, onLogout }) {
  return (
    <>
      {/* ── NAVBAR TOP ── */}
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <img src="/logosabbiadoro.png" alt="Sabbia d'Oro" className={styles.logoImg} />
        </div>

        {/* Desktop links */}
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

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      <div className={styles.mobileNav}>
        {PAGES.map(p => (
          <button
            key={p.id}
            className={`${styles.mobileTab} ${activePage === p.id ? styles.active : ''}`}
            onClick={() => onNavigate(p.id)}
          >
            <span className={styles.mobileIcon}>{p.icon}</span>
            <span className={styles.mobileLabel}>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Spacer per non finire sotto la tab bar */}
      <div className={styles.bodyPad} />
    </>
  )
}
