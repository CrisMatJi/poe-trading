import { fmtPrice, fmtNum, fmtPct } from '../lib/format'
import ItemIcon from './ItemIcon'

function Stat({ label, value, className = '' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="eyebrow">{label}</span>
      <span className={`tnum font-mono text-sm ${className}`}>{value}</span>
    </div>
  )
}

export default function StatsBar({ item, currency, stats }) {
  const up = (stats?.changePct ?? 0) >= 0
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-white/[0.06] bg-base-900/20 px-3 py-3 sm:gap-x-8 sm:px-5 sm:py-4">
      {/* Identidad del item — doble bisel */}
      <div className="flex items-center gap-3">
        <div className="shell">
          <div className="core p-1.5">
            <ItemIcon src={item?.icon} name={item?.name} size={40} />
          </div>
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
        <span className="tnum font-mono text-[2rem] font-bold leading-none text-white">
          {fmtPrice(stats?.price)}
        </span>
        <span
          className={`tnum mb-0.5 rounded-lg px-2 py-0.5 font-mono text-sm font-semibold ring-1 ${
            up ? 'bg-up-soft text-up ring-up/20' : 'bg-down-soft text-down ring-down/20'
          }`}
        >
          {fmtPct(stats?.changePct)}
        </span>
      </div>

      {/* Stats secundarias */}
      <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
        <Stat label="Máx" value={fmtPrice(stats?.high)} className="text-up" />
        <Stat label="Mín" value={fmtPrice(stats?.low)} className="text-down" />
        <Stat label="Volumen" value={fmtNum(stats?.volume)} className="text-gray-300" />
        <Stat label="Vol. medio" value={fmtNum(Math.round(stats?.avgVolume ?? 0))} className="text-gray-300" />
      </div>
    </div>
  )
}
