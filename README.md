# PoE Trading

Web tipo terminal de trading (curva de precio, volumen, % de cambio, histórico)
para el mercado de **Path of Exile 2**, desplegada de forma estática en
**GitHub Pages**.

Inspirada en sitios como StockTwits / poe.ninja, pero con enfoque de *trading*:
gráfico de área por rango, volumen diario, selector de liga y buscador.

🌐 **En vivo:** https://crismatji.github.io/poe-trading/

## Cómo funciona (arquitectura)

Los datos vienen de la API de **[poe2scout](https://poe2scout.com)**, que ya
tiene **histórico acumulado** de precios + volumen (la API oficial de GGG solo da
listings vivos, sin histórico). Como poe2scout no permite CORS de forma fiable,
la llamada se hace server-side en una GitHub Action y el frontend solo lee JSON:

```
GitHub Action (cron)             Frontend estático (GitHub Pages)
─────────────────────            ────────────────────────────────
scripts/collect.mjs    ──JSON──▶  React + Vite + lightweight-charts
 • llama a poe2scout (server)      • lee /data/*.json (sin CORS, sin auth)
 • histórico + volumen + iconos    • dibuja área + volumen + stats
 • commitea public/data            • selector de liga + buscador
```

Sin credenciales: poe2scout no requiere auth. (Se conserva un recolector
alternativo por la API oficial de GGG en `scripts/collect-ggg.mjs`, que sí
necesita `POESESSID` y acumula histórico propio; opcional.)

## Desarrollo local

```bash
npm install
npm run collect      # descarga datos reales de poe2scout (sin credenciales)
npm run dev          # http://localhost:5173
```

## Configuración

Edita [data/watchlist.json](data/watchlist.json):

- `leagues`: ids de liga de poe2scout (p.ej. `"Runes of Aldur"`). Vacío `[]` = ligas actuales.
- `categories`: `currency`, `fragments`, `runes`, `essences`, `ultimatum`, `breach`, `abyss`, …
- `perPage`: items por página al paginar.

## Despliegue (GitHub Actions)

1. Sube el repo a GitHub y activa **Pages** (Settings → Pages → Source: GitHub Actions).
2. (Opcional) Secret `CONTACT_EMAIL` para el `User-Agent`.
3. Listo:
   - [.github/workflows/collect.yml](.github/workflows/collect.yml) recolecta cada
     30 min y commitea los datos.
   - [.github/workflows/deploy.yml](.github/workflows/deploy.yml) reconstruye y
     publica la web tras cada commit de datos o de código.

## Estructura

```
data/watchlist.json     config: ligas + categorías
public/data/            salida del recolector (leagues.json + <liga>/index.json + history/)
scripts/collect.mjs     recolector poe2scout (fuente principal)
scripts/collect-ggg.mjs recolector API oficial GGG (opcional, requiere POESESSID)
src/lib/candles.js      series diarias → área + volumen + stats
src/api/data.js         carga de los JSON estáticos
src/components/         Header, Watchlist, StatsBar, PriceChart, OrderBook
```

## Avisos

- Respeta los términos de uso de poe2scout; usa un `User-Agent` identificativo y
  no satures la API.
- El formato de la API puede cambiar; la transformación está aislada en
  `scripts/collect.mjs` (`toHistory`, `collectLeague`) para ajustarla fácil.
