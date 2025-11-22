// serviceWorker.js
const CACHE_VERSION = 'v1.0.1';   // bumped version for refresh
const STATIC_CACHE = `bt-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `bt-runtime-${CACHE_VERSION}`;

// IMPORTANT for GitHub Pages — must use relative paths
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',

  // Core JS
  './js/app.js',
  './js/ui.js',
  './js/db.js',

  // Feature modules
  './js/dashboard.js',
  './js/accounts.js',
  './js/transactions.js',
  './js/budgets.js',
  './js/categories.js',
  './js/bills.js',
  './js/calendar.js',
  './js/reports.js',
  './js/settings.js',
  './js/recurring.js',
  './js/recurringJob.js',
  './js/emojiPicker.js',
  './js/charts.js',

  // Icons
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png'
];

// 🧱 INSTALL – Precache core assets
self.addEventListener('install', event => {
  console.log('[SW] 🔧 Installing…');

  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);

      await Promise.all(
        STATIC_ASSETS.map(async (url) => {
          try {
            const resp = await fetch(url, { cache: 'no-cache' });
            if (resp.ok) {
              await cache.put(url, resp);
            } else {
              console.warn('[SW] ⚠️ Skipping non-OK asset:', url, resp.status);
            }
          } catch (err) {
            console.warn('[SW] ⚠️ Failed to cache:', url, err);
          }
        })
      );

      console.log('[SW] ✅ Core assets cached');
      await self.skipWaiting();
    })()
  );
});

// ♻️ ACTIVATE – Cleanup
self.addEventListener('activate', event => {
  console.log('[SW] ♻️ Activating…');

  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (key !== STATIC_CACHE && key !== RUNTIME_CACHE) {
            console.log('[SW] 🗑️ Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );

      await self.clients.claim();
      console.log('[SW] ✅ Ready');
    })()
  );
});

// 🌍 FETCH FIX FOR GITHUB PAGES + iOS OFFLINE
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // ❌ DO NOT skip localhost on GitHub Pages (breaks offline install)
  if (url.protocol.startsWith('chrome-extension')) return;

  // 🧭 HTML pages → offline-first shell
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const network = await fetch(req);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, network.clone());
          return network;
        } catch (err) {
          console.warn('[SW] Offline, serving cached shell');
          return (await caches.match('./index.html')) ||
                 new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
        }
      })()
    );
    return;
  }

  // 🎨 Static assets → cache-first
  if (['script', 'style', 'image', 'font', 'worker'].includes(req.destination)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // 🔄 Everything else → network-first
  event.respondWith(networkFirst(req));
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  try {
    const network = await fetch(req);
    if (network.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, network.clone());
    }
    return network;
  } catch {
    notifyClientsOffline();
    return cached || new Response('', { status: 503 });
  }
}

async function networkFirst(req) {
  try {
    const network = await fetch(req);
    if (network.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, network.clone());
    }
    return network;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    notifyClientsOffline();
    return new Response('', { status: 503 });
  }
}

// Notify UI banner
function notifyClientsOffline() {
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(client => client.postMessage({ type: 'OFFLINE' }));
  });
}

// ⚡ Allow SKIP_WAITING
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
