import { Client, loadEnv } from './client.js';
import { parseNewPlatoon } from './parse.js';

loadEnv();
const c = new Client();
await c.login(process.env.EASYARMY_EMAIL, process.env.EASYARMY_PASSWORD);

const r = await c.request('/BoltAction/NewPlatoon');
const m = r.url.match(/NewPlatoon\/([0-9a-f-]{36})/i);
const guid = m ? m[1] : '';

const np = await c.page(`/BoltAction/NewPlatoon/${guid}?countryID=1&platoonNum=1`);
const { templates } = parseNewPlatoon(np.text);
console.log(`Total German templates: ${templates.length}`);
const v3 = templates.filter(t => /v3/i.test(t.name) || /v3/i.test(t.source));
console.log(`v3 German templates: ${v3.length}`);
for (const t of v3) {
  console.log(`ID: ${t.id} | Name: ${t.name} | Source: ${t.source}`);
}
