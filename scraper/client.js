// Minimal HTTP client for wg.easyarmy.com with cookie jar, login, throttling and disk cache.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BASE = 'https://wg.easyarmy.com';
export const CACHE_DIR = path.join(__dirname, 'cache');
const COOKIE_FILE = path.join(__dirname, '.cookies.json');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function loadEnv() {
  const file = path.join(__dirname, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export class Client {
  constructor({ delayMs = 600 } = {}) {
    this.delayMs = delayMs;
    this.cookies = new Map();
    this.last = 0;
    this.requests = 0;
    if (fs.existsSync(COOKIE_FILE)) {
      for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8')))) this.cookies.set(k, v);
    }
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  saveCookies() {
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(Object.fromEntries(this.cookies), null, 1));
  }

  cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  storeCookies(res) {
    for (const sc of res.headers.getSetCookie?.() ?? []) {
      const [pair] = sc.split(';');
      const i = pair.indexOf('=');
      const k = pair.slice(0, i).trim();
      const v = pair.slice(i + 1).trim();
      if (/expires=Thu, 01-Jan-1970/i.test(sc) || v === '') this.cookies.delete(k);
      else this.cookies.set(k, v);
    }
  }

  async throttle() {
    const wait = this.last + this.delayMs + Math.random() * 300 - Date.now();
    if (wait > 0) await sleep(wait);
    this.last = Date.now();
  }

  /** Raw request following redirects manually (to keep cookies). Returns { status, url, text, buffer } */
  async request(url, { method = 'GET', body = null, binary = false, maxRedirects = 10 } = {}) {
    let current = url.startsWith('http') ? url : BASE + url;
    let m = method;
    let b = body;
    for (let i = 0; i <= maxRedirects; i++) {
      await this.throttle();
      let res;
      for (let attempt = 1; ; attempt++) {
        try {
          res = await fetch(current, {
            method: m,
            redirect: 'manual',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) listmaker-personal-scraper',
              Cookie: this.cookieHeader(),
              ...(b ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
            },
            body: b,
          });
          if (res.status >= 500 && attempt < 4) throw new Error('HTTP ' + res.status);
          break;
        } catch (e) {
          if (attempt >= 4) throw e;
          console.warn(`  retry ${attempt} ${current}: ${e.message}`);
          await sleep(2000 * attempt);
        }
      }
      this.requests++;
      this.storeCookies(res);
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get('location');
        current = new URL(loc, current).toString().replace(/^http:/, 'https:');
        if (res.status !== 307 && res.status !== 308) { m = 'GET'; b = null; }
        continue;
      }
      this.saveCookies();
      if (binary) return { status: res.status, url: current, buffer: Buffer.from(await res.arrayBuffer()) };
      return { status: res.status, url: current, text: await res.text() };
    }
    throw new Error('Too many redirects: ' + url);
  }

  /** GET an HTML page; fails if we got bounced to the login page. Optionally cached on disk. */
  async page(url, { cache = false } = {}) {
    const key = crypto.createHash('md5').update(url).digest('hex');
    const file = path.join(CACHE_DIR, key + '.html');
    if (cache && fs.existsSync(file)) return { url, text: fs.readFileSync(file, 'utf8'), cached: true };
    const r = await this.request(url);
    if (/\/Account\/Login/i.test(r.url)) throw new Error('NOT_LOGGED_IN');
    if (r.status !== 200) throw new Error(`HTTP ${r.status} for ${url}`);
    if (cache) fs.writeFileSync(file, `<!-- ${url} -->\n` + r.text);
    return r;
  }

  async isLoggedIn() {
    const r = await this.request('/BoltAction/SavedPlatoon');
    return !/\/Account\/Login/i.test(r.url);
  }

  async login(email, password) {
    if (await this.isLoggedIn()) return true;
    const r = await this.request('/Account/Login');
    const token = r.text.match(/name="__RequestVerificationToken" type="hidden" value="([^"]+)"/)?.[1];
    if (!token) throw new Error('No anti-forgery token on login page');
    const form = new URLSearchParams({ __RequestVerificationToken: token, Email: email, Password: password, RememberMe: 'true' });
    const res = await this.request('/Account/Login', { method: 'POST', body: form.toString() });
    if (/\/Account\/Login/i.test(res.url)) {
      const err = res.text.match(/validation-summary-errors[\s\S]*?<li>([^<]+)/)?.[1];
      throw new Error('Login failed' + (err ? ': ' + err : ''));
    }
    return true;
  }
}
