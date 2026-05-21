import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

function parseAttrezzatura(text = '') {
  const value = String(text).toUpperCase().trim()
  let lettini = 0, sdraio = 0, regista = 0
  const regex = /(\d+)\s*([LSR])/g
  let match
  while ((match = regex.exec(value)) !== null) {
    const qty = Number(match[1])
    const type = match[2]
    if (type === 'L') lettini += qty
    if (type === 'S') sdraio += qty
    if (type === 'R') regista += qty
  }
  return { lettini, sdraio, regista }
}

export default function ImportExcel({ onReload }) {
  const [status, setStatus] = useState(null) // null | 'loading' | 'ok' | 'error'
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState([])

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setStatus('loading')
    setMessage('Lettura file...')
    setPreview([])

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet)

      if (rows.length === 0) {
        setStatus('error')
        setMessage('Il file è vuoto o non ha righe valide.')
        return
      }

      // Detect tipo da colonne
      const primaRiga = rows[0]
      const isOmbrellone = 'Numero Ombrellone' in primaRiga
      const isPalma = 'Numero Palma' in primaRiga

      if (!isOmbrellone && !isPalma) {
        setStatus('error')
        setMessage(`Colonne non riconosciute. Trovate: ${Object.keys(primaRiga).join(', ')}. Servono "Numero Ombrellone" o "Numero Palma", "Cliente", "Attrezzatura".`)
        return
      }

      const formatted = rows
        .filter(row => {
          const num = isOmbrellone ? row['Numero Ombrellone'] : row['Numero Palma']
          return num && row['Cliente']
        })
        .map(row => {
          const attr = parseAttrezzatura(row['Attrezzatura'] || '')
          const isOmbr = !!row['Numero Ombrellone']
          return {
            tipo: isOmbr ? 'ombrellone' : 'palma',
            numero: Number(isOmbr ? row['Numero Ombrellone'] : row['Numero Palma']),
            cliente: String(row['Cliente']).trim(),
            stato: 'occupato',
            lettini: attr.lettini,
            sdraio: attr.sdraio,
            regista: attr.regista,
          }
        })

      if (formatted.length === 0) {
        setStatus('error')
        setMessage('Nessuna riga valida trovata. Controlla che le colonne "Cliente" e il numero siano compilati.')
        return
      }

      // Mostra preview
      setPreview(formatted.slice(0, 5))
      setMessage(`Trovate ${formatted.length} righe. Caricamento su Supabase...`)

      // Prima svuota le occupazioni dello stesso tipo
      const tipo = formatted[0].tipo
      const { error: delError } = await supabase
        .from('occupazioni')
        .delete()
        .eq('tipo', tipo)

      if (delError) throw delError

      // Inserisci in batch da 50
      const BATCH = 50
      for (let i = 0; i < formatted.length; i += BATCH) {
        const batch = formatted.slice(i, i + BATCH)
        const { error } = await supabase.from('occupazioni').insert(batch)
        if (error) throw error
      }

      setStatus('ok')
      setMessage(`✅ Importate ${formatted.length} occupazioni (${tipo})!`)
      if (onReload) onReload()

    } catch (err) {
      console.error(err)
      setStatus('error')
      setMessage(`Errore: ${err.message || JSON.stringify(err)}`)
    }

    // Reset input
    e.target.value = ''
  }

  return (
    <div className="card" style={{ maxWidth: 600 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>
        📥 Importa Excel Occupazioni
      </h3>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
        Carica un file Excel con colonne: <strong>Numero Palma</strong> o <strong>Numero Ombrellone</strong>, <strong>Cliente</strong>, <strong>Attrezzatura</strong> (es. "2L 1R").<br />
        L'import sovrascrive le occupazioni esistenti dello stesso tipo.
      </p>

      <label style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'var(--navy)', color: '#fff',
        padding: '11px 20px', borderRadius: 8, cursor: 'pointer',
        fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
        transition: '.15s',
      }}>
        📂 Scegli file Excel
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: 'none' }} />
      </label>

      {status === 'loading' && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#f0f4ff', borderRadius: 8, fontSize: 13, color: 'var(--navy)', fontWeight: 500 }}>
          ⏳ {message}
        </div>
      )}

      {status === 'ok' && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#e8f8f0', borderRadius: 8, fontSize: 13, color: '#1a7a45', fontWeight: 600, borderLeft: '3px solid #27ae60' }}>
          {message}
        </div>
      )}

      {status === 'error' && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#fde8e8', borderRadius: 8, fontSize: 13, color: '#8a1c15', fontWeight: 600, borderLeft: '3px solid var(--red)' }}>
          ❌ {message}
        </div>
      )}

      {preview.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
            Anteprima prime 5 righe
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f0f2f5' }}>
                  {['Tipo','N°','Cliente','Lettini','Sdraio','Regista'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 10px' }}>{r.tipo}</td>
                    <td style={{ padding: '6px 10px', fontWeight: 700 }}>{r.numero}</td>
                    <td style={{ padding: '6px 10px' }}>{r.cliente}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>{r.lettini}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>{r.sdraio}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>{r.regista}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
