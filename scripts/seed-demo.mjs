#!/usr/bin/env node
/**
 * Genera una liga "Demo" con histórico sintético realista para poder ver la
 * interfaz completa (velas, volumen, sparklines) sin esperar a que el cron
 * acumule snapshots reales.
 *
 * - Toma como semilla los items/precios/iconos de una liga real ya recolectada
 *   (por defecto runes-of-aldur). Si no existe, usa unos valores por defecto.
 * - NO toca los datos reales: escribe en public/data/demo/ y añade "Demo" al
 *   manifiesto leagues.json.
 *
 * Uso: node scripts/seed-demo.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'data')
const DEMO = path.join(OUT, 'demo')

const HOURS = 14 * 24 // ~2 semanas de histórico horario
const STEP = 3600 // 1 snapshot/hora

const round = (x) => Math.round(x * 1000) / 1000

const DEFAULTS = [
  { id: 'divine', name: 'Divine Orb', price: 285 },
  { id: 'chaos', name: 'Chaos Orb', price: 30 },
  { id: 'annul', name: 'Orb of Annulment', price: 90 },
  { id: 'vaal', name: 'Vaal Orb', price: 10 },
  { id: 'regal', name: 'Regal Orb', price: 5 },
  { id: 'alch', name: 'Orb of Alchemy', price: 10 },
]

async function seedItems() {
  const realIndex = path.join(OUT, 'runes-of-aldur', 'index.json')
  if (existsSync(realIndex)) {
    const idx = JSON.parse(await readFile(realIndex, 'utf8'))
    const withPrice = idx.items.filter((i) => i.price != null)
    if (withPrice.length) {
      return withPrice.map((i) => ({ id: i.id, name: i.name, icon: i.icon, category: i.category, price: i.price }))
    }
  }
  return DEFAULTS
}

/** Random walk con tendencia suave + algo de volatilidad. */
function genHistory(startPrice, now) {
  const snaps = []
  let price = startPrice * (0.8 + Math.random() * 0.2) // empieza algo por debajo
  const trend = (Math.random() - 0.35) * 0.004 // ligera deriva
  for (let i = HOURS; i >= 0; i--) {
    const t = now - i * STEP
    const noise = (Math.random() - 0.5) * 0.05
    price = Math.max(0.01, price * (1 + trend + noise))
    const spread = price * (0.015 + Math.random() * 0.03)
    snaps.push({
      t,
      price: round(price),
      low: round(price - spread),
      high: round(price + spread),
      listings: Math.floor(8 + Math.random() * 60),
      stock: Math.floor(40 + Math.random() * 4000),
      currency: 'exalted',
    })
  }
  return snaps
}

function changePct(arr, windowSecs = 24 * 3600) {
  const valid = arr.filter((s) => s.price != null)
  const now = valid.at(-1).t
  const ref = valid.find((s) => s.t >= now - windowSecs) ?? valid[0]
  return round(((valid.at(-1).price - ref.price) / ref.price) * 100)
}

async function main() {
  await mkdir(path.join(DEMO, 'history'), { recursive: true })
  const items = await seedItems()
  const now = Math.floor(Date.now() / 1000)
  const index = []

  for (const it of items) {
    const hist = genHistory(it.price, now)
    await writeFile(path.join(DEMO, 'history', `${it.id}.json`), JSON.stringify(hist))
    const last = hist.at(-1)
    index.push({
      id: it.id,
      name: it.name,
      icon: it.icon || null,
      category: it.category || 'currency',
      price: last.price,
      low: last.low,
      high: last.high,
      listings: last.listings,
      stock: last.stock,
      currency: 'exalted',
      t: now,
      changePct: changePct(hist),
      spark: hist.slice(-40).map((s) => s.price),
    })
  }

  await writeFile(
    path.join(DEMO, 'index.json'),
    JSON.stringify({ league: 'Demo', leagueText: 'Demo (datos sintéticos)', realm: 'poe2', currency: 'exalted', updated: now, items: index }, null, 2)
  )

  // Añadir Demo al manifiesto de ligas (al principio) sin duplicar.
  const manifestPath = path.join(OUT, 'leagues.json')
  let manifest = { realm: 'poe2', updated: now, leagues: [] }
  if (existsSync(manifestPath)) manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  manifest.leagues = manifest.leagues.filter((l) => l.slug !== 'demo')
  manifest.leagues.unshift({ id: 'Demo', text: 'Demo (datos sintéticos)', slug: 'demo' })
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2))

  console.log(`Liga Demo creada: ${index.length} items, ${HOURS + 1} snapshots/item (~14 días).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
