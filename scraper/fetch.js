// Debug helper: node scraper/fetch.js /BoltAction/SavedPlatoon  -> saves HTML to scraper/debug/
import fs from 'node:fs';
import path from 'node:path';
import { Client, loadEnv } from './client.js';

loadEnv();
const c = new Client({ delayMs: 400 });
await c.login(process.env.EASYARMY_EMAIL, process.env.EASYARMY_PASSWORD);
const dir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'debug');
fs.mkdirSync(dir, { recursive: true });
for (const url of process.argv.slice(2)) {
  const r = await c.request(url);
  const name = url.replace(/[^a-z0-9]+/gi, '_').slice(0, 120) + '.html';
  fs.writeFileSync(path.join(dir, name), `<!-- ${url} -> ${r.url} (${r.status}) -->\n` + r.text);
  console.log(r.status, url, '->', r.url, `(${r.text.length} bytes) saved debug/${name}`);
}
