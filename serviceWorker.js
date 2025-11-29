// ============================================================================
// 💰 Budget Tracker – Optimized Service Worker (iOS-Compatible Offline Version)
// ----------------------------------------------------------------------------
// Full offline support, background updates, and iOS PWA caching fixes.
// ============================================================================

const CACHE_NAME = 'budget-tracker-v34'; // 🚨 Bumped version again

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
        
        // Use Promise.allSettled to handle failures gracefully
        const cacheResults = await Promise.allSettled(
          PRECACHE_URLS.map(async url => {
            try {
              const response = await fetch(url);
              if (response.ok) {
                await cache.put(url, response);
                console.log(`✅ Cached: ${url}`);
                return { url, status: 'success' };
              } else {
                console.warn(`⚠️ Failed to cache ${url}: ${response.status}`);
                return { url, status: 'failed', reason: `HTTP ${response.status}` };
              }
            } catch (err) {
              console.warn(`⚠️ Could not cache ${url}:`, err.message);
              return { url, status: 'failed', reason: err.message };
            }
          })
        );

        // Log cache results summary
        const successful = cacheResults.filter(r => r.status === 'fulfilled' && r.value.status === 'success').length;
        const failed = cacheResults.length - successful;
        console.log(`📊 Cache summary: ${successful} successful, ${failed} failed`);

        // Force immediate activation (iOS fix)
        await self.skipWaiting();
        console.log('✅ [SW] Installation completed, skipping waiting');
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
        const deletePromises = keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log(`🗑️ Deleting old cache: ${key}`);
            return caches.delete(key);
          }
        });
        
        await Promise.all(deletePromises);
        
        // Take control of all clients immediately (iOS fix)
        await self.clients.claim();
        console.log('✅ [SW] Activated and controlling all clients');
      } catch (err) {
        console.error('❌ [SW] Activation failed:', err);
      }
    })()
  );
});

// ============================================================================
// 🌍 FETCH – Enhanced caching strategy for offline support
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

  // For HTML navigation requests - cache first with network update
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try cache first for fast loading
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match('./index.html');
          
          // Always try to update from network in background
          if ('caches' in self) {
            event.waitUntil(
              (async () => {
                try {
                  const networkResponse = await fetch(request);
                  if (networkResponse.ok) {
                    await cache.put(request, networkResponse);
                    console.log('🔄 Updated HTML from network');
                  }
                } catch (err) {
                  // Silently fail - we have cached version
                }
              })()
            );
          }
          
          return cachedResponse || fetch(request);
        } catch (error) {
          console.error('❌ Navigation fetch failed:', error);
          return new Response('Offline - Please check connection', { 
            status: 503,
            headers: { 'Content-Type': 'text/html' }
          });
        }
      })()
    );
    return;
  }

  // For all other resources: cache-first strategy
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      try {
        // Try cache first
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          // Update cache in background if online
          if (navigator.onLine) {
            event.waitUntil(
              (async () => {
                try {
                  const networkResponse = await fetch(request);
                  if (networkResponse.ok) {
                    await cache.put(request, networkResponse);
                  }
                } catch (error) {
                  // Silently fail
                }
              })()
            );
          }
          return cachedResponse;
        }

        // Not in cache - try network
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        // Network failed and not in cache
        console.warn('📴 Offline resource not available:', request.url);
        
        // Return appropriate fallback based on file type
        if (request.destination === 'script') {
          return new Response('console.log("Script offline: ' + request.url + '")', {
            headers: { 'Content-Type': 'application/javascript' }
          });
        }
        
        if (request.destination === 'style') {
          return new Response('/* Styles offline */', {
            headers: { 'Content-Type': 'text/css' }
          });
        }
        
        return new Response('📴 Offline - Resource not available', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});

// ============================================================================
// 🔄 MESSAGES – Handle app messages
// ============================================================================
self.addEventListener('message', event => {
  console.log('📨 [SW] Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⚡ [SW] Skip waiting triggered by app.');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'UPDATE_CACHE') {
    console.log('🔄 [SW] Update cache requested');
    updateCache();
  }
});

// ============================================================================
// 🛰️ Cache management functions
// ============================================================================
async function updateCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const updatePromises = PRECACHE_URLS.map(async url => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          console.log(`🔄 Updated cache: ${url}`);
        }
      } catch (err) {
        // Silently fail for cache updates
      }
    });
    
    await Promise.allSettled(updatePromises);
    console.log('✅ Cache update completed');
  } catch (err) {
    console.error('❌ Cache update failed:', err);
  }
}

async function notifyClientsAboutUpdate() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ 
        type: 'UPDATE_AVAILABLE',
        version: CACHE_NAME 
      });
    });
  } catch (err) {
    console.error('❌ Failed to notify clients:', err);
  }
}

// ============================================================================
// 📡 Event listeners for lifecycle
// ============================================================================
self.addEventListener('controllerchange', () => {
  console.log('🔁 [SW] Controller changed – new version active.');
});

self.addEventListener('waiting', () => {
  console.log('🕓 [SW] Update waiting, notifying clients...');
  notifyClientsAboutUpdate();
});