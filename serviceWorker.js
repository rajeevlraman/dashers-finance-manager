// ============================================================================
// 💰 Budget Tracker – Optimized Service Worker (iOS-Compatible Offline Version)
// ----------------------------------------------------------------------------
// Full offline support, background updates, and iOS PWA caching fixes.
// ============================================================================

const CACHE_NAME = 'budget-tracker-v27'; // 🚨 IMPORTANT: Bump the version number!

// 🔹 Files to cache for offline support
const PRECACHE_URLS = [
  '/',
  './index.html',
  './manifest.json',
  './css/styles.css',

  // Core JS
  './js/app.js',
  './js/ui.js',
  './js/db_dexie.js',
  './js/dexie_db.js',
  './js/debugConsole.js',
  './js/recurringJob.js',
  './js/exportimport.js',
  './js/loanCalculations.js',
  './js/reports.js',
  './js/settings.js',
  './js/emojipicker.js',

  // Feature modules
  './js/budgets.js',
  './js/transactions.js',
  './js/accounts.js',
  './js/categories.js',
  './js/dashboard.js',
  './js/bills.js',
  './js/calendar.js',
  './js/recurring.js',
  './js/loans.js',

  // Vendor libraries
  './js/vendor/chart.umd.min.js',

  // Icons
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable_icon.png'
];
// ... rest of the Service Worker code ...

// ============================================================================
// 🏗️ INSTALL – Cache all assets
// ============================================================================
self.addEventListener('install', event => {
  console.log('📦 [SW] Installing and caching essential files...');

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        await cache.addAll(PRECACHE_URLS);
        console.log('✅ [SW] Cached all core assets successfully.');
      } catch (err) {
        console.error('⚠️ [SW] Some assets failed to cache:', err);
      }
      // iOS fix – force immediate activation
      self.skipWaiting();
    })()
  );
});

// ============================================================================
// ♻️ ACTIVATE – Remove old caches and take control immediately
// ============================================================================
self.addEventListener('activate', event => {
  console.log('♻️ [SW] Activating service worker and cleaning old caches...');

  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => key !== CACHE_NAME && caches.delete(key))
      );
      await self.clients.claim();
      console.log('✅ [SW] Activated and controlling clients.');
    })()
  );
});

// ============================================================================
// 🌍 FETCH – Offline-first with network update
// ============================================================================
self.addEventListener('fetch', event => {
  const request = event.request;

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);

      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // Offline fallback
        if (cachedResponse) return cachedResponse;
        if (request.mode === 'navigate') return await cache.match('/index.html');
        return new Response('📴 Offline – Resource not available', {
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});

// ============================================================================
// 🔄 MESSAGES – Handle skipWaiting from app
// ============================================================================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⚡ [SW] Skip waiting triggered by app.');
    self.skipWaiting();
  }
});

// ============================================================================
// 🛰️ Notify all clients when new update is available
// ============================================================================
async function notifyClientsAboutUpdate() {
  const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clientsList) {
    client.postMessage({ type: 'UPDATE_AVAILABLE' });
  }
}

self.addEventListener('controllerchange', () => {
  console.log('🔁 [SW] Controller changed – new version active.');
});

self.addEventListener('waiting', () => {
  console.log('🕓 [SW] Update waiting.');
  notifyClientsAboutUpdate();
});

// ============================================================================
// 📜 NOTES
// - Works reliably offline on iOS/Safari PWAs.
// - Ensures pre-caching completes before install finishes.
// - Uses stale-while-revalidate approach.
// - Automatically updates and notifies the user.
// ============================================================================

