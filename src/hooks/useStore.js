import { useState, useCallback, useEffect } from 'react'
import { generatePostazioni, calcolaStato, uid } from '../lib/data'
import { supabase } from '../lib/supabase'

const initialDB = {
  postazioni: generatePostazioni(),
  clienti: [],
  prenotazioni: [],
  pagamenti: [],
}

// Semplice store globale condiviso via prop drilling (upgradable a Context/Zustand)
export function useStore() {
  const [db, setDB] = useState(initialDB)
  useEffect(() => {
    loadOccupazioni()
  }, [])

  const updateDB = useCallback((updater) => {
    setDB(prev => ({ ...prev, ...updater(prev) }))
  }, [])

  async function loadOccupazioni() {

    const { data, error } = await supabase
      .from('occupazioni')
      .select('*')
  
    if (error) {
      console.error(error)
      return
    }
  
    setDB(prev => {
  
      const nuovePostazioni = prev.postazioni.map(p => {
  
        const occupata = data.find(
          o =>
            o.numero === p.numero &&
            o.tipo === p.tipo
        )
  
        if (!occupata) {
          return {
            ...p,
            stato: 'libero'
          }
        }
  
        return {
          ...p,
        
          stato: 'occupato',
        
          cliente: occupata.cliente || null,
        
          lettini: occupata.lettini || 0,
        
          sdraio: occupata.sdraio || 0,
        
          regista: occupata.regista || 0,
        }
      })
  
      return {
        ...prev,
        postazioni: nuovePostazioni
      }
    })
  }

  // ── CLIENTI ──
  const salvaCliente = useCallback((obj) => {
    updateDB(prev => {
      const clienti = obj.id
        ? prev.clienti.map(c => c.id === obj.id ? obj : c)
        : [...prev.clienti, { ...obj, id: uid(), created_at: new Date().toISOString() }]
      return { clienti }
    })
  }, [updateDB])

  // ── PRENOTAZIONI ──
  const salvaPrenotazione = useCallback((obj) => {
    updateDB(prev => {
      const isNew = !obj.id
      const pren = { ...obj, id: obj.id || uid(), created_at: obj.created_at || new Date().toISOString() }
      const prenotazioni = isNew
        ? [...prev.prenotazioni, pren]
        : prev.prenotazioni.map(r => r.id === pren.id ? pren : r)

      // aggiorna stato postazione
      const postazioni = prev.postazioni.map(p => {
        if (p.id !== pren.postazione_id) return p
        const stato = pren.stato_pagamento === 'saldo' ? 'occupato'
          : pren.stato_pagamento === 'acconto_versato' ? 'acconto'
          : 'occupato'
        return { ...p, stato, prenotazione_id: pren.id }
      })

      return { prenotazioni, postazioni }
    })
  }, [updateDB])

  const eliminaPrenotazione = useCallback((id) => {
    updateDB(prev => {
      const pren = prev.prenotazioni.find(r => r.id === id)
      const prenotazioni = prev.prenotazioni.filter(r => r.id !== id)
      const pagamenti = prev.pagamenti.filter(p => p.prenotazione_id !== id)
      const postazioni = prev.postazioni.map(p =>
        p.prenotazione_id === id ? { ...p, stato: 'libero', prenotazione_id: null } : p
      )
      return { prenotazioni, pagamenti, postazioni }
    })
  }, [updateDB])

  // ── PAGAMENTI ──
  const registraPagamento = useCallback((prenId, importo, data, metodo, note) => {
    updateDB(prev => {
      const pag = { id: uid(), prenotazione_id: prenId, importo, data, metodo, note, created_at: new Date().toISOString() }
      const pagamenti = [...prev.pagamenti, pag]

      const prenotazioni = prev.prenotazioni.map(r => {
        if (r.id !== prenId) return r
        const nuovoAcconto = (r.acconto_versato || 0) + importo
        const saldo_residuo = r.prezzo_totale - nuovoAcconto
        const stato_pagamento = calcolaStato(r.prezzo_totale, nuovoAcconto)
        return { ...r, acconto_versato: nuovoAcconto, saldo_residuo, stato_pagamento }
      })

      const pren = prenotazioni.find(r => r.id === prenId)
      const postazioni = prev.postazioni.map(p => {
        if (p.prenotazione_id !== prenId) return p
        const stato = pren.stato_pagamento === 'saldo' ? 'occupato' : 'acconto'
        return { ...p, stato }
      })

      return { pagamenti, prenotazioni, postazioni }
    })
  }, [updateDB])

  return { db, salvaCliente, salvaPrenotazione, eliminaPrenotazione, registraPagamento }
}
