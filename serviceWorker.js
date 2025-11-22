// serviceWorker.js (GitHub Pages Compatible)
const CACHE_VERSION = 'v1.0.2';
const STATIC_CACHE = `bt-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `bt-runtime-${CACHE_VERSION}`;

// Base path for GitHub Pages
const BASE = '/dashers-finance-manager/';

// All files must include BASE path for GitHub Pages
const STATIC_ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'css/styles.css',

  // Core JS
  BASE + 'js/app.js',
  BASE + 'js/ui.js',
  BASE + 'js/db.js',

  // Feature modules
  BASE + 'js/dashboard.js',
  BASE + 'js/accounts.js',
  BASE + 'js/transactions.js',
  BASE + 'js/budgets.js',
  BASE + 'js/categories.js',
  BASE + 'js/bills.js',
  BASE + 'js/calendar.js',
  BASE + 'js/reports.js',
  BASE + 'js/settings.js',
  BASE + 'js/recurring.js',
  BASE + 'js/recurringJob.js',
  BASE + 'js/emojiPicker.js',
  BASE + 'js/charts.js',

  // Vendor
  BASE + 'js/vendor/chart.umd.min.js',

  // Icons
  BASE + 'assets/icons/icon-192.png',
  BASE + 'assets/icons/icon-512.png',
  BASE + 'assets/icons/icon-512-maskable.png'
];

// ---------------------- INSTALL ----------------------
self.addEventListener('install', event => {
  console.log('[SW] Installing...');

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
              console.warn('[SW] Skipping non-OK asset:', url, resp.status);
            }
          } catch (err) {
            console.warn('[SW] Failed to cache:', url, err);
          }
        })
      );

      console.log('[SW] Cached all static assets.');
      await self.skipWaiting();
    })()
  );
});

// ---------------------- ACTIVATE ----------------------
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');

  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (key !== STATIC_CACHE && key !== RUNTIME_CACHE) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
      console.log('[SW] Ready.');
    })()
  );
});

// ---------------------- FETCH ----------------------
self.addEventListener('fetch', event => {
  const req = event.request;

  // Ignore Chrome extension requests
  if (req.url.startsWith('chrome-extension://')) return;

  // Navigation → Offline shell
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const network = await fetch(req);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, network.clone());
          return network;
        } catch {
          console.warn('[SW] Offline navigation → index.html cached');
          return caches.match(BASE + 'index.html');
        }
      })()
    );
    return;
  }

  // Static assets (cache-first)
  if (['script', 'style', 'image', 'font', 'worker'].includes(req.destination)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Everything else (network-first)
  event.respondWith(networkFirst(req));
});

// ---------------------- HELPERS ----------------------
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  try {
    const net = await fetch(req);
    if (net.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, net.clone());
    }
    return net;
  } catch {
    return cached || new Response('', { status: 503 });
  }
}

async function networkFirst(req) {
  try {
    const net = await fetch(req);
    if (net.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, net.clone());
    }
    return net;
  } catch {
    const cached = await caches.match(req);
    return cached || new Response('', { status: 503 });
  }
}

// Offline event message
function notifyClientsOffline() {
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(c => c.postMessage({ type: 'OFFLINE' }));
  });
}

// Allow skipWaiting
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
