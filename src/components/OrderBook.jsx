import { fmtPrice, fmtNum, fmtPct } from '../lib/format'

/**
 * Panel lateral derecho: resumen de estadísticas del rango + histórico diario
 * (fecha, precio, volumen). Los datos vienen de poe2scout (diarios).
 */
export default function OrderBook({ history, stats, currency }) {
  const rows = [...(history || [])].filter((s) => s.price != null).slice(-30).reverse()
  const up = (stats?.changePct ?? 0) >= 0

  return (
    <aside className="flex w-full shrink-0 flex-col border-t border-white/[0.06] bg-base-900/20 md:w-72 md:border-l md:border-t-0">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <span className="eyebrow !tracking-widest text-gray-400">Estadísticas</span>
      </div>

      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
        <Cell label="Último" value={fmtPrice(stats?.price)} className="text-gray-100" />
        <Cell label="Cambio" value={fmtPct(stats?.changePct)} className={up ? 'text-up' : 'text-down'} />
        <Cell label="Máx" value={fmtPrice(stats?.high)} className="text-up" />
        <Cell label="Mín" value={fmtPrice(stats?.low)} className="text-down" />
        <Cell label="Volumen" value={fmtNum(stats?.volume)} />
        <Cell label="Vol. medio" value={fmtNum(Math.round(stats?.avgVolume ?? 0))} />
      </div>

      <div className="eyebrow border-t border-white/[0.06] px-3 py-2">Histórico diario</div>
      <div className="max-h-[45vh] flex-1 overflow-y-auto md:max-h-none">
        <div className="grid grid-cols-3 gap-2 px-3 py-1 text-[10px] uppercase text-gray-600">
          <span>Fecha</span>
          <span className="text-right">Precio</span>
          <span className="text-right">Volumen</span>
        </div>
        {rows.map((s, i) => {
          const prev = rows[i + 1]
          const isUp = prev ? s.price >= prev.price : true
          return (
            <div
              key={s.t}
              className="grid grid-cols-3 gap-2 border-l-2 px-3 py-1 font-mono text-xs transition hover:bg-white/[0.03]"
              style={{ borderColor: isUp ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)' }}
            >
              <span className="text-gray-500">{fmtDay(s.t)}</span>
              <span className={`tnum text-right ${isUp ? 'text-up' : 'text-down'}`}>{fmtPrice(s.price)}</span>
              <span className="tnum text-right text-gray-400">{fmtNum(s.vol)}</span>
            </div>
          )
        })}
        {rows.length === 0 && <div className="p-3 text-sm text-gray-600">Sin histórico.</div>}
      </div>

      <div className="border-t border-white/[0.06] px-3 py-2 text-[10px] text-gray-600">
        precios en <span className="text-gray-400">{currency || 'exalted'}</span> · fuente poe2scout
      </div>
    </aside>
  )
}

function fmtDay(ts) {
  return new Date(ts * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function Cell({ label, value, className = '' }) {
  return (
    <div className="core px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`tnum font-mono text-sm text-gray-200 ${className}`}>{value}</div>
    </div>
  )
}
