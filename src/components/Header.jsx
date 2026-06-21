import { TrendingUp, RefreshCw, Menu } from 'lucide-react'
import { fmtTime } from '../lib/format'

export default function Header({ leagues, leagueSlug, onLeagueChange, updated, onRefresh, refreshing, onMenu }) {
  return (
    <header className="glass sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          onClick={onMenu}
          aria-label="Abrir lista"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-base-800/80 text-gray-300 transition active:scale-95 md:hidden"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <div className="shell !p-1 hidden sm:block">
          <div className="core flex h-8 w-8 items-center justify-center bg-gradient-to-br from-accent-400 to-accent-600 shadow-glow">
            <TrendingUp className="h-4 w-4 text-base-950" strokeWidth={2} />
          </div>
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-tight text-gray-50">
            PoE<span className="text-accent">Trading</span>
          </div>
          <div className="eyebrow hidden sm:block">Path of Exile · Market</div>
        </div>

        <div className="ml-1 flex min-w-0 items-center gap-2 sm:ml-3">
          <span className="eyebrow hidden sm:inline">Liga</span>
          <select
            value={leagueSlug || ''}
            onChange={(e) => onLeagueChange(e.target.value)}
            className="max-w-[44vw] cursor-pointer truncate rounded-xl border border-white/[0.08] bg-base-800/80 px-3 py-1.5 text-xs font-semibold text-gray-100 shadow-bezel outline-none transition-all duration-500 ease-smooth hover:border-accent/50 focus:border-accent sm:max-w-none"
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
          className="group flex items-center gap-2 rounded-full border border-white/[0.08] bg-base-800/80 py-1.5 pl-1.5 pr-1.5 text-xs font-semibold text-gray-200 shadow-bezel transition-all duration-500 ease-smooth hover:border-accent/50 hover:text-white active:scale-[0.97] sm:pl-4"
        >
          <span className="hidden sm:inline">Refrescar</span>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] transition-all duration-500 ease-smooth group-hover:bg-accent/20">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : 'group-hover:rotate-45'} transition-transform duration-500 ease-smooth`} strokeWidth={1.75} />
          </span>
        </button>
      </div>
    </header>
  )
}
