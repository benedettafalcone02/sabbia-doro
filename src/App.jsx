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
import NuovoCliente  from './pages/NuovoCliente'
import Disponibilita from './pages/Disponibilita'
import Admin         from './pages/Admin'
import Toast         from './components/Toast'

export default function App() {
  const [role, setRole] = useState(null)
  const [page, setPage] = useState('dashboard')
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

  if (!role) return <Login onLogin={setRole} />

  const isAdmin = role === 'admin'

  return (
    <>
      <Navbar activePage={page} onNavigate={setPage} onLogout={() => setRole(null)} role={role} />

      {isAdmin && page === 'dashboard'     && <Dashboard     db={db} onNavigate={setPage} />}
      {page === 'mappa'                    && <Mappa          db={db} onNavigate={setPage} showToast={showToast} onReload={reload} role={role} />}
      {isAdmin && page === 'prenota'       && <Prenota        db={db} showToast={showToast} onReload={reload} />}
      {isAdmin && page === 'clienti'       && <Clienti        db={db} onNavigate={setPage} showToast={showToast} onReload={reload} />}
      {isAdmin && page === 'nuovo-cliente' && <NuovoCliente   db={db} showToast={showToast} onReload={reload} onNavigate={setPage} />}
      {isAdmin && page === 'disponibilita' && <Disponibilita  db={db} />}
      {isAdmin && page === 'admin'         && <Admin          onReload={reload} />}

      <Toast toast={toast} />
    </>
  )
}
