import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

export default function ImportExcel() {
    function parseAttrezzatura(text = '') {

        const parts = text.toUpperCase().split(' ')
      
        return {
          lettini: parts.filter(x => x === 'L').length,
          sdraio: parts.filter(x => x === 'S').length,
          regista: parts.filter(x => x === 'R').length,
        }
      }

    const handleFile = async (e) => {

        const file = e.target.files[0]

        if (!file) return

        const data = await file.arrayBuffer()

        const workbook = XLSX.read(data)

        const sheet = workbook.Sheets[workbook.SheetNames[0]]

        const rows = XLSX.utils.sheet_to_json(sheet)
        alert(JSON.stringify(rows[0]))

        console.log(rows)

        const formatted = rows.map(row => {

            const attrezzatura = parseAttrezzatura(
              row['Attrezzatura'] || ''
            )
          
            const isOmbrellone = !!row['Numero Ombrellone']
          
            return {
          
              tipo: isOmbrellone
                ? 'ombrellone'
                : 'palma',
          
              numero: isOmbrellone
                ? row['Numero Ombrellone']
                : row['Numero Palma'],
          
              cliente: row['Cliente'],
          
              stato: 'occupato',
          
              lettini: attrezzatura.lettini,
          
              sdraio: attrezzatura.sdraio,
          
              regista: attrezzatura.regista,
            }
          })

        const { error } = await supabase
            .from('occupazioni')
            .insert(formatted)

        if (error) {
            console.error(error)
            alert('Errore importazione')
            return
        }

        alert('Importazione completata!')
    }

    return (
        <div className="card">

            <h3 style={{ marginBottom: 20 }}>
                Importa Excel Occupazioni
            </h3>

            <input
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFile}
            />

        </div>
    )
}