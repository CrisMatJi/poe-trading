// Carga de datos del frontend. Lee los JSON estáticos generados por el
// recolector (scripts/collect.mjs) y servidos desde /public/data.
// Estructura: data/leagues.json + data/<slug>/index.json + data/<slug>/history/<id>.json
// Respeta BASE_URL para funcionar bajo subruta de GitHub Pages.

const BASE = import.meta.env.BASE_URL || '/'

async function getJSON(relPath) {
  const res = await fetch(`${BASE}data/${relPath}?_=${Date.now()}`)
  if (!res.ok) throw new Error(`No se pudo cargar ${relPath} (HTTP ${res.status})`)
  return res.json()
}

/** Manifiesto de ligas disponibles (para el selector). */
export function loadLeagues() {
  return getJSON('leagues.json')
}

/** Índice resumen de una liga: items con su última métrica. */
export function loadIndex(slug) {
  return getJSON(`${slug}/index.json`)
}

/** Serie temporal completa de un item dentro de una liga. */
export function loadHistory(slug, id) {
  return getJSON(`${slug}/history/${id}.json`)
}
