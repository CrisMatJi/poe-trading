#!/usr/bin/env node
/**
 * Recolector de snapshots del mercado de Path of Exile.
 *
 * Flujo:
 *   1. Lee data/watchlist.json
 *   2. Para cada item consulta el endpoint "exchange" (bulk) de la API oficial
 *      de GGG, que devuelve los listings vivos de items fungibles.
 *   3. Calcula precio (ratio mediano), mejor precio, y un proxy de volumen
 *      (nº de listings + stock total disponible).
 *   4. Añade el snapshot a data/history/<id>.json (serie temporal creciente).
 *
 * La API de GGG:
 *   - NO se puede llamar desde el navegador (CORS). Por eso esto corre
 *     server-side en una GitHub Action.
 *   - Requiere cabecera User-Agent identificativa (con contacto) o te bloquean.
 *   - Requiere sesión: cookie POESESSID (GitHub Secret).
 *   - Aplica rate-limits estrictos vía cabeceras X-Rate-Limit-*. Los respetamos.
 *
 * Modo MOCK: si no hay POESESSID (o pasas --mock) genera datos sintéticos para
 * poder desarrollar/demostrar la web sin credenciales.
 *
 * Uso:
 *   node scripts/collect.mjs            # real si hay POESESSID, si no mock
 *   node scripts/collect.mjs --mock     # fuerza datos sintéticos
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
// La config vive en /data; las salidas servibles van a /public/data para que
// Vite las copie a /dist y el frontend estático pueda hacer fetch sin backend.
const OUT_DIR = path.join(ROOT, 'public', 'data')
const WATCHLIST_PATH = path.join(ROOT, 'data', 'watchlist.json')

// Nombre de carpeta seguro para una liga (que puede llevar espacios/acentos).
const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// --- Config / entorno -------------------------------------------------------
const POESESSID = process.env.POESESSID || ''
const CONTACT = process.env.CONTACT_EMAIL || 'tu-email@example.com'
const USER_AGENT = `PoE-Trading-Tracker/0.1 (contact: ${CONTACT})`
const FORCE_MOCK = process.argv.includes('--mock')
const USE_MOCK = FORCE_MOCK || !POESESSID

// Nº máximo de snapshots a conservar por item (~ rolling window).
const MAX_SNAPSHOTS = 4000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// --- API oficial GGG --------------------------------------------------------
function exchangeUrl(realm, league) {
  // trade2 = Path of Exile 2. Para PoE1 sería /api/trade/exchange/{league}.
  // OJO: GGG cambia rutas de cuando en cuando; verifica en docs/API.md.
  return `https://www.pathofexile.com/api/${realm === 'poe2' ? 'trade2' : 'trade'}/exchange/${realm}/${encodeURIComponent(league)}`
}

const apiHeaders = () => ({
  'Content-Type': 'application/json',
  'User-Agent': USER_AGENT,
  Cookie: `POESESSID=${POESESSID}`,
})

/** Lista de ligas disponibles para trade en la API oficial. */
async function fetchLeagues(realm) {
  const url = `https://www.pathofexile.com/api/${realm === 'poe2' ? 'trade2' : 'trade'}/data/leagues`
  const res = await rateLimitedFetch(url, { headers: apiHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status} al listar ligas: ${await res.text()}`)
  const json = await res.json()
  return (json?.result || []).map((l) => ({ id: l.id, text: l.text || l.id }))
}

/**
 * Datos estáticos: mapa id -> { text, icon } con los iconos oficiales del CDN.
 * Devuelve {} en modo mock o si falla (la UI usa un placeholder).
 */
async function fetchStatic(realm) {
  const url = `https://www.pathofexile.com/api/${realm === 'poe2' ? 'trade2' : 'trade'}/data/static`
  const res = await rateLimitedFetch(url, { headers: apiHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status} en data/static`)
  const json = await res.json()
  const map = {}
  for (const group of json?.result || []) {
    for (const e of group.entries || []) {
      if (!e.id) continue
      let icon = e.image || null
      if (icon && icon.startsWith('/')) icon = `https://www.pathofexile.com${icon}`
      map[e.id] = { text: e.text || e.id, icon }
    }
  }
  return map
}

/** Respeta rate-limit: si nos pasamos, GGG manda 429 + Retry-After. */
async function rateLimitedFetch(url, options, attempt = 0) {
  const res = await fetch(url, options)

  if (res.status === 429) {
    const retry = Number(res.headers.get('retry-after')) || 60
    console.warn(`  [429] rate-limit, esperando ${retry}s...`)
    await sleep(retry * 1000)
    if (attempt < 3) return rateLimitedFetch(url, options, attempt + 1)
  }

  // Margen preventivo según la cabecera de estado de rate-limit de GGG.
  const state = res.headers.get('x-rate-limit-account-state') || res.headers.get('x-rate-limit-ip-state')
  if (state) {
    // formato: "current:max:period,current:max:period"
    const worst = state.split(',').map((s) => s.split(':').map(Number))
    const near = worst.some(([cur, max]) => max && cur / max > 0.7)
    if (near) await sleep(4000)
  }

  return res
}

/** Consulta un item en el exchange y devuelve un snapshot crudo. */
async function fetchItem(item, { realm, league, currency }) {
  const body = {
    query: {
      status: { option: 'online' },
      have: [currency],
      want: [item.id],
    },
    sort: { have: 'asc' },
    engine: 'new',
  }

  const res = await rateLimitedFetch(exchangeUrl(realm, league), {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} para ${item.id}: ${await res.text()}`)
  }

  const json = await res.json()
  return parseExchange(json, currency)
}

/**
 * Convierte la respuesta del exchange en métricas.
 * Estructura aproximada: { result: { <id>: { listing: { offers: [
 *   { exchange: { amount, currency }, item: { amount, currency, stock } }
 * ] } } }, total }
 * Aislado a propósito: si GGG cambia el formato, se ajusta solo aquí.
 */
function parseExchange(json, currency) {
  const result = json?.result || {}
  const listings = Object.values(result)
  const ratios = []
  let totalStock = 0

  for (const entry of listings) {
    const offers = entry?.listing?.offers || []
    for (const offer of offers) {
      const want = offer?.exchange?.amount // lo que pides tú (en `currency`)
      const give = offer?.item?.amount // lo que te dan del item
      if (want > 0 && give > 0) {
        ratios.push(want / give) // precio del item en unidades de `currency`
        totalStock += offer?.item?.stock || give
      }
    }
  }

  ratios.sort((a, b) => a - b)
  const n = ratios.length
  const median = n ? ratios[Math.floor(n / 2)] : null

  return {
    price: median,
    low: n ? ratios[0] : null,
    high: n ? ratios[n - 1] : null,
    listings: n,
    stock: totalStock,
    currency,
  }
}

// --- Modo mock --------------------------------------------------------------
const MOCK_SEED = {
  exalted: 1, divine: 230, chaos: 1.3, annul: 14, vaal: 1.1, regal: 2.4, mirror: 180000,
}

function mockSnapshot(item, prev) {
  const base = prev ?? MOCK_SEED[item.id] ?? 10
  // random walk con ruido ~ ±4%
  const drift = (Math.random() - 0.5) * 0.08
  const price = Math.max(0.01, base * (1 + drift))
  const spread = price * (0.02 + Math.random() * 0.04)
  return {
    price: round(price),
    low: round(price - spread),
    high: round(price + spread),
    listings: Math.floor(20 + Math.random() * 180),
    stock: Math.floor(50 + Math.random() * 5000),
    currency: 'exalted',
  }
}

const round = (x) => (x == null ? null : Math.round(x * 1000) / 1000)

// --- Persistencia -----------------------------------------------------------
async function appendSnapshot(historyDir, id, snapshot, t) {
  const file = path.join(historyDir, `${id}.json`)
  let arr = []
  if (existsSync(file)) {
    try {
      arr = JSON.parse(await readFile(file, 'utf8'))
    } catch {
      arr = []
    }
  }
  arr.push({ t, ...snapshot })
  if (arr.length > MAX_SNAPSHOTS) arr = arr.slice(arr.length - MAX_SNAPSHOTS)
  await writeFile(file, JSON.stringify(arr))
  return arr
}

/** Variación % respecto al primer snapshot dentro de la ventana (por defecto 24h). */
function changePct(arr, windowSecs = 24 * 60 * 60) {
  const valid = arr.filter((s) => s.price != null)
  if (valid.length < 2) return 0
  const now = valid.at(-1).t
  const ref = valid.find((s) => s.t >= now - windowSecs) ?? valid[0]
  if (!ref.price) return 0
  return ((valid.at(-1).price - ref.price) / ref.price) * 100
}

/** Mini-serie de precios recientes para dibujar la sparkline del item. */
function sparkline(arr, n = 40) {
  return arr
    .filter((s) => s.price != null)
    .slice(-n)
    .map((s) => s.price)
}

/** Recolecta todos los items de una liga y escribe su carpeta de datos. */
async function collectLeague(league, { realm, currency, items, staticMap }) {
  const leagueDir = path.join(OUT_DIR, league.slug)
  const historyDir = path.join(leagueDir, 'history')
  await mkdir(historyDir, { recursive: true })
  const t = Math.floor(Date.now() / 1000)

  console.log(`\n[${league.text}] recolectando ${items.length} items | modo=${USE_MOCK ? 'MOCK' : 'REAL'}`)

  // cache de últimos precios para el random-walk del mock
  const prevPrices = {}
  if (USE_MOCK) {
    for (const it of items) {
      const f = path.join(historyDir, `${it.id}.json`)
      if (existsSync(f)) {
        try { prevPrices[it.id] = JSON.parse(await readFile(f, 'utf8')).at(-1)?.price } catch {}
      }
    }
  }

  const index = []
  for (const item of items) {
    try {
      const snap = USE_MOCK
        ? mockSnapshot(item, prevPrices[item.id])
        : await fetchItem(item, { realm, league: league.id, currency })

      const arr = await appendSnapshot(historyDir, item.id, snap, t)
      const meta = staticMap[item.id] || {}
      const name = item.name || meta.text || item.id
      index.push({
        ...item,
        name,
        icon: item.icon || meta.icon || null,
        ...snap,
        t,
        changePct: round(changePct(arr)),
        spark: sparkline(arr),
      })
      console.log(`  ✓ ${name.padEnd(22)} ${snap.price} ${snap.currency} (${snap.listings} listings)`)

      if (!USE_MOCK) await sleep(3500) // margen anti rate-limit
    } catch (err) {
      console.error(`  ✗ ${item.name}: ${err.message}`)
    }
  }

  await writeFile(
    path.join(leagueDir, 'index.json'),
    JSON.stringify({ league: league.id, leagueText: league.text, realm, currency, updated: t, items: index }, null, 2)
  )
  return index.length
}

// --- Main -------------------------------------------------------------------
async function main() {
  const watchlist = JSON.parse(await readFile(WATCHLIST_PATH, 'utf8'))
  await mkdir(OUT_DIR, { recursive: true })

  const { realm = 'poe2', currency = 'exalted', items = [] } = watchlist
  // `leagues` (array) tiene prioridad; si no, cae a `league` (string) legacy.
  const wanted = watchlist.leagues?.length
    ? watchlist.leagues
    : watchlist.league
      ? [watchlist.league]
      : []

  // Resolver la lista de ligas a recolectar.
  let leagues
  if (USE_MOCK) {
    leagues = (wanted.length ? wanted : ['Standard', 'Hardcore']).map((id) => ({ id, text: id }))
  } else {
    const all = await fetchLeagues(realm)
    leagues = wanted.length ? all.filter((l) => wanted.includes(l.id)) : all
    if (!leagues.length) {
      console.warn(`Ninguna de las ligas pedidas existe. Disponibles: ${all.map((l) => l.id).join(', ')}`)
    }
  }

  // Iconos oficiales (un único fetch, compartido por todas las ligas).
  let staticMap = {}
  if (!USE_MOCK) {
    try {
      staticMap = await fetchStatic(realm)
      console.log(`Iconos cargados desde data/static (${Object.keys(staticMap).length} entradas).`)
    } catch (e) {
      console.warn(`No se pudieron cargar iconos: ${e.message}`)
    }
  }

  const leaguesMeta = leagues.map((l) => ({ ...l, slug: slug(l.id) }))

  // Manifiesto de ligas que consume el selector del frontend.
  await writeFile(
    path.join(OUT_DIR, 'leagues.json'),
    JSON.stringify({ realm, updated: Math.floor(Date.now() / 1000), leagues: leaguesMeta }, null, 2)
  )

  for (const league of leaguesMeta) {
    await collectLeague(league, { realm, currency, items, staticMap })
  }

  console.log(`\nHecho. ${leaguesMeta.length} liga(s) en public/data/ (manifiesto: leagues.json).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
