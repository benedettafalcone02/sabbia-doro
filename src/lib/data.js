// Genera tutte le 292 postazioni con prezzi corretti
export function generatePostazioni() {
  const list = []

  // PALME: 6 file x 14 = 84
  const prezziPalme = [2100, 1900, 1800, 1700, 1600, 1600]
  for (let fila = 1; fila <= 6; fila++) {
    for (let col = 1; col <= 14; col++) {
      const numero = (fila - 1) * 14 + col
      list.push({
        id: `palma_${numero}`,
        tipo: 'palma',
        numero,
        fila,
        col,
        settore: null,
        prezzo_stagionale: prezziPalme[fila - 1],
        prezzo_2lettini: null,
        prezzo_lettino_regista: null,
        stato: 'libero',
        prenotazione_id: null,
      })
    }
  }

  // OMBRELLONI: serpentina, fila 13→1
  const seq = []
  for (let fila = 13; fila >= 1; fila--) {
    const step = 13 - fila // 0=fila13, 12=fila1
    const cols = Array.from({ length: 16 }, (_, i) => i + 1)
    if (step % 2 !== 0) cols.reverse()
    cols.forEach(col => seq.push({ fila, col }))
  }

  seq.forEach(({ fila, col }, idx) => {
    const numero = idx + 1
    const settore = fila <= 6 ? 'A' : 'B'
    let prezzo_2lettini, prezzo_lettino_regista
    if (settore === 'A' && fila === 1) { prezzo_2lettini = 750; prezzo_lettino_regista = 650 }
    else if (settore === 'A')           { prezzo_2lettini = 700; prezzo_lettino_regista = 600 }
    else                                { prezzo_2lettini = 600; prezzo_lettino_regista = 500 }

    list.push({
      id: `ombr_${numero}`,
      tipo: 'ombrellone',
      numero,
      fila,
      col,
      settore,
      prezzo_stagionale: null,
      prezzo_2lettini,
      prezzo_lettino_regista,
      stato: 'libero',
      prenotazione_id: null,
    })
  })

  return list
}

// Helpers
export const normalizeCliente = (name) => String(name || '').trim().toUpperCase()

export function fmtEur(n) {
  return '€' + (n || 0).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
export function today() {
  return new Date().toISOString().split('T')[0]
}
export function tomorrow() {
  return new Date(Date.now() + 86400000).toISOString().split('T')[0]
}
