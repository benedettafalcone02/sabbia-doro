import { useState } from 'react'
import './styles/global.css'

import { useStore }  from './hooks/useStore'
import { useToast }  from './hooks/useToast'

import Login         from './pages/Login'
import Navbar        from './components/Navbar'
import Dashboard     from './pages/Dashboard'
import Mappa         from './pages/Mappa'
import Clienti       from './pages/Clienti'
import Disponibilita from './pages/Disponibilita'
import Admin         from './pages/Admin'
import Toast         from './components/Toast'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [page, setPage]         = useState('dashboard')

  const { db, salvaCliente, registraPagamento, reload } = useStore()
  const { toast, showToast } = useToast()

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />

  return (
    <>
      <Navbar activePage={page} onNavigate={setPage} onLogout={() => setLoggedIn(false)} />

      {page === 'dashboard'     && <Dashboard     db={db} onNavigate={setPage} />}
      {page === 'mappa'         && <Mappa          db={db} showToast={showToast} />}
      {page === 'clienti'       && <Clienti        db={db} onSalvaCliente={salvaCliente} showToast={showToast} />}
      {page === 'disponibilita' && <Disponibilita  db={db} showToast={showToast} />}
      {page === 'admin'         && <Admin          onReload={reload} />}

      <Toast toast={toast} />
    </>
  )
}
