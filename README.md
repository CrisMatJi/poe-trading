# PoE Trading

Web tipo terminal de trading (velas OHLC, volumen, spread, tape de precios) para
el mercado de **Path of Exile 2**, alimentada por la API oficial de GGG y
desplegada de forma estática en **GitHub Pages**.

Inspirada en sitios como StockTwits / poe.ninja, pero con enfoque de *trading*:
gráficos de velas por timeframe, volumen y libro de mercado.

## Cómo funciona (arquitectura)

La API oficial de GGG **no se puede llamar desde el navegador** (CORS), requiere
sesión y **no da histórico**. Por eso se separa en dos piezas:

```
GitHub Action (cron)            Frontend estático (GitHub Pages)
─────────────────────           ────────────────────────────────
scripts/collect.mjs    ──JSON──▶  React + Vite + lightweight-charts
 • llama a GGG (server)            • lee /data/*.json (sin CORS, sin auth)
 • POESESSID (secret)              • agrega snapshots → velas OHLC + volumen
 • commitea public/data            • pinta gráficos de trading
```

El recolector va **acumulando** snapshots a lo largo del tiempo: así se construye
el histórico que ni la API ni un sitio estático tendrían por sí solos.

## Desarrollo local

```bash
npm install
npm run collect      # genera datos (MOCK si no hay POESESSID)
npm run seed:demo    # opcional: liga "Demo" con histórico sintético (velas/sparklines)
npm run dev          # http://localhost:5173
```

> `seed:demo` crea una liga **Demo** con ~14 días de histórico sintético para ver
> la interfaz completa (velas, volumen, sparklines) sin esperar a que el cron
> acumule snapshots reales. No toca los datos reales. Bórrala con
> `rm -rf public/data/demo` y reejecutando `npm run collect`.

En modo MOCK el recolector genera precios sintéticos (random walk) para que puedas
ver la web funcionando sin credenciales. Ejecuta `npm run collect` varias veces
para acumular más velas.

## Datos reales

1. Consigue tu `POESESSID` (cookie de sesión de pathofexile.com) — ver
   [docs/API.md](docs/API.md).
2. Edita [data/watchlist.json](data/watchlist.json): liga, realm e items.
3. Define la cookie y ejecuta:
   ```bash
   POESESSID=xxxxx CONTACT_EMAIL=tu@email.com npm run collect
   ```

## Despliegue (GitHub Actions)

1. Sube el repo a GitHub y activa **Pages** (Settings → Pages → Source: GitHub Actions).
2. En **Settings → Secrets and variables → Actions** añade:
   - `POESESSID` — tu cookie de sesión.
   - `CONTACT_EMAIL` — email de contacto (GGG exige User-Agent identificativo).
3. Listo:
   - [.github/workflows/collect.yml](.github/workflows/collect.yml) recolecta cada
     30 min y commitea los snapshots.
   - [.github/workflows/deploy.yml](.github/workflows/deploy.yml) reconstruye y
     publica la web tras cada commit de datos o de código.

> Sin el secret `POESESSID`, el workflow funciona igualmente en modo MOCK, útil
> para probar el pipeline completo antes de meter credenciales.

## Estructura

```
data/watchlist.json     config: liga + items a trackear
public/data/            salida del recolector (índice + histórico por item)
scripts/collect.mjs     recolector (real / mock)
src/lib/candles.js      agregación snapshots → OHLC + volumen + stats
src/api/data.js         carga de los JSON estáticos
src/components/         Header, Watchlist, StatsBar, PriceChart, OrderBook
```

## Avisos

- Respeta los [términos de la API de GGG](https://www.pathofexile.com/developer/docs).
  Usa un `User-Agent` identificativo y no satures los rate-limits.
- Las rutas/formato de la API trade2 de PoE2 pueden cambiar; el parser está
  aislado en `scripts/collect.mjs` (`parseExchange`) y `exchangeUrl` para
  ajustarlo fácil. Ver [docs/API.md](docs/API.md).
