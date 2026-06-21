import { useEffect, useMemo, useState, useCallback } from 'react'
import Header from './components/Header'
import Watchlist from './components/Watchlist'
import StatsBar from './components/StatsBar'
import PriceChart from './components/PriceChart'
import OrderBook from './components/OrderBook'
import { loadLeagues, loadIndex, loadHistory } from './api/data'
import { toCandles, computeStats, TIMEFRAMES } from './lib/candles'

export default function App() {
  const [leagues, setLeagues] = useState([])
  const [leagueSlug, setLeagueSlug] = useState(null)
  const [index, setIndex] = useState(null)
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState([])
  const [timeframe, setTimeframe] = useState('1h')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Cargar manifiesto de ligas al arrancar
  useEffect(() => {
    loadLeagues()
      .then((m) => {
        setLeagues(m.leagues || [])
        setLeagueSlug((cur) => cur || m.leagues?.[0]?.slug || null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Cargar índice de la liga seleccionada
  const fetchIndex = useCallback(async () => {
    if (!leagueSlug) return
    try {
      const idx = await loadIndex(leagueSlug)
      setIndex(idx)
      setSelected(idx.items[0]?.id || null)
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }, [leagueSlug])

  useEffect(() => {
    fetchIndex()
  }, [fetchIndex])

  // Cargar histórico del item seleccionado
  useEffect(() => {
    if (!leagueSlug || !selected) return
    let cancelled = false
    loadHistory(leagueSlug, selected)
      .then((h) => !cancelled && setHistory(h))
      .catch(() => !cancelled && setHistory([]))
    return () => {
      cancelled = true
    }
  }, [leagueSlug, selected])

  const { candles, volumes } = useMemo(
    () => toCandles(history, timeframe),
    [history, timeframe]
  )
  const stats = useMemo(() => computeStats(history), [history])

  const selectedItem = index?.items.find((it) => it.id === selected)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchIndex()
      if (leagueSlug && selected) {
        const h = await loadHistory(leagueSlug, selected)
        setHistory(h)
      }
    } catch {
      /* el error ya se refleja vía fetchIndex */
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        leagues={leagues}
        leagueSlug={leagueSlug}
        onLeagueChange={setLeagueSlug}
        updated={index?.updated}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {error && (
        <div className="border-b border-down/30 bg-down-soft px-4 py-2 text-sm text-down">
          Error cargando datos: {error}. ¿Has ejecutado el recolector (<span className="font-mono">npm run collect</span>)?
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <Watchlist
          items={index?.items || []}
          selected={selected}
          onSelect={setSelected}
          currency={index?.currency}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <StatsBar item={selectedItem} currency={index?.currency} stats={stats} />

          <div className="flex items-center gap-1.5 border-b border-base-600/80 bg-base-800/30 px-4 py-2">
            <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-gray-500">
              Intervalo
            </span>
            {Object.keys(TIMEFRAMES).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  tf === timeframe
                    ? 'bg-accent text-base-900 shadow-glow'
                    : 'text-gray-400 hover:bg-base-700 hover:text-gray-100'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <PriceChart candles={candles} volumes={volumes} />
        </main>

        <OrderBook snapshots={history} currency={index?.currency} />
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-base-900/70 text-gray-400 backdrop-blur-sm">
          Cargando mercado…
        </div>
      )}
    </div>
  )
}
