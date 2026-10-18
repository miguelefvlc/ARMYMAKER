# Bolt Action v3 — Multi-Faction Army List Builder
Clean, fast, standalone Army List Builder for **Bolt Action: Third Edition**, powered directly by official **EasyArmy (`wg.easyarmy.com`)** scraped datasets and local unit illustrations.

> 📚 **Documentación técnica completa**: Consulta [`ARCHITECTURE.md`](./ARCHITECTURE.md) para conocer en detalle la arquitectura del motor, el flujo de componentes y la guía paso a paso para añadir nuevas facciones.
## Architecture & Multi-Faction Scalability
- **[`index.html`](file:///c:/Users/mipas/Desktop/listmaker/index.html)** — 100% faction-agnostic React application engine (compatible directly with Live Server or `start.bat`). Uses official EasyArmy English nomenclature, 5-column platoon layouts, period selectors (`All`, `Early War`, `Mid War`, `Late War`), full-window unit editor with right-side unit illustrations, and A4 PDF / JSON roster export.
- **`factions/`** — Self-contained faction modules:
  - [`factions/soviet_union.md`](file:///c:/Users/mipas/Desktop/listmaker/factions/soviet_union.md) — Complete, organized Markdown reference (Army Special Rules, Platoon Selectors, Slot Catalog, 124 Unit Datasheets, and A–Z Special Rules Glossary).
  - [`factions/soviet_union.json`](file:///c:/Users/mipas/Desktop/listmaker/factions/soviet_union.json) — Structured JSON dataset.
  - [`factions/soviet_union_app_data.js`](file:///c:/Users/mipas/Desktop/listmaker/factions/soviet_union_app_data.js) — Registers `window.EASYARMY_FACTIONS['soviet_union']`.
- **[`images/units/`](file:///c:/Users/mipas/Desktop/listmaker/images/units)** — Local official unit illustrations (`.png`).
- **`scraper/`** — Automated EasyArmy crawler & builder suite:
  - [`scraper/client.js`](file:///c:/Users/mipas/Desktop/listmaker/scraper/client.js) — Authenticated HTTP session client with local HTML cache.
  - [`scraper/parse.js`](file:///c:/Users/mipas/Desktop/listmaker/scraper/parse.js) — Cheerio HTML parsers for Platoon selectors and Unit cards.
  - [`scraper/scrape.js`](file:///c:/Users/mipas/Desktop/listmaker/scraper/scrape.js) — Full template & unit crawler.
  - [`scraper/download_images.js`](file:///c:/Users/mipas/Desktop/listmaker/scraper/download_images.js) — Unit image downloader.
  - [`scraper/build_soviet.js`](file:///c:/Users/mipas/Desktop/listmaker/scraper/build_soviet.js) — Generates `factions/soviet_union.json`, `factions/soviet_union.md`, and `factions/soviet_union_app_data.js`.

## Adding a New Faction

1. Crawl the faction's `countryID` templates with `scraper/scrape.js`.
2. Download unit images with `scraper/download_images.js`.
3. Build `factions/<faction_id>.json`, `factions/<faction_id>.md`, and `factions/<faction_id>_app_data.js` registering `window.EASYARMY_FACTIONS['<faction_id>']`.
4. Include `<script src="./factions/<faction_id>_app_data.js"></script>` in `index.html`. The Faction selector in the top bar will automatically list the new faction.