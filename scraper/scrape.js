// Full crawl of a faction's v3 platoon templates on wg.easyarmy.com.
// Usage: node scraper/scrape.js [countryId=18] [filterRegex=v3]
// Writes per-template results to scraper/out/<country>/templates/<id>.json (resumable).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, loadEnv } from './client.js';
import { parseNewPlatoon, parsePlatoon, parseUnit } from './parse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv();

const COUNTRY = Number(process.argv[2] ?? 18);
const FILTER = new RegExp(process.argv[3] ?? 'v3', 'i');
const OUT = path.join(__dirname, 'out', String(COUNTRY));
const TPL_DIR = path.join(OUT, 'templates');
const HTML_DIR = path.join(OUT, 'html');
fs.mkdirSync(TPL_DIR, { recursive: true });
fs.mkdirSync(HTML_DIR, { recursive: true });
const STATE = path.join(__dirname, 'state.json');
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
const saveState = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 1));

const c = new Client({ delayMs: 550 });
await c.login(process.env.EASYARMY_EMAIL, process.env.EASYARMY_PASSWORD);
console.log('Logged in.');

// Dedicated scraper list (never touches the user's own lists)
if (!state.guid) {
  const r = await c.request('/BoltAction/NewPlatoon');
  state.guid = r.url.match(/NewPlatoon\/([0-9a-f-]{36})/i)[1];
  saveState();
}
const G = state.guid;
console.log('Scraper list GUID:', G);

const del = () => c.request(`/BoltAction/DeletePlatoon/${G}/1/?s=1`);

// Template list
const np = await c.page(`/BoltAction/NewPlatoon/${G}?countryID=${COUNTRY}&platoonNum=1`);
const { countries, templates } = parseNewPlatoon(np.text);
const country = countries.find((x) => x.id === COUNTRY);
const todo = templates.filter((t) => FILTER.test(t.name));
fs.writeFileSync(path.join(OUT, 'templates.json'), JSON.stringify({ country, templates, selected: todo.map((t) => t.id) }, null, 1));
console.log(`${country?.name}: ${templates.length} templates, ${todo.length} match ${FILTER}`);

await del();

for (const [ti, tpl] of todo.entries()) {
  const outFile = path.join(TPL_DIR, `${tpl.id}.json`);
  if (fs.existsSync(outFile)) { console.log(`[${ti + 1}/${todo.length}] ${tpl.id} ${tpl.name} (done, skip)`); continue; }
  console.log(`[${ti + 1}/${todo.length}] ${tpl.id} ${tpl.name}`);

  let r = await c.request(`/BoltAction/CreateCompany/${G}/${tpl.id}/1`);
  if (!/\/Platoon\//.test(r.url)) {
    await del();
    r = await c.request(`/BoltAction/CreateCompany/${G}/${tpl.id}/1`);
  }
  if (!/\/Platoon\//.test(r.url)) { console.warn('  ! could not create platoon:', r.url); continue; }
  fs.writeFileSync(path.join(HTML_DIR, `platoon_${tpl.id}.html`), r.text);
  const platoon = parsePlatoon(r.text);

  // One unit page per (section, unit name) inside this template
  const seen = new Map();
  for (const col of platoon.columns) for (const box of col) for (const u of box.units) {
    const key = `${box.section}||${u.name}`;
    if (!seen.has(key)) seen.set(key, { section: box.section, name: u.name, cbID: u.cbID });
  }
  const units = [];
  let i = 0;
  for (const s of seen.values()) {
    i++;
    try {
      const page = await c.page(`/BoltAction/Unit/${G}/1/${s.cbID}`);
      fs.writeFileSync(path.join(HTML_DIR, `unit_${tpl.id}_${s.cbID}.html`), page.text);
      const unit = parseUnit(page.text);
      units.push({ section: s.section, listName: s.name, ...unit });
      process.stdout.write(`\r  units ${i}/${seen.size}  ${s.name.slice(0, 50).padEnd(50)}`);
    } catch (e) {
      console.warn(`\n  ! unit ${s.name} (${s.cbID}): ${e.message}`);
      if (e.message === 'NOT_LOGGED_IN') { await c.login(process.env.EASYARMY_EMAIL, process.env.EASYARMY_PASSWORD); }
    }
  }
  process.stdout.write('\n');

  // strip instance ids from layout before saving
  const layout = platoon.columns.map((col) => col.map((b) => ({ section: b.section, required: b.required, units: b.units.map((u) => u.name) })));
  fs.writeFileSync(outFile, JSON.stringify({ template: tpl, title: platoon.title, source: platoon.source, layout, units }, null, 1));
  await del();
}

console.log(`Done. HTTP requests: ${c.requests}`);
