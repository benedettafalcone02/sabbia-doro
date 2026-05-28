import { useState, useCallback, useEffect } from 'react'
import { generatePostazioni, normalizeCliente } from '../lib/data'
import { supabase } from '../lib/supabase'

const initialDB = {
  postazioni: generatePostazioni(),
  clienti: [],
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
      const postazioni = prev.postazioni.map(p => {
        const occ = data.find(o => Number(o.numero) === Number(p.numero) && o.tipo === p.tipo)
        if (!occ) return { ...p, stato: 'libero', cliente: null, lettini: 0, sdraio: 0, regista: 0 }
        return {
          ...p,
          stato: 'occupato',
          cliente:    occ.cliente    || null,
          lettini:    Number(occ.lettini)  || 0,
          sdraio:     Number(occ.sdraio)   || 0,
          regista:    Number(occ.regista)  || 0,
          telefono:   occ.telefono   || null,
          email:      occ.email      || null,
          n_persone:  occ.n_persone  ? Number(occ.n_persone) : null,
          data_inizio: occ.data_inizio || null,
          data_fine:   occ.data_fine   || null,
          note:       occ.note       || null,
          acconto:      occ.acconto      ? Number(occ.acconto)      : null,
          prezzo_totale: occ.prezzo_totale ? Number(occ.prezzo_totale) : null,
        }
      })

      const clientiMap = {}
      data.forEach(occ => {
        if (!occ.cliente) return
        const key = normalizeCliente(occ.cliente)
        if (!clientiMap[key]) {
          clientiMap[key] = {
            id:          `cl_${key}`,
            nome:        occ.cliente.trim(),
            cognome:     '',
            telefono:    occ.telefono   || '',
            email:       occ.email      || '',
            n_persone:   occ.n_persone  ? Number(occ.n_persone) : null,
            data_inizio: occ.data_inizio || '',
            data_fine:   occ.data_fine   || '',
            note:        occ.note        || '',
            acconto:      occ.acconto      ? Number(occ.acconto)      : null,
            prezzo_totale: occ.prezzo_totale ? Number(occ.prezzo_totale) : null,
            postazioni_occ: [],
          }
        }
        clientiMap[key].postazioni_occ.push({
          tipo:    occ.tipo,
          numero:  Number(occ.numero),
          lettini: Number(occ.lettini) || 0,
          sdraio:  Number(occ.sdraio)  || 0,
          regista: Number(occ.regista) || 0,
        })
      })

      return { ...prev, postazioni, clienti: Object.values(clientiMap), loading: false }
    })
  }

  return { db, reload: useCallback(() => loadAll(), []) }
}
