import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

// Parses attrezzatura codes: 2L, LR, LS, 2LR, R2L, LRS, SR, etc.
function parseAttrezzatura(text = '') {
  if (!text || text === '—' || text === '-') return { lettini: 0, sdraio: 0, regista: 0 }
  const value = String(text).toUpperCase().replace(/\s/g, '').replace(/—/g, '').replace(/-/g, '')
  let lettini = 0, sdraio = 0, regista = 0
  const regex = /(\d*)([LSR])/g
  let match
  while ((match = regex.exec(value)) !== null) {
    const qty = match[1] ? Number(match[1]) : 1
    if (match[2] === 'L') lettini += qty
    if (match[2] === 'S') sdraio += qty
    if (match[2] === 'R') regista += qty
  }
  return { lettini, sdraio, regista }
}

export default function ImportExcel({ onReload }) {
  const [status, setStatus]       = useState(null)   // null | 'loading' | 'confirm' | 'saving' | 'ok' | 'error'
  const [message, setMessage]     = useState('')
  const [preview, setPreview]     = useState([])
  const pendingData               = useRef(null)      // parsed rows waiting for confirmation
  const fileInputRef              = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setStatus('loading')
    setMessage('Lettura file...')
    setPreview([])
    pendingData.current = null

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet)

      if (rows.length === 0) { setStatus('error'); setMessage('File vuoto.'); return }

      const primaRiga = rows[0]
      const isOmbrellone = 'Numero Ombrellone' in primaRiga
      const isPalma = 'Numero Palma' in primaRiga

      if (!isOmbrellone && !isPalma) {
        setStatus('error')
        setMessage(`Colonne non riconosciute: ${Object.keys(primaRiga).join(', ')}`)
        return
      }

      const formatted = rows
        .filter(row => {
          const num = isOmbrellone ? row['Numero Ombrellone'] : row['Numero Palma']
          return num && row['Cliente']
        })
        .map(row => {
          const attr = parseAttrezzatura(row['Attrezzatura'] || '')
          return {
            tipo: isOmbrellone ? 'ombrellone' : 'palma',
            numero: Number(isOmbrellone ? row['Numero Ombrellone'] : row['Numero Palma']),
            cliente: String(row['Cliente']).trim(),
            stato: 'occupato',
            lettini: attr.lettini,
            sdraio: attr.sdraio,
            regista: attr.regista,
          }
        })

      if (formatted.length === 0) { setStatus('error'); setMessage('Nessuna riga valida trovata.'); return }

      // Stop here — show preview and ask for confirmation before touching the DB
      pendingData.current = formatted
      setPreview(formatted.slice(0, 5))
      setStatus('confirm')
      setMessage(`${formatted.length} righe pronte (${formatted[0].tipo}). Questa operazione sovrascriverà tutte le occupazioni esistenti per questo tipo.`)

    } catch (err) {
      console.error(err)
      setStatus('error')
      setMessage(`Errore lettura file: ${err.message || JSON.stringify(err)}`)
    }

    // Reset input so the same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleConfirm = async () => {
    const formatted = pendingData.current
    if (!formatted) return

    setStatus('saving')
    setMessage('Salvataggio in corso...')

    try {
      const tipo = formatted[0].tipo
      const { error: delError } = await supabase.from('occupazioni').delete().eq('tipo', tipo)
      if (delError) throw delError

      const BATCH = 50
      for (let i = 0; i < formatted.length; i += BATCH) {
        const { error } = await supabase.from('occupazioni').insert(formatted.slice(i, i + BATCH))
        if (error) throw error
      }

      setStatus('ok')
      setMessage(`✅ Importate ${formatted.length} occupazioni (${tipo})!`)
      setPreview([])
      pendingData.current = null
      if (onReload) onReload()

    } catch (err) {
      console.error(err)
      setStatus('error')
      setMessage(`Errore salvataggio: ${err.message || JSON.stringify(err)}`)
    }
  }

  const handleCancel = () => {
    setStatus(null)
    setMessage('')
    setPreview([])
    pendingData.current = null
  }

  return (
    <div className="card" style={{ maxWidth: 600 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>
        📥 Importa Excel Occupazioni
      </h3>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.6 }}>
        Colonne richieste: <strong>Numero Palma</strong> o <strong>Numero Ombrellone</strong> · <strong>Cliente</strong> · <strong>Attrezzatura</strong><br />
        Formati attrezzatura supportati:{' '}
        {['2L', 'LR', 'LS', '2LR', 'LRS'].map(c => (
          <code key={c} style={{ background: '#f0f2f5', padding: '1px 5px', borderRadius: 4, marginRight: 4 }}>{c}</code>
        ))} ecc.
      </p>

      <label style={{
        display: status === 'confirm' || status === 'saving' ? 'none' : 'inline-flex',
        alignItems: 'center', gap: 8,
        background: 'var(--navy)', color: '#fff',
        padding: '11px 20px', borderRadius: 8, cursor: 'pointer',
        fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
      }}>
        📂 Scegli file Excel
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: 'none' }} />
      </label>

      {/* Status messages */}
      {status === 'loading' && (
        <div style={{ marginTop: 14, padding: '12px 16px', background: '#f0f4ff', borderRadius: 8, fontSize: 13, color: 'var(--navy)', fontWeight: 500 }}>
          ⏳ {message}
        </div>
      )}
      {status === 'saving' && (
        <div style={{ marginTop: 14, padding: '12px 16px', background: '#f0f4ff', borderRadius: 8, fontSize: 13, color: 'var(--navy)', fontWeight: 500 }}>
          ⏳ {message}
        </div>
      )}
      {status === 'ok' && (
        <div style={{ marginTop: 14, padding: '12px 16px', background: '#e8f8f0', borderRadius: 8, fontSize: 13, color: '#1a7a45', fontWeight: 600, borderLeft: '3px solid #27ae60' }}>
          {message}
        </div>
      )}
      {status === 'error' && (
        <div style={{ marginTop: 14, padding: '12px 16px', background: '#fde8e8', borderRadius: 8, fontSize: 13, color: '#8a1c15', fontWeight: 600, borderLeft: '3px solid var(--red)' }}>
          ❌ {message}
        </div>
      )}

      {/* Confirm stage */}
      {status === 'confirm' && (
        <div style={{ marginTop: 14 }}>
          <div style={{ padding: '12px 16px', background: '#fff8e1', borderRadius: 8, fontSize: 13, color: '#7c5a00', fontWeight: 600, borderLeft: '3px solid var(--yellow)', marginBottom: 12 }}>
            ⚠️ {message}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={handleConfirm}>
              ✅ Conferma importazione
            </button>
            <button className="btn btn-outline" onClick={handleCancel}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Preview table */}
      {preview.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
            Anteprima prime {preview.length} righe
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f0f2f5' }}>
                  {['Tipo', 'N°', 'Cliente', 'L', 'S', 'R'].map(h => (
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
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700 }}>{r.lettini || '—'}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700 }}>{r.sdraio || '—'}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700 }}>{r.regista || '—'}</td>
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
