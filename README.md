# ARMY MAKER — Bolt Action v3 Army List Builder

Clean, fast, standalone Army List Builder for **Bolt Action: Third Edition**, powered directly by official **EasyArmy (`wg.easyarmy.com`)** scraped datasets and local unit illustrations.

- **GitHub Repository**: [https://github.com/miguelefvlc/ARMYMAKER](https://github.com/miguelefvlc/ARMYMAKER)
- **Architecture Documentation**: Consulta [`ARCHITECTURE.md`](./ARCHITECTURE.md) para conocer en detalle la arquitectura del motor, el flujo de componentes y la guía paso a paso para añadir nuevas facciones.

## Architecture & Multi-Faction Scalability

- **[`index.html`](./index.html)** — 100% faction-agnostic React application engine (compatible directly with Live Server or `start.bat`). Uses official EasyArmy English nomenclature, 5-column platoon layouts, period selectors (`All`, `Early War`, `Mid War`, `Late War`), full-window unit editor with right-side unit illustrations, and A4 PDF / JSON roster export.
- **`factions/`** — Self-contained faction modules:
  - [`factions/soviet_union.md`](./factions/soviet_union.md) — Complete, organized Markdown reference (Army Special Rules, Platoon Selectors, Slot Catalog, 124 Unit Datasheets, and A–Z Special Rules Glossary).
  - [`factions/soviet_union.json`](./factions/soviet_union.json) — Structured JSON dataset.
  - [`factions/soviet_union_app_data.js`](./factions/soviet_union_app_data.js) — Registers `window.EASYARMY_FACTIONS['soviet_union']`.
  - [`factions/germany.md`](./factions/germany.md) — Complete, organized Markdown reference for Germany.
  - [`factions/germany.json`](./factions/germany.json) — Structured JSON dataset.
  - [`factions/germany_app_data.js`](./factions/germany_app_data.js) — Registers `window.EASYARMY_FACTIONS['germany']`.
  - [`factions/japan.md`](./factions/japan.md) — Complete, organized Markdown reference for Imperial Japan.
  - [`factions/japan.json`](./factions/japan.json) — Structured JSON dataset.
  - [`factions/japan_app_data.js`](./factions/japan_app_data.js) — Registers `window.EASYARMY_FACTIONS['japan']`.
  - [`factions/usa.md`](./factions/usa.md) — Complete, organized Markdown reference for United States.
  - [`factions/usa.json`](./factions/usa.json) — Structured JSON dataset.
  - [`factions/usa_app_data.js`](./factions/usa_app_data.js) — Registers `window.EASYARMY_FACTIONS['usa']`.
  - [`factions/great_britain.md`](./factions/great_britain.md) — Complete, organized Markdown reference for Great Britain.
  - [`factions/great_britain.json`](./factions/great_britain.json) — Structured JSON dataset.
  - [`factions/great_britain_app_data.js`](./factions/great_britain_app_data.js) — Registers `window.EASYARMY_FACTIONS['great_britain']`.
  - [`factions/italy.md`](./factions/italy.md) — Complete, organized Markdown reference for Italy.
  - [`factions/italy.json`](./factions/italy.json) — Structured JSON dataset.
  - [`factions/italy_app_data.js`](./factions/italy_app_data.js) — Registers `window.EASYARMY_FACTIONS['italy']`.
  - [`factions/france.md`](./factions/france.md) — Complete, organized Markdown reference for France.
  - [`factions/france.json`](./factions/france.json) — Structured JSON dataset.
  - [`factions/france_app_data.js`](./factions/france_app_data.js) — Registers `window.EASYARMY_FACTIONS['france']`.
- **[`images/units/`](./images/units)** — Local official unit illustrations (`.png` / `.jpg`).
- **`scraper/`** — Automated EasyArmy crawler & builder suite:
  - [`scraper/client.js`](./scraper/client.js) — Authenticated HTTP session client with local HTML cache.
  - [`scraper/parse.js`](./scraper/parse.js) — Cheerio HTML parsers for Platoon selectors and Unit cards.
  - [`scraper/scrape.js`](./scraper/scrape.js) — Full template & unit crawler.
  - [`scraper/download_images.js`](./scraper/download_images.js) — Unit image downloader.
  - [`scraper/build_soviet.js`](./scraper/build_soviet.js) — Generates Soviet Union faction data and documentation.
  - [`scraper/build_germany.js`](./scraper/build_germany.js) — Generates Germany faction data and documentation.
  - [`scraper/build_japan.js`](./scraper/build_japan.js) — Generates Imperial Japan faction data and documentation.
  - [`scraper/build_usa.js`](./scraper/build_usa.js) — Generates United States faction data and documentation.
  - [`scraper/build_great_britain.js`](./scraper/build_great_britain.js) — Generates Great Britain faction data and documentation.
  - [`scraper/build_italy.js`](./scraper/build_italy.js) — Generates Italy faction data and documentation.
  - [`scraper/build_france.js`](./scraper/build_france.js) — Generates France faction data and documentation.

## Adding a New Faction

1. Crawl the faction's `countryID` templates with `scraper/scrape.js`.
2. Download unit images with `scraper/download_images.js`.
3. Build `factions/<faction_id>.json`, `factions/<faction_id>.md`, and `factions/<faction_id>_app_data.js` registering `window.EASYARMY_FACTIONS['<faction_id>']`.
4. Include `<script src="./factions/<faction_id>_app_data.js"></script>` in `index.html`. The Faction selector in the top bar will automatically list the new faction.