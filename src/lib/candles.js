// Agregación de snapshots crudos -> velas OHLC + volumen, listo para
// lightweight-charts. Cada snapshot es { t, price, low, high, listings, stock }.

/** Devuelve el tamaño de bucket (segundos) para un timeframe dado. */
export const TIMEFRAMES = {
  '5m': 5 * 60,
  '15m': 15 * 60,
  '1h': 60 * 60,
  '4h': 4 * 60 * 60,
  '1d': 24 * 60 * 60,
}

/**
 * Agrupa snapshots en velas OHLC según el timeframe.
 * @param {Array<{t:number, price:number, listings:number, stock:number}>} snapshots
 * @param {string} timeframe clave de TIMEFRAMES
 * @returns {{ candles: Array, volumes: Array }}
 */
export function toCandles(snapshots, timeframe = '1h') {
  const bucketSize = TIMEFRAMES[timeframe] || TIMEFRAMES['1h']
  const buckets = new Map()

  for (const s of snapshots) {
    if (s.price == null) continue
    const bucket = Math.floor(s.t / bucketSize) * bucketSize
    let b = buckets.get(bucket)
    if (!b) {
      b = { time: bucket, open: s.price, high: s.price, low: s.price, close: s.price, vol: 0 }
      buckets.set(bucket, b)
    }
    b.high = Math.max(b.high, s.high ?? s.price)
    b.low = Math.min(b.low, s.low ?? s.price)
    b.close = s.price
    // proxy de volumen: nº de listings disponibles en el snapshot
    b.vol += s.listings || 0
  }

  const sorted = [...buckets.values()].sort((a, b) => a.time - b.time)

  const candles = sorted.map((b) => ({
    time: b.time,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
  }))

  const volumes = sorted.map((b) => ({
    time: b.time,
    value: b.vol,
    color: b.close >= b.open ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)',
  }))

  return { candles, volumes }
}

/** Métricas de cabecera a partir de la serie de snapshots. */
export function computeStats(snapshots, windowSecs = 24 * 60 * 60) {
  const valid = snapshots.filter((s) => s.price != null)
  if (!valid.length) return null

  const last = valid.at(-1)
  const now = last.t
  const windowStart = now - windowSecs
  const win = valid.filter((s) => s.t >= windowStart)

  const first = win[0] ?? valid[0]
  const change = last.price - first.price
  const changePct = first.price ? (change / first.price) * 100 : 0

  const prices = win.map((s) => s.price)
  return {
    price: last.price,
    change,
    changePct,
    high: Math.max(...prices),
    low: Math.min(...prices),
    listings: last.listings ?? 0,
    stock: last.stock ?? 0,
    volume: win.reduce((acc, s) => acc + (s.listings || 0), 0),
    currency: last.currency,
    updated: last.t,
  }
}
