import { fmtPrice, fmtNum, fmtPct } from '../lib/format'
import ItemIcon from './ItemIcon'

function Stat({ label, value, className = '' }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{label}</span>
      <span className={`tnum font-mono text-sm ${className}`}>{value}</span>
    </div>
  )
}

export default function StatsBar({ item, currency, stats }) {
  const up = (stats?.changePct ?? 0) >= 0
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-base-600/80 bg-base-800/30 px-5 py-3.5">
      {/* Identidad del item */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-base-600 bg-base-900/60 p-1.5">
          <ItemIcon src={item?.icon} name={item?.name} size={40} />
        </div>
        <div>
          <div className="text-lg font-bold leading-tight text-gray-50">{item?.name || '—'}</div>
          <div className="text-[11px] capitalize text-gray-500">
            {item?.category || 'item'} · precio en {currency || 'exalted'}
          </div>
        </div>
      </div>

      {/* Precio grande + variación */}
      <div className="flex items-end gap-3">
        <span className="tnum font-mono text-3xl font-bold leading-none text-white">
          {fmtPrice(stats?.price)}
        </span>
        <span
          className={`tnum mb-0.5 rounded-md px-2 py-0.5 font-mono text-sm font-semibold ${
            up ? 'bg-up-soft text-up' : 'bg-down-soft text-down'
          }`}
        >
          {fmtPct(stats?.changePct)}
        </span>
      </div>

      {/* Stats secundarias */}
      <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
        <Stat label="Máx 24h" value={fmtPrice(stats?.high)} className="text-gray-300" />
        <Stat label="Mín 24h" value={fmtPrice(stats?.low)} className="text-gray-300" />
        <Stat label="Volumen" value={fmtNum(stats?.volume)} className="text-gray-300" />
        <Stat label="Listings" value={fmtNum(stats?.listings)} className="text-gray-300" />
        <Stat label="Stock" value={fmtNum(stats?.stock)} className="text-gray-300" />
      </div>
    </div>
  )
}
