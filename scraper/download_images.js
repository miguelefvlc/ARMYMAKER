// Downloads all unit images referenced in scraper/out/<country>/templates/*.json
// into images/units/ so our app can serve them locally without external requests.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COUNTRY = process.argv[2] ?? '18';
const TPL_DIR = path.join(__dirname, 'out', COUNTRY, 'templates');
const IMG_DIR = path.join(ROOT, 'images', 'units');
fs.mkdirSync(IMG_DIR, { recursive: true });

const urls = new Set();
for (const f of fs.readdirSync(TPL_DIR)) {
  const d = JSON.parse(fs.readFileSync(path.join(TPL_DIR, f), 'utf8'));
  for (const u of d.units) {
    if (u.image) urls.add(u.image);
  }
}

console.log(`Found ${urls.size} unique unit images.`);
const c = new Client({ delayMs: 250 });
let downloaded = 0;
let skipped = 0;

for (const [i, rawUrl] of [...urls].entries()) {
  const url = rawUrl.startsWith('http') ? rawUrl : `https://wg.easyarmy.com${rawUrl}`;
  const filename = path.basename(new URL(url).pathname);
  const dest = path.join(IMG_DIR, filename);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    skipped++;
    continue;
  }
  try {
    const res = await c.request(url, { binary: true });
    if (res.status === 200 && res.buffer.length > 0) {
      fs.writeFileSync(dest, res.buffer);
      downloaded++;
      process.stdout.write(`\r  [${i + 1}/${urls.size}] saved ${filename} (${(res.buffer.length / 1024).toFixed(0)} KB)          `);
    } else {
      console.warn(`\n  ! HTTP ${res.status} for ${url}`);
    }
  } catch (e) {
    console.warn(`\n  ! Error downloading ${url}: ${e.message}`);
  }
}
process.stdout.write('\n');
console.log(`Done. Downloaded: ${downloaded}, already existed: ${skipped}, total in images/units/: ${fs.readdirSync(IMG_DIR).length}`);
