// ============================================================================
// 💰 Budget Tracker – iOS OPTIMIZED Service Worker
// ============================================================================

const CACHE_NAME = 'budget-tracker-v36'; // 🚨 Bump version for iOS fix

// 🔹 Files to cache for offline support
const PRECACHE_URLS = [
  '/dashers-finance-manager/',
  '/dashers-finance-manager/index.html',
  '/dashers-finance-manager/manifest.json',
  '/dashers-finance-manager/css/styles.css',

  // Core JS
  '/dashers-finance-manager/js/app.js',
  '/dashers-finance-manager/js/ui.js',
  '/dashers-finance-manager/js/db.js',
  '/dashers-finance-manager/js/dashboard.js',
  '/dashers-finance-manager/js/transactions.js',
  '/dashers-finance-manager/js/accounts.js',
  '/dashers-finance-manager/js/categories.js',
  '/dashers-finance-manager/js/budgets.js',
  '/dashers-finance-manager/js/bills.js',
  '/dashers-finance-manager/js/calendar.js',
  '/dashers-finance-manager/js/recurring.js',
  '/dashers-finance-manager/js/loans.js',
  '/dashers-finance-manager/js/properties.js',
  '/dashers-finance-manager/js/tenants.js',
  '/dashers-finance-manager/js/maintenance.js',
  '/dashers-finance-manager/js/expenses.js',
  '/dashers-finance-manager/js/costbase.js',
  '/dashers-finance-manager/js/reports.js',
  '/dashers-finance-manager/js/settings.js',
  '/dashers-finance-manager/js/exportimport.js',
  '/dashers-finance-manager/js/loanCalculations.js',
  '/dashers-finance-manager/js/recurringJob.js',
  '/dashers-finance-manager/js/emojipicker.js',
  '/dashers-finance-manager/js/layoutManager.js',
  '/dashers-finance-manager/js/dashboard_mobile.js',
  '/dashers-finance-manager/js/dashboard_mobile_v2.js',
  '/dashers-finance-manager/js/dashboard_desktop.js',
  '/dashers-finance-manager/js/debugConsole.js',

  // Vendor libraries
  '/dashers-finance-manager/js/vendor/chart.umd.min.js',
  '/dashers-finance-manager/js/vendor/dexie.min.js',

  // Icons
  '/dashers-finance-manager/assets/icons/icon-192.png',
  '/dashers-finance-manager/assets/icons/icon-512.png'
];

// ============================================================================
// 🏗️ INSTALL – iOS-optimized installation
// ============================================================================
self.addEventListener('install', event => {
  console.log('📦 [SW] Installing service worker for iOS...');
  
  // iOS FIX: Skip waiting immediately to ensure SW activates
  self.skipWaiting();

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('📦 [SW] Cache opened, starting to cache files...');
        
        // Cache ALL files aggressively for iOS
        const cachePromises = PRECACHE_URLS.map(async url => {
          try {
            // Use cache.add() which automatically fetches and caches
            await cache.add(url);
            console.log(`✅ [SW] Cached: ${url}`);
            return { success: true, url };
          } catch (err) {
            console.warn(`⚠️ [SW] Failed to cache ${url}:`, err.message);
            return { success: false, url, error: err.message };
          }
        });

        const results = await Promise.allSettled(cachePromises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        
        console.log(`✅ [SW] Installation completed: ${successful}/${PRECACHE_URLS.length} files cached`);
        
      } catch (err) {
        console.error('❌ [SW] Installation failed:', err);
      }
    })()
  );
});

// ============================================================================
// ♻️ ACTIVATE – iOS-optimized activation
// ============================================================================
self.addEventListener('activate', event => {
  console.log('♻️ [SW] Activating service worker for iOS...');

  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const keys = await caches.keys();
        await Promise.all(
          keys.map(key => {
            if (key !== CACHE_NAME) {
              console.log(`🗑️ [SW] Deleting old cache: ${key}`);
              return caches.delete(key);
            }
          })
        );
        
        // iOS CRITICAL FIX: Claim clients immediately
        await self.clients.claim();
        console.log('✅ [SW] Now controlling all clients (iOS fix applied)');
        
        // Send ready message to all clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({ type: 'SW_READY', version: CACHE_NAME });
        });
        
      } catch (err) {
        console.error('❌ [SW] Activation failed:', err);
      }
    })()
  );
});

// ============================================================================
// 🌍 FETCH – iOS-optimized fetch handling
// ============================================================================
self.addEventListener('fetch', event => {
  const request = event.request;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) return;
  
  // Skip .map files
  if (request.url.endsWith('.map')) {
    event.respondWith(new Response('', { status: 204 }));
    return;
  }

  // iOS FIX: Special handling for home screen launches
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Always try network first for navigation
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }
          throw new Error('Network failed');
        } catch (error) {
          // Fallback to cache for offline/home screen launch
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match('/dashers-finance-manager/index.html');
          if (cachedResponse) {
            console.log('📱 [SW] iOS: Serving cached index.html for home screen launch');
            return cachedResponse;
          }
          // Ultimate fallback
          return new Response(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Budget Tracker</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script>
                  // Auto-reload when coming back online
                  window.addEventListener('online', () => location.reload());
                </script>
              </head>
              <body>
                <h1>Budget Tracker</h1>
                <p>Loading... If this persists, check your internet connection.</p>
                <button onclick="location.reload()">Retry</button>
              </body>
            </html>
          `, {
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
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
      
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        return new Response('', { status: 404 });
      }
    })()
  );
});

// ============================================================================
// 🔄 MESSAGES – Enhanced message handling for iOS
// ============================================================================
self.addEventListener('message', event => {
  console.log('📨 [SW] Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⚡ [SW] Skip waiting triggered');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'UPDATE_CACHE') {
    updateCache();
  }
  
  // iOS: Respond to readiness checks
  if (event.data && event.data.type === 'SW_READY_CHECK') {
    event.ports[0].postMessage({ ready: true, version: CACHE_NAME });
  }
});

// Cache update function
async function updateCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    console.log('🔄 [SW] Updating cache...');
    
    for (const url of PRECACHE_URLS) {
      try {
        await cache.add(url);
      } catch (err) {
        // Silent fail for updates
      }
    }
    console.log('✅ [SW] Cache update completed');
  } catch (err) {
    console.error('❌ [SW] Cache update failed:', err);
  }
}

// Periodically check and update cache
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-cache') {
    event.waitUntil(updateCache());
  }
});