// ============================================================================
// 💰 Budget Tracker – Enhanced Service Worker (iOS-Compatible Offline Version)
// ----------------------------------------------------------------------------
// Full offline support with enhanced iOS compatibility and error handling
// ============================================================================

const CACHE_NAME = 'budget-tracker-v35'; // 🚨 Incremented version

// 🎯 CRITICAL FIX: Expanded cache list with all required files
const PRECACHE_URLS = [
  // Root and core files
  './',
  './index.html',
  './manifest.json',
  
  // CSS
  './css/styles.css',

  // Core Application JS - ALL essential files
  './js/app.js',
  './js/ui.js',
  './js/db.js',
  './js/db_dexie.js',
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

  // Feature Modules
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

  // Vendor Libraries
  './js/vendor/chart.umd.min.js',
  './js/vendor/dexie.min.js',

  // Icons and Assets
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable_icon.png',
  './assets/icons/splash.png',
  './assets/icons/icon-152.png',
  './assets/icons/icon-167.png',
  './assets/icons/icon-180.png'
];

// ============================================================================
// 🏗️ INSTALL – Enhanced caching with better error handling
// ============================================================================
self.addEventListener('install', event => {
  console.log('📦 [SW] Installing and caching essential files...');

  // 🚨 CRITICAL FIX: Use waitUntil to ensure installation completes
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log(`✅ Cache opened: ${CACHE_NAME}`);
        
        // Enhanced caching with individual error handling
        const cachePromises = PRECACHE_URLS.map(async url => {
          try {
            // Use 'no-cache' to ensure we get the latest version
            const response = await fetch(url, {
              cache: 'no-cache',
              headers: { 'Pragma': 'no-cache' }
            });
            
            if (response.ok) {
              await cache.put(url, response);
              console.log(`✅ Successfully cached: ${url}`);
              return { url, status: 'success' };
            } else {
              console.warn(`⚠️ Failed to cache ${url}: HTTP ${response.status}`);
              return { url, status: 'failed', reason: `HTTP ${response.status}` };
            }
          } catch (error) {
            console.warn(`⚠️ Could not cache ${url}:`, error.message);
            return { url, status: 'failed', reason: error.message };
          }
        });

        const results = await Promise.allSettled(cachePromises);
        
        const successful = results.filter(r => 
          r.status === 'fulfilled' && r.value.status === 'success'
        ).length;
        
        const failed = results.length - successful;
        
        console.log(`📊 Cache Summary: ${successful} successful, ${failed} failed`);
        
        if (failed > 0) {
          console.warn(`🚨 ${failed} files failed to cache - offline functionality may be limited`);
        }

        // 🚨 CRITICAL FIX: Force immediate activation (iOS compatibility)
        await self.skipWaiting();
        console.log('✅ [SW] Installation completed - skipping waiting');
        
      } catch (error) {
        console.error('❌ [SW] Installation failed:', error);
        // Even if installation fails, we don't want to break the app
      }
    })()
  );
});

// ============================================================================
// ♻️ ACTIVATE – Enhanced cleanup and client control
// ============================================================================
self.addEventListener('activate', event => {
  console.log('♻️ [SW] Activating service worker and cleaning old caches...');

  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheKeys = await caches.keys();
        const deletePromises = cacheKeys.map(key => {
          if (key !== CACHE_NAME) {
            console.log(`🗑️ Deleting old cache: ${key}`);
            return caches.delete(key);
          }
        });
        
        await Promise.all(deletePromises);
        console.log('✅ Old caches cleaned up');
        
        // 🚨 CRITICAL FIX: Take immediate control of all clients
        await self.clients.claim();
        console.log('✅ [SW] Now controlling all clients');
        
        // Notify all clients about activation
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({ 
            type: 'SW_ACTIVATED',
            version: CACHE_NAME,
            timestamp: new Date().toISOString()
          });
        });
        
      } catch (error) {
        console.error('❌ [SW] Activation failed:', error);
      }
    })()
  );
});

// ============================================================================
// 🌍 FETCH – Enhanced caching strategy for maximum offline support
// ============================================================================
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // 🚫 Skip non-GET requests and cross-origin requests
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // 🚫 Block source map requests
  if (request.url.endsWith('.map')) {
    event.respondWith(new Response('', { status: 204 }));
    return;
  }

  // 🎯 STRATEGY: Cache-first with network fallback for optimal offline support
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      try {
        // First, try to get from cache
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
          console.log(`📂 Serving from cache: ${request.url}`);
          
          // 🚨 CRITICAL FIX: Update cache in background if online
          if (navigator.onLine) {
            event.waitUntil(
              (async () => {
                try {
                  const networkResponse = await fetch(request);
                  if (networkResponse.ok) {
                    await cache.put(request, networkResponse);
                    console.log(`🔄 Updated cache in background: ${request.url}`);
                  }
                } catch (error) {
                  // Silent fail - we have cached version
                }
              })()
            );
          }
          
          return cachedResponse;
        }

        // 🚨 CRITICAL FIX: If not in cache and online, fetch and cache
        if (navigator.onLine) {
          const networkResponse = await fetch(request);
          
          if (networkResponse.ok) {
            // Clone response before caching (Response can only be read once)
            await cache.put(request, networkResponse.clone());
            console.log(`✅ Fetched and cached: ${request.url}`);
            return networkResponse;
          } else {
            throw new Error(`HTTP ${networkResponse.status}`);
          }
        } else {
          // 🚨 OFFLINE: Resource not in cache and we're offline
          throw new Error('Offline and not cached');
        }
        
      } catch (error) {
        console.warn(`📴 Offline/error for: ${request.url}`, error.message);
        
        // 🎯 Enhanced offline fallbacks based on file type
        const destination = request.destination || 'document';
        
        switch (destination) {
          case 'document':
          case '': // Some requests don't have destination
            // Try to return the main page for navigation requests
            const fallbackHtml = await cache.match('./index.html');
            if (fallbackHtml) {
              return fallbackHtml;
            }
            break;
            
          case 'script':
            return new Response(
              `console.log("📴 Script offline: ${request.url}");`,
              { headers: { 'Content-Type': 'application/javascript' } }
            );
            
          case 'style':
            return new Response(
              `/* 📴 Styles offline: ${request.url} */`,
              { headers: { 'Content-Type': 'text/css' } }
            );
            
          case 'image':
            // Return a transparent pixel for missing images
            return new Response(
              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
        }
        
        // Generic offline response
        return new Response(
          `📴 Offline - "${request.url}" not available`,
          { 
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 
              'Content-Type': 'text/plain',
              'Cache-Control': 'no-cache'
            }
          }
        );
      }
    })()
  );
});

// ============================================================================
// 📨 MESSAGE HANDLING – Enhanced communication with main app
// ============================================================================
self.addEventListener('message', event => {
  console.log('📨 [SW] Received message:', event.data);
  
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      console.log('⚡ [SW] Skip waiting triggered');
      self.skipWaiting();
      break;
      
    case 'UPDATE_CACHE':
      console.log('🔄 [SW] Manual cache update requested');
      updateSpecificCache(data?.urls);
      break;
      
    case 'GET_CACHE_STATUS':
      event.ports[0]?.postMessage({
        type: 'CACHE_STATUS',
        cacheName: CACHE_NAME,
        cachedUrls: PRECACHE_URLS
      });
      break;
      
    case 'CLEAR_CACHE':
      clearOldCaches();
      break;
  }
});

// ============================================================================
// 🛠️ UTILITY FUNCTIONS
// ============================================================================

/**
 * Update specific URLs in cache
 */
async function updateSpecificCache(urls = PRECACHE_URLS) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const updatePromises = urls.map(async url => {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (response.ok) {
          await cache.put(url, response);
          console.log(`🔄 Updated: ${url}`);
          return { url, status: 'updated' };
        }
      } catch (error) {
        console.warn(`⚠️ Could not update ${url}:`, error.message);
        return { url, status: 'failed', error: error.message };
      }
    });
    
    const results = await Promise.allSettled(updatePromises);
    console.log('✅ Cache update completed', results);
    
  } catch (error) {
    console.error('❌ Cache update failed:', error);
  }
}

/**
 * Clear all old caches except current
 */
async function clearOldCaches() {
  try {
    const cacheKeys = await caches.keys();
    const deletePromises = cacheKeys.map(key => {
      if (key !== CACHE_NAME) {
        console.log(`🗑️ Deleting cache: ${key}`);
        return caches.delete(key);
      }
    });
    
    await Promise.all(deletePromises);
    console.log('✅ All old caches cleared');
    
  } catch (error) {
    console.error('❌ Error clearing caches:', error);
  }
}

/**
 * Notify all clients about updates
 */
async function notifyClients(message) {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SW_MESSAGE',
        timestamp: new Date().toISOString(),
        ...message
      });
    });
  } catch (error) {
    console.error('❌ Failed to notify clients:', error);
  }
}

// ============================================================================
// 📡 LIFECYCLE EVENT LISTENERS
// ============================================================================

self.addEventListener('controllerchange', () => {
  console.log('🔁 [SW] Controller changed - new service worker activated');
  notifyClients({
    type: 'CONTROLLER_CHANGED',
    message: 'New service worker is now active'
  });
});

self.addEventListener('waiting', (event) => {
  console.log('🕓 [SW] Update waiting - notify clients to reload');
  notifyClients({
    type: 'UPDATE_AVAILABLE',
    message: 'A new version is available. Please reload.',
    version: CACHE_NAME
  });
});

// Periodic cache validation (every 24 hours)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cache-validation') {
    event.waitUntil(updateSpecificCache());
  }
});

console.log('✅ Service Worker loaded successfully');