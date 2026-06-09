import { useState } from 'react'
import './styles/global.css'

import { useStore }     from './hooks/useStore'
import { useToast }     from './hooks/useToast'
import { isConfigured } from './lib/supabase'

import Login               from './pages/Login'
import Navbar              from './components/Navbar'
import Dashboard           from './pages/Dashboard'
import Mappa               from './pages/Mappa'
import Prenota             from './pages/Prenota'
import Clienti             from './pages/Clienti'
import NuovoCliente        from './pages/NuovoCliente'
import Disponibilita       from './pages/Disponibilita'
import Calendario          from './pages/Calendario'
import Admin               from './pages/Admin'
import PrenotazionePublica from './pages/PrenotazionePublica'
import Toast               from './components/Toast'

export default function App() {
  const isPublicRoute = window.location.pathname === '/prenota'

  const [role, setRole]                   = useState(null)
  const [page, setPage]                   = useState('dashboard')
  const [prenotaPostId, setPrenotaPostId] = useState(null)
  const [prenotaDateInizio, setPrenotaDateInizio] = useState(null)
  const [prenotaDateFine,   setPrenotaDateFine]   = useState(null)
  const { db, reload }            = useStore(isPublicRoute)
  const { toast, showToast }      = useToast()

  function navigatePrenota(postId, dataInizio = null, dataFine = null) {
    setPrenotaPostId(postId)
    setPrenotaDateInizio(dataInizio)
    setPrenotaDateFine(dataFine)
    setPage('prenota')
  }

  function navigate(p) {
    if (p !== 'prenota') { setPrenotaPostId(null); setPrenotaDateInizio(null); setPrenotaDateFine(null) }
    setPage(p)
  }

  // Pagina pubblica — senza login
  if (isPublicRoute) return (
    <>
      <PrenotazionePublica showToast={showToast} />
      <Toast toast={toast} />
    </>
  )

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

  if (!role) return <Login onLogin={r => { setRole(r); if (r === 'spiaggista') setPage('mappa') }} />

  const isAdmin = role === 'admin'

  return (
    <>
      <Navbar activePage={page} onNavigate={navigate} onLogout={() => { setRole(null); setPage('dashboard') }} role={role} />

      {isAdmin && page === 'dashboard'     && <Dashboard     db={db} onNavigate={navigate} showToast={showToast} onReload={reload} />}
      {page === 'mappa'                    && <Mappa          db={db} onNavigate={navigate} onNavigatePrenota={navigatePrenota} showToast={showToast} onReload={reload} role={role} />}
      {isAdmin && page === 'prenota'       && <Prenota        db={db} showToast={showToast} onReload={reload} initialPostId={prenotaPostId} initialDataInizio={prenotaDateInizio} initialDataFine={prenotaDateFine} />}
      {page === 'clienti'                  && <Clienti        db={db} onNavigate={isAdmin ? navigate : undefined} showToast={showToast} onReload={reload} role={role} />}
      {isAdmin && page === 'nuovo-cliente' && <NuovoCliente   db={db} showToast={showToast} onReload={reload} onNavigate={navigate} />}
      {isAdmin && page === 'disponibilita' && <Disponibilita  db={db} onNavigatePrenota={navigatePrenota} />}
      {isAdmin && page === 'calendario'   && <Calendario     db={db} />}
      {isAdmin && page === 'admin'         && <Admin          onReload={reload} />}

      <Toast toast={toast} />
    </>
  )
}
