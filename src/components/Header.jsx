import { TrendingUp, RefreshCw } from 'lucide-react'
import { fmtTime } from '../lib/format'

export default function Header({ leagues, leagueSlug, onLeagueChange, updated, onRefresh, refreshing }) {
  return (
    <header className="glass z-20 flex items-center justify-between border-b border-base-600/80 px-4 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 shadow-glow">
          <TrendingUp className="h-5 w-5 text-base-900" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-extrabold tracking-tight text-gray-50">
            PoE<span className="text-accent">Trading</span>
          </div>
          <div className="text-[10px] font-medium uppercase tracking-widest text-gray-500">
            Path of Exile · Market
          </div>
        </div>

        <div className="ml-2 flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Liga</span>
          <select
            value={leagueSlug || ''}
            onChange={(e) => onLeagueChange(e.target.value)}
            className="cursor-pointer rounded-lg border border-base-500 bg-base-700 px-3 py-1.5 text-xs font-semibold text-gray-100 outline-none transition hover:border-accent/60 focus:border-accent"
          >
            {(!leagues || leagues.length === 0) && <option value="">— sin ligas —</option>}
            {leagues?.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.text}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 text-xs text-gray-500 sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-up" />
          </span>
          <span>Actualizado {fmtTime(updated)}</span>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 rounded-lg border border-base-500 bg-base-700 px-3 py-1.5 text-xs font-semibold text-gray-200 transition hover:border-accent/60 hover:text-white"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refrescar
        </button>
      </div>
    </header>
  )
}
