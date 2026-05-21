import { useState } from 'react'
import './styles/global.css'

import { useStore }    from './hooks/useStore'
import { useToast }    from './hooks/useToast'

import Login           from './pages/Login'
import Navbar          from './components/Navbar'
import Dashboard       from './pages/Dashboard'
import Mappa           from './pages/Mappa'
import Prenotazioni    from './pages/Prenotazioni'
import Clienti         from './pages/Clienti'
import Disponibilita   from './pages/Disponibilita'
import FormPrenotazione from './components/FormPrenotazione'
import FormPagamento    from './components/FormPagamento'
import SqlModal         from './components/SqlModal'
import Toast            from './components/Toast'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [page, setPage]         = useState('dashboard')

  const { db, salvaCliente, salvaPrenotazione, eliminaPrenotazione, registraPagamento } = useStore()
  const { toast, showToast } = useToast()

  // Modal states
  const [prenModal, setPrenModal]   = useState({ open: false, postazioneId: null, prenotazioneId: null })
  const [pagModal, setPagModal]     = useState({ open: false, prenotazioneId: null })
  const [sqlModal, setSqlModal]     = useState(false)

  function openNuovaPrenotazione(postazioneId = null, prenotazioneId = null) {
    setPrenModal({ open: true, postazioneId, prenotazioneId })
    if (page !== 'prenotazioni' && page !== 'mappa') setPage('prenotazioni')
  }
  function openPagamento(prenotazioneId) {
    setPagModal({ open: true, prenotazioneId })
  }

  function handleSalvaPren({ tipo, data }) {
    if (tipo === 'cliente') salvaCliente(data)
    else salvaPrenotazione(data)
  }

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />

  return (
    <>
      <Navbar
        activePage={page}
        onNavigate={setPage}
        onLogout={() => setLoggedIn(false)}
      />

      {page === 'dashboard'     && <Dashboard     db={db} onNavigate={setPage} onSqlModal={() => setSqlModal(true)} />}
      {page === 'mappa'         && <Mappa          db={db} onNuovaPrenotazione={openNuovaPrenotazione} showToast={showToast} />}
      {page === 'prenotazioni'  && <Prenotazioni   db={db} onNuova={() => openNuovaPrenotazione()} onEdit={id => openNuovaPrenotazione(null, id)} onPagamento={openPagamento} />}
      {page === 'clienti'       && <Clienti        db={db} onSalvaCliente={salvaCliente} showToast={showToast} />}
      {page === 'disponibilita' && <Disponibilita  db={db} onPrenota={id => openNuovaPrenotazione(id)} showToast={showToast} />}

      <FormPrenotazione
        open={prenModal.open}
        onClose={() => setPrenModal(s => ({ ...s, open: false }))}
        db={db}
        prenotazioneId={prenModal.prenotazioneId}
        postazionePreselezionata={prenModal.postazioneId}
        onSalva={handleSalvaPren}
        onPagamento={openPagamento}
        showToast={showToast}
      />

      <FormPagamento
        open={pagModal.open}
        onClose={() => setPagModal(s => ({ ...s, open: false }))}
        db={db}
        prenotazioneId={pagModal.prenotazioneId}
        onRegistra={registraPagamento}
        showToast={showToast}
      />

      <SqlModal open={sqlModal} onClose={() => setSqlModal(false)} />
      <Toast toast={toast} />
    </>
  )
}
