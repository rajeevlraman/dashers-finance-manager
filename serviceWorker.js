// ============================================================================
// 💰 Budget Tracker – Optimized Service Worker (iOS-Compatible Offline Version)
// ----------------------------------------------------------------------------
// Full offline support, background updates, and iOS PWA caching fixes.
// ============================================================================

const CACHE_NAME = 'budget-tracker-v33'; // 🚨 Bumped version

// 🔹 Files to cache for offline support - EXPANDED LIST
const PRECACHE_URLS = [
  '/',
  './index.html',
  './manifest.json',
  './css/styles.css',

  // Core JS - ALL application files
  './js/app.js',
  './js/ui.js',
  './js/db.js',
  './js/db_dexie.js',
  './js/dexie_db.js',
  './js/debugConsole.js',
  './js/recurringJob.js',
  './js/exportimport.js',
  './js/loanCalculations.js',
  './js/reports.js',
  './js/settings.js',
  './js/emojipicker.js',
  './js/layoutManager.js',
  './js/dashboard_mobile.js',
  './js/dashboard_mobile_v2.js',
  './js/dashboard_desktop.js',

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
  './js/properties.js',
  './js/tenants.js',
  './js/maintenance.js',
  './js/expenses.js',
  './js/costbase.js',

  // Vendor libraries
  './js/vendor/chart.umd.min.js',
  './vendor/dexie.min.js',

  // Icons
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable_icon.png',
  './assets/icons/splash.png'
];

// ============================================================================
// 🏗️ INSTALL – Cache all assets with better error handling
// ============================================================================
self.addEventListener('install', event => {
  console.log('📦 [SW] Installing and caching essential files...');

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        
        // Cache files individually with error handling
        const cachePromises = PRECACHE_URLS.map(async url => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              console.log(`✅ Cached: ${url}`);
            } else {
              console.warn(`⚠️ Failed to cache ${url}: ${response.status}`);
            }
          } catch (err) {
            console.warn(`⚠️ Could not cache ${url}:`, err.message);
          }
        });
        
        await Promise.all(cachePromises);
        console.log('✅ [SW] Pre-caching completed');
        
        // iOS fix – force immediate activation
        await self.skipWaiting();
      } catch (err) {
        console.error('❌ [SW] Installation failed:', err);
      }
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
      try {
        // Clean up old caches
        const keys = await caches.keys();
        await Promise.all(
          keys.map(key => {
            if (key !== CACHE_NAME) {
              console.log(`🗑️ Deleting old cache: ${key}`);
              return caches.delete(key);
            }
          })
        );
        
        // Take control of all clients immediately (iOS fix)
        await self.clients.claim();
        console.log('✅ [SW] Activated and controlling clients.');
      } catch (err) {
        console.error('❌ [SW] Activation failed:', err);
      }
    })()
  );
});

// ============================================================================
// 🌍 FETCH – Network-first with cache fallback (better for iOS)
// ============================================================================
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // 🚫 Block source map requests
  if (request.url.endsWith('.map')) {
    event.respondWith(new Response('', { status: 204 }));
    return;
  }

  // Skip non-GET requests and cross-origin requests
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // Special handling for HTML navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try network first for navigation
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }
          throw new Error('Network response not ok');
        } catch (error) {
          // Fallback to cached version
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match('./index.html');
          return cachedResponse || new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // For all other resources: cache-first strategy
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        // Return cached version but update cache in background
        event.waitUntil(
          (async () => {
            try {
              const networkResponse = await fetch(request);
              if (networkResponse.ok) {
                await cache.put(request, networkResponse);
              }
            } catch (error) {
              // Silently fail - we have cached version
            }
          })()
        );
        return cachedResponse;
      }

      // Not in cache - try network
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        // Final fallback for critical resources
        if (request.destination === 'script' || request.destination === 'style') {
          return new Response('console.log("Resource unavailable offline")', {
            headers: { 'Content-Type': 'application/javascript' }
          });
        }
        return new Response('📴 Offline', {
          status: 503,
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

// Listen for waiting state to notify about updates
self.addEventListener('waiting', () => {
  console.log('🕓 [SW] Update waiting.');
  notifyClientsAboutUpdate();
});