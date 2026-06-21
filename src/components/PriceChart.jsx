import { useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts'

export default function PriceChart({ candles, volumes }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const candleSeriesRef = useRef(null)
  const volSeriesRef = useRef(null)

  // Crear el chart una sola vez
  useEffect(() => {
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8b97a7',
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(43,53,71,0.4)' },
        horzLines: { color: 'rgba(43,53,71,0.4)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#3a4659', labelBackgroundColor: '#e8b14c' },
        horzLine: { color: '#3a4659', labelBackgroundColor: '#e8b14c' },
      },
      rightPriceScale: { borderColor: '#1f2735' },
      timeScale: { borderColor: '#1f2735', timeVisible: true, secondsVisible: false },
      autoSize: true,
    })

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    })
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volSeriesRef.current = volSeries

    return () => {
      chart.remove()
      chartRef.current = null
    }
  }, [])

  // Actualizar datos cuando cambian
  useEffect(() => {
    if (!candleSeriesRef.current) return
    candleSeriesRef.current.setData(candles || [])
    volSeriesRef.current.setData(volumes || [])
    chartRef.current?.timeScale().fitContent()
  }, [candles, volumes])

  return (
    <div className="relative flex-1">
      <div ref={containerRef} className="absolute inset-0" />
      {(!candles || candles.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
          Aún no hay suficientes snapshots para dibujar velas.
        </div>
      )}
    </div>
  )
}
