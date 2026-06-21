import { useState } from 'react'

/** Icono oficial del item con fallback a la inicial si la imagen falla. */
export default function ItemIcon({ src, name, size = 32, className = '' }) {
  const [broken, setBroken] = useState(false)
  const px = { width: size, height: size }

  if (!src || broken) {
    return (
      <div
        style={px}
        className={`flex items-center justify-center rounded-md bg-base-600 text-xs font-bold text-accent ${className}`}
      >
        {(name || '?').charAt(0)}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      style={px}
      onError={() => setBroken(true)}
      className={`rounded-md object-contain ${className}`}
    />
  )
}
