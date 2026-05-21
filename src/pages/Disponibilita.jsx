import { useState } from 'react'
import { fmtEur } from '../lib/data'

export default function Disponibilita({ db, onPrenota, showToast }) {
  const { postazioni, prenotazioni } = db
  const [dal, setDal] = useState('')
  const [al, setAl]   = useState('')
  const [tipo, setTipo] = useState('tutti')
  const [risultati, setRisultati] = useState(null)

  function cerca() {
    if (!dal || !al) { showToast('Seleziona le date', 'error'); return }
    if (new Date(al) < new Date(dal)) { showToast('Data fine precedente a data inizio', 'error'); return }
    const dDal = new Date(dal), dAl = new Date(al)
    const occupateIds = new Set(
      prenotazioni
        .filter(r => r.data_inizio && r.data_fine && new Date(r.data_inizio) <= dAl && new Date(r.data_fine) >= dDal)
        .map(r => r.postazione_id)
    )
    let libere = postazioni.filter(p => !occupateIds.has(p.id))
    if (tipo !== 'tutti') libere = libere.filter(p => p.tipo === tipo)
    setRisultati(libere)
  }

  return (
    <div className="page-content">
      <h1 className="page-title">Verifica Disponibilità</h1>

      <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: 18, boxShadow: 'var(--shadow)', marginBottom: 18, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group">
          <label>Data Inizio</label>
          <input type="date" value={dal} onChange={e => setDal(e.target.value)} style={{ padding: '10px 13px', borderRadius: 8, border: '2px solid #ddd', fontFamily: 'var(--font-body)' }} />
        </div>
        <div className="form-group">
          <label>Data Fine</label>
          <input type="date" value={al} onChange={e => setAl(e.target.value)} style={{ padding: '10px 13px', borderRadius: 8, border: '2px solid #ddd', fontFamily: 'var(--font-body)' }} />
        </div>
        <div className="form-group">
          <label>Tipo Postazione</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ padding: '10px 13px', borderRadius: 8, border: '2px solid #ddd', fontFamily: 'var(--font-body)' }}>
            <option value="tutti">Tutti</option>
            <option value="palma">Solo Palme</option>
            <option value="ombrellone">Solo Ombrelloni</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={cerca}>🔍 Cerca Disponibili</button>
      </div>

      {risultati === null ? (
        <div style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 600 }}>Seleziona le date per vedere le postazioni disponibili.</div>
      ) : risultati.length === 0 ? (
        <div style={{ background: '#fde0de', borderRadius: 'var(--radius)', padding: 18, color: '#8a1c15', fontWeight: 700 }}>
          Nessuna postazione libera per il periodo selezionato.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>
            {risultati.length} postazioni disponibili · {dal} → {al}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {risultati.map(p => (
              <div key={p.id} className="disp-card" onClick={() => onPrenota(p.id)}>
                <div className="tipo">{p.tipo === 'palma' ? '🌴 Palma' : `☂ Ombrellone${p.settore ? ` Sett.${p.settore}` : ''}`} · F{p.fila}</div>
                <div className="num">#{p.numero}</div>
                <div className="prezzo">{fmtEur(p.tipo === 'palma' ? p.prezzo_stagionale : p.prezzo_2lettini)}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Clicca per prenotare →</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
