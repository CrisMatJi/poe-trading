// Mini-curva SVG sin dependencias. Verde si sube en el tramo, rojo si baja.
export default function Sparkline({ data, width = 72, height = 24, up }) {
  const pts = (data || []).filter((n) => n != null)
  if (pts.length < 2) {
    return <svg width={width} height={height} className="opacity-30" />
  }

  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const range = max - min || 1
  const stepX = width / (pts.length - 1)
  const isUp = up ?? pts.at(-1) >= pts[0]
  const color = isUp ? '#22c55e' : '#ef4444'

  const coords = pts.map((v, i) => [i * stepX, height - ((v - min) / range) * height])
  const line = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const id = `spark-${color.slice(1)}`

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
