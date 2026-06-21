# Notas sobre la API de GGG (Path of Exile)

> Resumen práctico para el recolector. La fuente oficial es
> <https://www.pathofexile.com/developer/docs>. Las rutas de **trade2 (PoE2)**
> han cambiado en el pasado: verifica si algo deja de funcionar.

## 1. Conseguir el `POESESSID`

La API de trade/exchange requiere estar logueado. La forma más simple es usar la
cookie de sesión del navegador:

1. Inicia sesión en <https://www.pathofexile.com>.
2. Abre DevTools → pestaña **Application/Almacenamiento** → **Cookies** →
   `https://www.pathofexile.com`.
3. Copia el valor de **`POESESSID`**.
4. Úsalo como variable de entorno (`POESESSID=...`) o GitHub Secret.

> ⚠️ Es una credencial sensible: equivale a tu sesión. No la subas al repo; úsala
> solo como Secret. Caduca cada cierto tiempo y habrá que renovarla.

## 2. User-Agent

GGG exige un `User-Agent` descriptivo con contacto. El recolector envía:

```
PoE-Trading-Tracker/0.1 (contact: <CONTACT_EMAIL>)
```

Define `CONTACT_EMAIL` para que sea tu email real. Sin User-Agent adecuado
puedes recibir bloqueos.

## 3. Endpoint exchange (bulk) — items fungibles

Usado para currency / fragmentos / runas (todo lo que tiene precio por unidad):

```
POST https://www.pathofexile.com/api/trade2/exchange/poe2/{league}
Content-Type: application/json
Cookie: POESESSID=...
User-Agent: ...

{
  "query": { "status": { "option": "online" }, "have": ["exalted"], "want": ["divine"] },
  "sort": { "have": "asc" },
  "engine": "new"
}
```

Respuesta (aprox.): objeto `result` indexado por listing, cada uno con `offers`
que contienen `exchange` (lo que pides) e `item` (lo que te dan, con `stock`).
El parser está en `scripts/collect.mjs` → `parseExchange()`.

## 4. IDs de items (`want` / `have`)

Los IDs del exchange son identificadores internos de GGG (`exalted`, `divine`,
`chaos`, `annul`, `vaal`, `regal`, `mirror`, ...). Para obtener la lista completa
y vigente de la liga actual:

```
GET https://www.pathofexile.com/api/trade2/data/static
```

Ahí vienen las categorías (Currency, Fragments, Runes...) con el `id` y el `text`
de cada item. Copia los `id` que quieras a `data/watchlist.json`.

## 5. Rate limits

GGG devuelve cabeceras `X-Rate-Limit-*` y `Retry-After`. El recolector:

- Espera el `Retry-After` ante un `429`.
- Mete pausas entre items (2.5 s) y un margen extra si se acerca al límite.

Si trackeas muchos items, sube el intervalo del cron o reduce la watchlist.

## 6. PoE1 vs PoE2

- PoE2 → `realm: "poe2"` → rutas `/api/trade2/...`
- PoE1 → `realm: "pc"` (u otros) → rutas `/api/trade/...`

`exchangeUrl()` en el recolector ya conmuta según `realm`.
