import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { fmtPrice, fmtPct } from '../lib/format'
import ItemIcon from './ItemIcon'
import Sparkline from './Sparkline'

export default function Watchlist({ items, selected, onSelect, currency }) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = needle
      ? items.filter((it) => it.name?.toLowerCase().includes(needle))
      : items
    // los que tienen precio primero, luego por % de cambio desc
    return [...list].sort((a, b) => {
      if ((a.price == null) !== (b.price == null)) return a.price == null ? 1 : -1
      return (b.changePct ?? 0) - (a.changePct ?? 0)
    })
  }, [items, q])

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-base-600/80 bg-base-800/40">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Mercado</span>
        <span className="rounded-full bg-base-600 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
          {items.length}
        </span>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar item…"
            className="w-full rounded-lg border border-base-600 bg-base-900/60 py-1.5 pl-8 pr-2 text-sm text-gray-200 outline-none transition placeholder:text-gray-600 focus:border-accent/60"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-2">
        {filtered.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-gray-600">Sin resultados.</div>
        )}
        {filtered.map((it) => {
          const up = (it.changePct ?? 0) >= 0
          const active = it.id === selected
          const noData = it.price == null
          return (
            <button
              key={it.id}
              onClick={() => onSelect(it.id)}
              className={`group relative flex w-full items-center gap-2.5 px-3 py-2 text-left transition ${
                active ? 'bg-base-700/70' : 'hover:bg-base-700/40'
              }`}
            >
              {active && <span className="absolute inset-y-1 left-0 w-0.5 rounded-r bg-accent" />}
              <ItemIcon src={it.icon} name={it.name} size={30} />

              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-gray-100">{it.name}</div>
                <div className="text-[11px] text-gray-500">
                  {noData ? 'sin listings' : `${it.listings} listings`}
                </div>
              </div>

              <Sparkline data={it.spark} up={up} width={56} height={22} />

              <div className="w-[68px] text-right">
                <div className="tnum font-mono text-[13px] text-gray-100">
                  {noData ? '—' : fmtPrice(it.price)}
                </div>
                <div
                  className={`tnum inline-block rounded px-1 font-mono text-[11px] ${
                    noData
                      ? 'text-gray-600'
                      : up
                        ? 'bg-up-soft text-up'
                        : 'bg-down-soft text-down'
                  }`}
                >
                  {noData ? '—' : fmtPct(it.changePct)}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="border-t border-base-600/80 px-3 py-2 text-[10px] text-gray-600">
        precios en <span className="text-gray-400">{currency || 'exalted'}</span>
      </div>
    </aside>
  )
}
