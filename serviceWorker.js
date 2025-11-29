// ============================================================================
// 💰 Budget Tracker – DEBUGGED Service Worker (FIXED CACHING)
// ============================================================================

const CACHE_NAME = 'budget-tracker-v35'; // 🚨 Bumped version again

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
  '/dashers-finance-manager/vendor/dexie.min.js',

  // Icons
  '/dashers-finance-manager/assets/icons/icon-192.png',
  '/dashers-finance-manager/assets/icons/icon-512.png'
];

// ============================================================================
// 🏗️ INSTALL – FIXED CACHING
// ============================================================================
self.addEventListener('install', event => {
  console.log('📦 [SW] Installing service worker...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('📦 [SW] Cache opened, starting to cache files...');
        
        // Cache critical files first
        const criticalFiles = [
          '/dashers-finance-manager/index.html',
          '/dashers-finance-manager/js/app.js',
          '/dashers-finance-manager/js/db.js',
          '/dashers-finance-manager/js/ui.js',
          '/dashers-finance-manager/css/styles.css'
        ];
        
        // Cache critical files with individual error handling
        for (const url of criticalFiles) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              console.log(`✅ [SW] Cached: ${url}`);
            } else {
              console.warn(`⚠️ [SW] Failed to cache ${url}: ${response.status}`);
            }
          } catch (err) {
            console.warn(`⚠️ [SW] Network error caching ${url}:`, err.message);
          }
        }
        
        console.log('✅ [SW] Critical files cached, moving to background caching...');
        
        // Cache remaining files in background
        event.waitUntil(
          (async () => {
            try {
              for (const url of PRECACHE_URLS) {
                // Skip if already cached
                const alreadyCached = await cache.match(url);
                if (alreadyCached) continue;
                
                try {
                  const response = await fetch(url);
                  if (response.ok) {
                    await cache.put(url, response);
                    console.log(`✅ [SW] Background cached: ${url}`);
                  }
                } catch (err) {
                  // Silent fail for background caching
                }
              }
              console.log('✅ [SW] Background caching completed');
            } catch (err) {
              console.error('❌ [SW] Background caching failed:', err);
            }
          })()
        );
        
        // Force immediate activation
        await self.skipWaiting();
        console.log('✅ [SW] Installation completed successfully');
        
      } catch (err) {
        console.error('❌ [SW] Installation failed completely:', err);
      }
    })()
  );
});

// ============================================================================
// ♻️ ACTIVATE – Cleanup
// ============================================================================
self.addEventListener('activate', event => {
  console.log('♻️ [SW] Activating service worker...');

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
        
        // Take control immediately
        await self.clients.claim();
        console.log('✅ [SW] Now controlling clients');
      } catch (err) {
        console.error('❌ [SW] Activation failed:', err);
      }
    })()
  );
});

// ============================================================================
// 🌍 FETCH – Serve from cache
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

  event.respondWith(
    (async () => {
      try {
        // Try cache first
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
          console.log(`📂 [SW] Serving from cache: ${new URL(request.url).pathname}`);
          return cachedResponse;
        }
        
        // Try network
        console.log(`🌐 [SW] Fetching from network: ${new URL(request.url).pathname}`);
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        console.warn(`📴 [SW] Offline - cannot fetch: ${new URL(request.url).pathname}`);
        
        // For navigation requests, return cached index.html
        if (request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          const fallback = await cache.match('/dashers-finance-manager/index.html');
          if (fallback) return fallback;
        }
        
        return new Response('Offline - Content not available', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});

// ============================================================================
// 🔄 MESSAGES
// ============================================================================
self.addEventListener('message', event => {
  console.log('📨 [SW] Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'UPDATE_CACHE') {
    updateCache();
  }
});

// Cache update function
async function updateCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    console.log('🔄 [SW] Updating cache...');
    
    for (const url of PRECACHE_URLS) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (err) {
        // Silent fail for updates
      }
    }
    console.log('✅ [SW] Cache update completed');
  } catch (err) {
    console.error('❌ [SW] Cache update failed:', err);
  }
}