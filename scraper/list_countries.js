import { Client, loadEnv } from './client.js';
import { parseNewPlatoon } from './parse.js';

loadEnv();
const c = new Client();
await c.login(process.env.EASYARMY_EMAIL, process.env.EASYARMY_PASSWORD);

const r = await c.request('/BoltAction/NewPlatoon');
const m = r.url.match(/NewPlatoon\/([0-9a-f-]{36})/i);
const guid = m ? m[1] : '';
console.log('GUID:', guid);

const np = await c.page(`/BoltAction/NewPlatoon/${guid}?countryID=0&platoonNum=1`);
const { countries, templates } = parseNewPlatoon(np.text);
console.log('Countries:');
for (const country of countries) {
  console.log(`ID: ${country.id} -> ${country.name}`);
}
