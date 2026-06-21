#!/usr/bin/env node
/**
 * Recolector de datos del mercado de Path of Exile 2 usando la API de
 * poe2scout (https://poe2scout.com), que YA tiene histórico acumulado de
 * precios + volumen. A diferencia de la API oficial de GGG:
 *   - Devuelve histórico diario (PriceLogs) en una sola llamada.
 *   - Incluye volumen (cantidad comerciada) y % de cambio.
 *   - No requiere autenticación ni cookie (no caduca, sin rate-limit estricto).
 *
 * Escribe, por liga, en public/data/<slug>/:
 *   - index.json  : items con su última métrica (para sidebar/tabla)
 *   - history/<id>.json : serie temporal diaria [{ t, price, vol }]
 * Y un manifiesto public/data/leagues.json para el selector de ligas.
 *
 * La API de poe2scout no permite CORS de forma fiable, por eso esto corre
 * server-side en la GitHub Action y el frontend solo lee los JSON resultantes.
 *
 * Uso: node scripts/collect.mjs
 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'data')
const WATCHLIST_PATH = path.join(ROOT, 'data', 'watchlist.json')

const API = 'https://poe2scout.com/api'
const CONTACT = (process.env.CONTACT_EMAIL || 'tu-email@example.com').trim()
const USER_AGENT = `PoE-Trading-Tracker/0.2 (+poe2scout; contact: ${CONTACT})`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const round = (x) => (x == null ? null : Math.round(x * 1000) / 1000)

const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// --- HTTP -------------------------------------------------------------------
async function getJSON(url, attempt = 0) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } })
  if (res.status === 429 || res.status >= 500) {
    if (attempt < 3) {
      const wait = (attempt + 1) * 4000
      console.warn(`  [${res.status}] reintentando en ${wait / 1000}s...`)
      await sleep(wait)
      return getJSON(url, attempt + 1)
    }
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`)
  return res.json()
}

// --- API poe2scout ----------------------------------------------------------
function fixIcon(u) {
  if (!u) return null
  return u.replace('web.poecdn.com//', 'web.poecdn.com/') // normaliza doble barra
}

async function fetchLeagues(realm) {
  const raw = await getJSON(`${API}/${realm}/Leagues`)
  return raw.map((l) => ({
    id: l.Value,
    text: l.Value,
    short: l.ShortName,
    current: !!l.IsCurrent,
    divinePrice: l.DivinePrice,
  }))
}

/** Trae todas las páginas de una categoría de currency de una liga. */
async function fetchCategory(realm, leagueId, category, perPage) {
  const lg = encodeURIComponent(leagueId)
  let page = 1
  let pages = 1
  const all = []
  do {
    const url = `${API}/${realm}/Leagues/${lg}/Currencies/ByCategory?Category=${encodeURIComponent(category)}&Page=${page}&PerPage=${perPage}`
    const data = await getJSON(url)
    pages = data.Pages || 1
    for (const it of data.Items || []) all.push(it)
    page++
    await sleep(250)
  } while (page <= pages)
  return all
}

// --- Transformación ---------------------------------------------------------
function toHistory(priceLogs = []) {
  return priceLogs
    .filter((p) => p && p.Price != null && p.Time)
    .map((p) => ({ t: Math.floor(Date.parse(p.Time + 'Z') / 1000), price: round(p.Price), vol: p.Quantity ?? 0 }))
    .sort((a, b) => a.t - b.t)
}

/** % de cambio entre el último punto y el de ~24h antes (último día). */
function changePct(hist) {
  if (hist.length < 2) return 0
  const last = hist.at(-1).price
  const prev = hist.at(-2).price
  if (!prev) return 0
  return round(((last - prev) / prev) * 100)
}

// --- Recolección por liga ---------------------------------------------------
async function collectLeague(realm, league, categories, perPage) {
  const leagueDir = path.join(OUT_DIR, league.slug)
  const historyDir = path.join(leagueDir, 'history')
  await rm(leagueDir, { recursive: true, force: true }) // datos autoritativos: reemplazamos
  await mkdir(historyDir, { recursive: true })

  console.log(`\n[${league.text}] categorías: ${categories.join(', ')}`)
  const index = []
  const seen = new Set()

  for (const category of categories) {
    let items = []
    try {
      items = await fetchCategory(realm, league.id, category, perPage)
    } catch (e) {
      console.error(`  ✗ categoría ${category}: ${e.message}`)
      continue
    }

    for (const it of items) {
      // La divisa base (exalted) vale 1 contra sí misma: no aporta como item.
      if (it.ApiId === 'exalted') continue
      const id = slug(`${it.ApiId}`)
      if (!id || seen.has(id)) continue
      seen.add(id)

      const hist = toHistory(it.PriceLogs)
      const price = round(it.CurrentPrice ?? hist.at(-1)?.price ?? null)
      if (price == null) continue

      await writeFile(path.join(historyDir, `${id}.json`), JSON.stringify(hist))

      const prices = hist.map((h) => h.price)
      index.push({
        id,
        apiId: it.ApiId,
        name: it.Text || it.ApiId,
        icon: fixIcon(it.IconUrl || it.ItemMetadata?.icon),
        category,
        price,
        changePct: changePct(hist),
        volume: it.CurrentQuantity ?? hist.at(-1)?.vol ?? 0,
        high: prices.length ? Math.max(...prices) : price,
        low: prices.length ? Math.min(...prices) : price,
        spark: prices.slice(-30),
      })
    }
    console.log(`  ✓ ${category.padEnd(12)} ${items.length} items`)
  }

  // ordena por volumen desc (los más comerciados primero)
  index.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))

  await writeFile(
    path.join(leagueDir, 'index.json'),
    JSON.stringify(
      { league: league.id, leagueText: league.text, realm, currency: 'exalted', updated: Math.floor(Date.now() / 1000), items: index },
      null,
      2
    )
  )
  console.log(`  → ${index.length} items escritos en ${league.slug}/`)
  return index.length
}

// --- Main -------------------------------------------------------------------
async function main() {
  const watchlist = JSON.parse(await readFile(WATCHLIST_PATH, 'utf8'))
  const {
    realm = 'poe2',
    categories = ['currency', 'fragments', 'runes', 'essences'],
    perPage = 250,
  } = watchlist
  await mkdir(OUT_DIR, { recursive: true })

  console.log(`Fuente: poe2scout | realm=${realm} | categorías=${categories.join(',')}`)

  const all = await fetchLeagues(realm)
  const wanted = watchlist.leagues?.length ? watchlist.leagues : null
  // Si hay lista explícita, respeta su orden (la 1ª será la liga por defecto en la UI).
  let leagues = wanted
    ? wanted.map((id) => all.find((l) => l.id === id)).filter(Boolean)
    : all.filter((l) => l.current)
  if (!leagues.length) {
    console.warn(`Sin ligas que coincidan; uso todas. Disponibles: ${all.map((l) => l.id).join(', ')}`)
    leagues = all
  }

  const leaguesMeta = leagues.map((l) => ({ ...l, slug: slug(l.id) }))
  await writeFile(
    path.join(OUT_DIR, 'leagues.json'),
    JSON.stringify(
      { realm, source: 'poe2scout', updated: Math.floor(Date.now() / 1000), leagues: leaguesMeta.map(({ id, text, slug, current }) => ({ id, text, slug, current })) },
      null,
      2
    )
  )

  for (const league of leaguesMeta) {
    await collectLeague(realm, league, categories, perPage)
  }

  console.log(`\nHecho. ${leaguesMeta.length} liga(s) en public/data/ (fuente poe2scout).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
