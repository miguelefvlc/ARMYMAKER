// Service worker: makes the app installable (standalone PWA) and usable offline.
// - App shell (index.html, config.js): network-first, falls back to cache when offline.
// - Static assets (faction data, unit images, icons, CDN libraries): stale-while-revalidate.
// - Supabase API / auth requests and non-GET requests are never cached.
const CACHE = 'army-maker-v14';
const PRECACHE = [
  './',
  './index.html',
  './config.js',
  './manifest.webmanifest',
  './css/styles.css',
  './js/engine.js',
  './js/storage.js',
  './js/icons.js',
  './js/components/Modals.js',
  './js/components/UnitEditModal.js',
  './js/components/Slot.js',
  './js/components/ArmyRosterPrintView.js',
  './js/app.js',
  './factions/soviet_union_app_data.js',
  './factions/germany_app_data.js',
  './factions/japan_app_data.js',
  './factions/usa_app_data.js',
  './factions/great_britain_app_data.js',
  './factions/italy_app_data.js',
  './factions/france_app_data.js',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.allSettled(PRECACHE.map((url) => c.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in') || url.hostname.endsWith('google.com')) return;

  // App shell & config: network-first so updates are always live immediately
  if (req.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname.endsWith('config.js')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Everything else: stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
