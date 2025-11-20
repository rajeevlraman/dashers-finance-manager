// ============================================================================
// 💰 Budget Tracker – Optimized Service Worker (Full Pre-Cache Edition)
// ----------------------------------------------------------------------------
// Handles full offline support, versioned caching, background updates,
// and user-controlled reload prompts via postMessage.
// ============================================================================

// 🔹 Increment this when you release a new version
const CACHE_NAME = 'budget-tracker-v25'; 

// 🔹 Every core asset to pre-cache for full offline functionality
const PRECACHE_URLS = [
  '/', // fallback root
  '/index.html',
  '/manifest.json',

  // --- Styles ---
  '/css/styles.css',

  // --- Core JS Modules ---
  '/js/app.js',
  '/js/ui.js',
  '/js/db_dexie.js',
  '/js/dexie_db.js',
  '/js/debugConsole.js',
  '/js/recurringjob.js',
  '/js/exportimport.js',
  '/js/loanCalculations.js',
  '/js/reports.js',
  '/js/settings.js',
  '/js/emojipicker.js',

  // --- Feature Modules ---
  '/js/budgets.js',
  '/js/transactions.js',
  '/js/accounts.js',
  '/js/categories.js',
  '/js/dashboard.js',
  '/js/bills.js',
  '/js/calendar.js',
  '/js/recurring.js',
  '/js/loans.js',

  // --- Vendor Libraries ---
  '/js/vendor/chart.umd.min.js',

  // --- App Icons ---
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/maskable_icon.png'
];
// ============================================================================
// 🏗️ DEBUGGING CACHE STORAGE – Pre-cache all required assets
// One of those entries doesn’t exist. The usual culprits:
//ONCE DEBUGGED remove this part of the code
// ============================================================================
event.waitUntil(
  caches.open(CACHE_NAME)
    .then(async cache => {
      try {
        await cache.addAll(urlsToCache);
        console.log('✅ [SW] Core files cached');
      } catch (err) {
        console.error('❌ [SW] Error caching:', err);
        for (const url of urlsToCache) {
          try {
            await cache.add(url);
          } catch (e) {
            console.warn('⚠️ [SW] Failed to cache:', url, e);
          }
        }
      }
    })
    .then(() => self.skipWaiting())
);



// ============================================================================
// 🏗️ INSTALL EVENT – Pre-cache all required assets
// ============================================================================
self.addEventListener('install', event => {
  console.log('📦 [SW] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('🧱 [SW] Caching app shell and core assets...');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('✅ [SW] Installation complete. Skipping waiting...');
        // Force activate immediately after installation
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('❌ [SW] Error during installation:', err);
      })
  );
});

// ============================================================================
// ♻️ ACTIVATE EVENT – Remove old caches
// ============================================================================
self.addEventListener('activate', event => {
  console.log('♻️ [SW] Activating new service worker version...');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            console.log('🗑️ [SW] Removing old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      console.log('✅ [SW] Activation complete.');
      // Take control of any currently open pages
      return self.clients.claim();
    })
  );
});

// ============================================================================
// 🌍 FETCH EVENT – Offline-first strategy with background revalidation
// ============================================================================
self.addEventListener('fetch', event => {
  const request = event.request;

  // Skip non-GET requests (e.g., POST/PUT to IndexedDB or APIs)
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (for security and iOS compliance)
  if (!request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // Always try to update in the background for freshness
        const fetchPromise = fetch(request)
          .then(networkResponse => {
            // Only cache successful same-origin responses
            if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, responseClone))
                .catch(err => console.warn('⚠️ [SW] Cache put failed:', err));
            }
            return networkResponse;
          })
          .catch(() => {
            // Offline fallback – return cached version or /index.html
            if (cachedResponse) return cachedResponse;
            if (request.mode === 'navigate') return caches.match('/index.html');
            return new Response('📴 Offline – Resource not available', {
              headers: { 'Content-Type': 'text/plain' }
            });
          });

        // If cached response exists, return it immediately (stale-while-revalidate)
        return cachedResponse || fetchPromise;
      })
  );
});

// ============================================================================
// 🔄 SKIP WAITING MESSAGE – Allow client to trigger immediate activation
// ============================================================================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⚡ [SW] Skip waiting triggered by client.');
    self.skipWaiting();
  }
});

// ============================================================================
// 📣 AUTO-UPDATE CHECK – Notify clients when new SW is waiting
// (integrates with your existing updateToast in app.js)
// ============================================================================
self.addEventListener('statechange', event => {
  console.log('🔄 [SW] State change detected:', event.target.state);
});

// When a new version of this SW is waiting, notify the client
self.addEventListener('install', () => {
  console.log('📢 [SW] Installation complete. Ready to activate when old version releases control.');
});

// ============================================================================
// 🛰️ HELPER – Broadcast update availability to all clients
// ============================================================================
async function notifyClientsAboutUpdate() {
  const allClients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of allClients) {
    client.postMessage({ type: 'UPDATE_AVAILABLE' });
  }
}

// Triggered when SW moves to "installed" but not yet active
self.addEventListener('controllerchange', () => {
  console.log('🔁 [SW] Controller changed → New version in control');
});

self.addEventListener('waiting', () => {
  console.log('🕓 [SW] Update waiting...');
  notifyClientsAboutUpdate();
});

// ============================================================================
// 📜 NOTES:
//  - This service worker uses “stale-while-revalidate”.
//  - Pre-cached assets load instantly offline.
//  - New versions download silently, then prompt the user via your toast UI.
//  - Update toast logic handled in app.js → showUpdateToast()
//  - Works perfectly with localhost testing (VS Code → Live Server on :5500).
// ============================================================================
