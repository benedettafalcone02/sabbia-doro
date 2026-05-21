import { useState, useCallback, useEffect } from 'react'
import { generatePostazioni, uid } from '../lib/data'
import { supabase } from '../lib/supabase'

const initialDB = {
  postazioni: generatePostazioni(),
  clienti: [],
  prenotazioni: [],
  pagamenti: [],
  loading: true,
}

export function useStore() {
  const [db, setDB] = useState(initialDB)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data, error } = await supabase.from('occupazioni').select('*')
    if (error) {
      console.error('Supabase error:', error)
      setDB(p => ({ ...p, loading: false }))
      return
    }

    setDB(prev => {
      // ── Postazioni aggiornate ──
      const postazioni = prev.postazioni.map(p => {
        const occ = data.find(o =>
          Number(o.numero) === Number(p.numero) && o.tipo === p.tipo
        )
        if (!occ) return { ...p, stato: 'libero', cliente: null, lettini: 0, sdraio: 0, regista: 0 }
        return {
          ...p,
          stato: 'occupato',
          cliente: occ.cliente || null,
          lettini: Number(occ.lettini) || 0,
          sdraio:  Number(occ.sdraio)  || 0,
          regista: Number(occ.regista) || 0,
        }
      })

      // ── Clienti unici estratti da occupazioni ──
      const clientiMap = {}
      data.forEach(occ => {
        if (!occ.cliente) return
        const key = occ.cliente.trim().toUpperCase()
        if (!clientiMap[key]) {
          clientiMap[key] = {
            id: `cl_${key}`,
            nome: occ.cliente.trim(),
            cognome: '',
            telefono: occ.telefono || '',
            email: occ.email || '',
            note: '',
            postazioni_occ: [],
          }
        }
        clientiMap[key].postazioni_occ.push({
          tipo: occ.tipo,
          numero: Number(occ.numero),
          lettini: Number(occ.lettini) || 0,
          sdraio: Number(occ.sdraio) || 0,
          regista: Number(occ.regista) || 0,
        })
      })
      const clienti = Object.values(clientiMap)

      // ── Prenotazioni virtuali per dashboard ──
      const prenotazioni = data.map(occ => ({
        id: `pren_${occ.tipo}_${occ.numero}`,
        postazione_id: `${occ.tipo}_${occ.numero}`,
        cliente_id: `cl_${(occ.cliente || '').trim().toUpperCase()}`,
        tipo: 'stagionale',
        stato_pagamento: 'da_pagare',
        prezzo_totale: 0,
        acconto_versato: 0,
        saldo_residuo: 0,
        data_inizio: '',
        data_fine: '',
      }))

      return { ...prev, postazioni, clienti, prenotazioni, loading: false }
    })
  }

  const reload = useCallback(() => loadAll(), [])

  const salvaCliente = useCallback((obj) => {
    setDB(prev => ({
      ...prev,
      clienti: obj.id
        ? prev.clienti.map(c => c.id === obj.id ? obj : c)
        : [...prev.clienti, { ...obj, id: uid(), postazioni_occ: [] }]
    }))
  }, [])

  const registraPagamento = useCallback((prenId, importo, data, metodo, note) => {
    setDB(prev => ({
      ...prev,
      pagamenti: [...prev.pagamenti, { id: uid(), prenotazione_id: prenId, importo, data, metodo, note }]
    }))
  }, [])

  return { db, salvaCliente, registraPagamento, reload }
}
