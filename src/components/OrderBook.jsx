import { fmtPrice, fmtNum, fmtTime } from '../lib/format'

/**
 * Panel lateral derecho estilo "tape": resumen de mercado + últimos ticks.
 * La API oficial no expone profundidad histórica, así que mostramos el spread
 * del último snapshot y el feed reciente de precios capturados.
 */
export default function OrderBook({ snapshots, currency }) {
  const recent = [...(snapshots || [])].filter((s) => s.price != null).slice(-40).reverse()
  const last = recent[0]
  const spread = last ? (last.high ?? last.price) - (last.low ?? last.price) : 0
  const spreadPct = last && last.price ? (spread / last.price) * 100 : 0

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-base-600/80 bg-base-800/40">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Mercado en vivo</span>
      </div>

      {/* Resumen del último snapshot */}
      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
        <Cell label="Bid (mín)" value={fmtPrice(last?.low)} className="text-up" />
        <Cell label="Ask (máx)" value={fmtPrice(last?.high)} className="text-down" />
        <Cell label="Spread" value={fmtPrice(spread)} />
        <Cell label="Spread %" value={spreadPct.toFixed(2) + '%'} />
        <Cell label="Listings" value={fmtNum(last?.listings)} />
        <Cell label="Stock" value={fmtNum(last?.stock)} />
      </div>

      {/* Feed reciente */}
      <div className="border-t border-base-600/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        Ticks recientes
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-2 px-3 py-1 text-[10px] uppercase text-gray-600">
          <span>Hora</span>
          <span className="text-right">Precio</span>
          <span className="text-right">Listings</span>
        </div>
        {recent.map((s, i) => {
          const prev = recent[i + 1]
          const up = prev ? s.price >= prev.price : true
          return (
            <div
              key={s.t}
              className="grid grid-cols-3 gap-2 border-l-2 px-3 py-1 font-mono text-xs transition hover:bg-base-700/40"
              style={{ borderColor: up ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)' }}
            >
              <span className="text-gray-500">{fmtTime(s.t).split(' ')[1] || fmtTime(s.t)}</span>
              <span className={`tnum text-right ${up ? 'text-up' : 'text-down'}`}>{fmtPrice(s.price)}</span>
              <span className="tnum text-right text-gray-400">{fmtNum(s.listings)}</span>
            </div>
          )
        })}
        {recent.length === 0 && <div className="p-3 text-sm text-gray-600">Sin ticks todavía.</div>}
      </div>

      <div className="border-t border-base-600/80 px-3 py-2 text-[10px] text-gray-600">
        precios en <span className="text-gray-400">{currency || 'exalted'}</span>
      </div>
    </aside>
  )
}

function Cell({ label, value, className = '' }) {
  return (
    <div className="rounded-lg border border-base-600/70 bg-base-900/50 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`tnum font-mono text-sm text-gray-200 ${className}`}>{value}</div>
    </div>
  )
}
