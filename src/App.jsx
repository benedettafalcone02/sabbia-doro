import { useState } from 'react'
import './styles/global.css'

import { useStore }     from './hooks/useStore'
import { useToast }     from './hooks/useToast'
import { isConfigured } from './lib/supabase'

import Login         from './pages/Login'
import Navbar        from './components/Navbar'
import Dashboard     from './pages/Dashboard'
import Mappa         from './pages/Mappa'
import Prenota       from './pages/Prenota'
import Clienti       from './pages/Clienti'
import Disponibilita from './pages/Disponibilita'
import Admin         from './pages/Admin'
import Toast         from './components/Toast'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [page, setPage]         = useState('dashboard')
  const { db, reload }          = useStore()
  const { toast, showToast }    = useToast()

  // Guards after all hooks (Rules of Hooks requires unconditional hook calls)
  if (!isConfigured) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 12, fontFamily: 'var(--font-body)', color: 'var(--muted)', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>⚙️</div>
      <h2 style={{ color: 'var(--navy)', fontFamily: 'var(--font-display)', fontSize: 22 }}>Configurazione mancante</h2>
      <p style={{ fontSize: 14, maxWidth: 380, lineHeight: 1.6 }}>
        Crea un file <code style={{ background: '#f0f2f5', padding: '2px 6px', borderRadius: 4 }}>.env</code> con{' '}
        <code style={{ background: '#f0f2f5', padding: '2px 6px', borderRadius: 4 }}>VITE_SUPABASE_URL</code> e{' '}
        <code style={{ background: '#f0f2f5', padding: '2px 6px', borderRadius: 4 }}>VITE_SUPABASE_ANON_KEY</code>.
      </p>
    </div>
  )

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />

  return (
    <>
      <Navbar activePage={page} onNavigate={setPage} onLogout={() => setLoggedIn(false)} />

      {page === 'dashboard'     && <Dashboard     db={db} onNavigate={setPage} />}
      {page === 'mappa'         && <Mappa          db={db} onNavigate={setPage} showToast={showToast} />}
      {page === 'prenota'       && <Prenota        db={db} showToast={showToast} onReload={reload} />}
      {page === 'clienti'       && <Clienti        db={db} />}
      {page === 'disponibilita' && <Disponibilita  db={db} />}
      {page === 'admin'         && <Admin          onReload={reload} />}

      <Toast toast={toast} />
    </>
  )
}
