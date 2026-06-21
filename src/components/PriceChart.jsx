import { useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts'

export default function PriceChart({ line, volumes }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const areaRef = useRef(null)
  const volRef = useRef(null)

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
        vertLines: { color: 'rgba(43,53,71,0.35)' },
        horzLines: { color: 'rgba(43,53,71,0.35)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#3a4659', labelBackgroundColor: '#e8b14c', style: LineStyle.Dashed },
        horzLine: { color: '#3a4659', labelBackgroundColor: '#e8b14c', style: LineStyle.Dashed },
      },
      rightPriceScale: { borderColor: '#1f2735' },
      timeScale: { borderColor: '#1f2735', timeVisible: false, secondsVisible: false },
      autoSize: true,
    })

    const area = chart.addAreaSeries({
      lineColor: '#e8b14c',
      lineWidth: 2,
      topColor: 'rgba(232,177,76,0.28)',
      bottomColor: 'rgba(232,177,76,0.01)',
      priceLineColor: '#e8b14c',
      crosshairMarkerBackgroundColor: '#e8b14c',
      crosshairMarkerBorderColor: '#0a0d13',
    })

    const vol = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    })
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })

    chartRef.current = chart
    areaRef.current = area
    volRef.current = vol

    return () => {
      chart.remove()
      chartRef.current = null
    }
  }, [])

  // Actualizar datos
  useEffect(() => {
    if (!areaRef.current) return
    areaRef.current.setData(line || [])
    volRef.current.setData(volumes || [])
    chartRef.current?.timeScale().fitContent()
  }, [line, volumes])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      {(!line || line.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
          Sin histórico para este item.
        </div>
      )}
    </div>
  )
}
