export function generatePostazioni() {
  const list = []

  // PALME: 6 file x 14 = 84
  for (let fila = 1; fila <= 6; fila++) {
    for (let col = 1; col <= 14; col++) {
      const numero = (fila - 1) * 14 + col
      list.push({ id: `palma_${numero}`, tipo: 'palma', numero, fila, col, settore: null, stato: 'libero' })
    }
  }

  // OMBRELLONI: serpentina, fila 13→1
  const seq = []
  for (let fila = 13; fila >= 1; fila--) {
    const step = 13 - fila
    const cols = Array.from({ length: 16 }, (_, i) => i + 1)
    if (step % 2 !== 0) cols.reverse()
    cols.forEach(col => seq.push({ fila, col }))
  }
  seq.forEach(({ fila, col }, idx) => {
    const numero = idx + 1
    const settore = fila <= 6 ? 'A' : 'B'
    list.push({ id: `ombr_${numero}`, tipo: 'ombrellone', numero, fila, col, settore, stato: 'libero' })
  })

  return list
}

export const normalizeCliente = (name) => String(name || '').trim().toUpperCase()

export function fmtEur(n) {
  if (n == null) return '—'
  return '€' + Number(n).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
export function today() {
  return new Date().toISOString().split('T')[0]
}
export function tomorrow() {
  return new Date(Date.now() + 86400000).toISOString().split('T')[0]
}
