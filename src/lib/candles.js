// Transforma el histórico diario de poe2scout ([{ t, price, vol }]) en series
// listas para lightweight-charts (área de precio + histograma de volumen).

export const RANGES = {
  '7D': 7,
  '14D': 14,
  '30D': 30,
  All: Infinity,
}

function filterRange(history, rangeDays) {
  const valid = (history || []).filter((s) => s.price != null).sort((a, b) => a.t - b.t)
  if (!valid.length || rangeDays === Infinity) return valid
  const cutoff = valid.at(-1).t - rangeDays * 24 * 60 * 60
  const win = valid.filter((s) => s.t >= cutoff)
  return win.length >= 2 ? win : valid
}

/**
 * @returns {{ line: Array<{time,value}>, volumes: Array<{time,value,color}> }}
 */
export function toSeries(history, range = '14D') {
  const win = filterRange(history, RANGES[range] ?? 14)

  const line = win.map((s) => ({ time: s.t, value: s.price }))

  const volumes = win.map((s, i) => {
    const prev = win[i - 1]
    const up = prev ? s.price >= prev.price : true
    return {
      time: s.t,
      value: s.vol || 0,
      color: up ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)',
    }
  })

  return { line, volumes }
}

/** Métricas de cabecera dentro del rango seleccionado. */
export function computeStats(history, range = '14D') {
  const win = filterRange(history, RANGES[range] ?? 14)
  if (!win.length) return null

  const last = win.at(-1)
  const first = win[0]
  const prices = win.map((s) => s.price)
  const change = last.price - first.price
  const changePct = first.price ? (change / first.price) * 100 : 0

  return {
    price: last.price,
    change,
    changePct,
    high: Math.max(...prices),
    low: Math.min(...prices),
    volume: last.vol ?? 0,
    avgVolume: win.reduce((a, s) => a + (s.vol || 0), 0) / win.length,
    points: win.length,
    updated: last.t,
  }
}
