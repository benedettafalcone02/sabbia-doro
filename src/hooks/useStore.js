import { useState, useCallback, useEffect } from 'react'
import { generatePostazioni, normalizeCliente } from '../lib/data'
import { supabase } from '../lib/supabase'

const initialDB = {
  postazioni:  generatePostazioni(),
  clienti:     [],
  occupazioni: [],
  pagamenti:   [],
  richieste:   [],
  loading:     true,
}

export function useStore(skip = false) {
  const [db, setDB] = useState(initialDB)

  useEffect(() => { if (!skip) loadAll() }, [skip])

  async function loadAll() {
    const [occRes, pagRes, richRes] = await Promise.all([
      supabase.from('occupazioni').select('*'),
      supabase.from('pagamenti').select('*'),
      supabase.from('richieste_prenotazione').select('*').eq('stato', 'in_attesa').order('created_at', { ascending: false }),
    ])
    if (occRes.error) {
      console.error('Supabase error:', occRes.error)
      setDB(p => ({ ...p, loading: false }))
      return
    }
    const allOcc  = occRes.data
    const pagData = pagRes.error  ? [] : (pagRes.data  || [])
    const richData = richRes.error ? [] : (richRes.data || [])

    setDB(prev => {
      const oggi = new Date().toISOString().split('T')[0]

      // Raggruppa per (tipo, numero)
      const occByPost = {}
      allOcc.forEach(occ => {
        const key = `${occ.tipo}_${occ.numero}`
        if (!occByPost[key]) occByPost[key] = []
        occByPost[key].push(occ)
      })

      const postazioni = prev.postazioni.map(p => {
        const key  = `${p.tipo}_${p.numero}`
        const occs = occByPost[key] || []

        // Prenotazione attiva OGGI — subaffitto/disponibile hanno priorità su stagionale
        const TIPO_PRIORITY = { subaffitto: 0, subaffitto_disponibile: 1, disponibile: 1 }
        const occOggi = occs
          .filter(o => o.data_inizio <= oggi && o.data_fine >= oggi)
          .sort((a, b) => (TIPO_PRIORITY[a.tipo_occupazione] ?? 2) - (TIPO_PRIORITY[b.tipo_occupazione] ?? 2))[0]

        // Tutte le prenotazioni presenti e future (per timeline)
        const prenotazioni = occs
          .filter(o => o.data_fine >= oggi)
          .sort((a, b) => a.data_inizio.localeCompare(b.data_inizio))
          .map(o => ({
            id:               o.id,
            cliente:          o.cliente         || null,
            data_inizio:      o.data_inizio,
            data_fine:        o.data_fine,
            temporanea:       o.temporanea      || false,
            tipo_occupazione: o.tipo_occupazione || 'stagionale',
            subaffittuario:   o.subaffittuario  || null,
            lettini:          Number(o.lettini)  || 0,
            sdraio:           Number(o.sdraio)   || 0,
            regista:          Number(o.regista)  || 0,
            prezzo_totale:    o.prezzo_totale != null ? Number(o.prezzo_totale) : null,
            note:             o.note            || null,
            pagamenti:        pagData.filter(pg => pg.occupazione_id === o.id),
          }))

        if (!occOggi) {
          return {
            ...p,
            stato: 'libero',
            occ_id: null,
            cliente: null,
            lettini: 0, sdraio: 0, regista: 0,
            telefono: null, email: null, note: null,
            data_inizio: null, data_fine: null,
            acconto: null, prezzo_totale: null,
            temporanea: false,
            tipo_occupazione: null,
            subaffittuario: null,
            pagamenti: [],
            prenotazioni,
          }
        }

        return {
          ...p,
          stato:            'occupato',
          occ_id:           occOggi.id,
          cliente:          occOggi.cliente    || null,
          lettini:          Number(occOggi.lettini)  || 0,
          sdraio:           Number(occOggi.sdraio)   || 0,
          regista:          Number(occOggi.regista)  || 0,
          telefono:         occOggi.telefono   || null,
          email:            occOggi.email      || null,
          n_persone:        occOggi.n_persone  ? Number(occOggi.n_persone) : null,
          data_inizio:      occOggi.data_inizio || null,
          data_fine:        occOggi.data_fine   || null,
          note:             occOggi.note       || null,
          acconto:          occOggi.acconto       != null ? Number(occOggi.acconto)       : null,
          prezzo_totale:    occOggi.prezzo_totale != null ? Number(occOggi.prezzo_totale) : null,
          temporanea:       occOggi.temporanea   || false,
          tipo_occupazione: occOggi.tipo_occupazione || 'stagionale',
          subaffittuario:   occOggi.subaffittuario  || null,
          pagamenti:        pagData.filter(pg => pg.occupazione_id === occOggi.id),
          prenotazioni,
        }
      })

      // Costruisce clienti da tutte le occupazioni
      const clientiMap = {}
      allOcc.forEach(occ => {
        if (!occ.cliente) return
        const key = normalizeCliente(occ.cliente)
        if (!clientiMap[key]) {
          clientiMap[key] = {
            id:            `cl_${key}`,
            nome:          occ.cliente.trim(),
            cognome:       '',
            telefono:      occ.telefono   || '',
            email:         occ.email      || '',
            n_persone:     occ.n_persone  ? Number(occ.n_persone) : null,
            data_inizio:   occ.data_inizio || '',
            data_fine:     occ.data_fine   || '',
            note:          occ.note        || '',
            acconto:       occ.acconto       != null ? Number(occ.acconto)       : null,
            prezzo_totale: occ.prezzo_totale != null ? Number(occ.prezzo_totale) : null,
            postazioni_occ: [],
          }
        } else {
          // Aggiorna campi mancanti da altre righe dello stesso cliente
          if (occ.note     && !clientiMap[key].note)     clientiMap[key].note     = occ.note
          if (occ.telefono && !clientiMap[key].telefono) clientiMap[key].telefono = occ.telefono
          if (occ.email    && !clientiMap[key].email)    clientiMap[key].email    = occ.email
          if (occ.n_persone != null && clientiMap[key].n_persone == null)
            clientiMap[key].n_persone = Number(occ.n_persone)
        }
        clientiMap[key].postazioni_occ.push({
          tipo:    occ.tipo,
          numero:  Number(occ.numero),
          lettini: Number(occ.lettini) || 0,
          sdraio:  Number(occ.sdraio)  || 0,
          regista: Number(occ.regista) || 0,
        })
      })

      return {
        ...prev,
        postazioni,
        clienti:     Object.values(clientiMap),
        occupazioni: allOcc,
        pagamenti:   pagData,
        richieste:   richData,
        loading:     false,
      }
    })
  }

  return { db, reload: useCallback(() => loadAll(), []) }
}
