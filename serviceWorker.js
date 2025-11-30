// ============================================================================
// 💰 Budget Tracker – Enhanced Service Worker (DEBUG VERSION)
// ----------------------------------------------------------------------------
// Full offline support with enhanced iOS compatibility and error handling
// ============================================================================

const CACHE_NAME = 'budget-tracker-v35-debug'; // 🚨 Added -debug suffix
const DEBUG = true; // 🚨 Enable detailed debugging

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

// 🚨 DEBUG: Log all URLs that should be cached
console.log('🔍 [SW-DEBUG] PRECACHE_URLS to cache:', PRECACHE_URLS);
console.log(`🔍 [SW-DEBUG] Total URLs to cache: ${PRECACHE_URLS.length}`);



// ============================================================================
// 🏗️ INSTALL – Enhanced caching with comprehensive debugging
// ============================================================================
self.addEventListener('install', event => {
  console.log('📦 [SW] Installing and caching essential files...');
  console.log(`🔍 [SW-DEBUG] Install event triggered at: ${new Date().toISOString()}`);

  // 🚨 CRITICAL FIX: Use waitUntil to ensure installation completes
  event.waitUntil(
    (async () => {
      try {
        console.log('🔍 [SW-DEBUG] Opening cache:', CACHE_NAME);
        const cache = await caches.open(CACHE_NAME);
        console.log(`✅ Cache opened: ${CACHE_NAME}`);
        
        // 🚨 DEBUG: Check cache before adding
        const existingKeys = await cache.keys();
        console.log(`🔍 [SW-DEBUG] Existing cache entries before install: ${existingKeys.length}`);
        
        // Enhanced caching with individual error handling
        const cachePromises = PRECACHE_URLS.map(async (url, index) => {
          try {
            console.log(`🔍 [SW-DEBUG] Attempting to cache [${index + 1}/${PRECACHE_URLS.length}]: ${url}`);
            
            // Use 'no-cache' to ensure we get the latest version
            const fetchOptions = {
              cache: 'no-cache',
              headers: { 'Pragma': 'no-cache' }
            };
            
            console.log(`🔍 [SW-DEBUG] Fetching: ${url}`);
            const response = await fetch(url, fetchOptions);
            
            if (response.ok) {
              console.log(`🔍 [SW-DEBUG] Successfully fetched ${url}, status: ${response.status}`);
              await cache.put(url, response);
              console.log(`✅ Successfully cached: ${url}`);
              return { url, status: 'success', size: response.headers.get('content-length') };
            } else {
              console.warn(`⚠️ Failed to cache ${url}: HTTP ${response.status} - ${response.statusText}`);
              console.log(`🔍 [SW-DEBUG] Response headers:`, Object.fromEntries(response.headers.entries()));
              return { url, status: 'failed', reason: `HTTP ${response.status}` };
            }
          } catch (error) {
            console.warn(`⚠️ Could not cache ${url}:`, error.message);
            console.error(`🔍 [SW-DEBUG] Error details:`, error);
            return { url, status: 'failed', reason: error.message };
          }
        });

        console.log('🔍 [SW-DEBUG] Starting cache process...');
        const results = await Promise.allSettled(cachePromises);
        
        // 🚨 DEBUG: Analyze cache results
        const successful = results.filter(r => 
          r.status === 'fulfilled' && r.value.status === 'success'
        ).length;
        
        const failed = results.filter(r => 
          r.status === 'fulfilled' && r.value.status === 'failed'
        ).length;
        
        const rejected = results.filter(r => r.status === 'rejected').length;
        
        console.log(`📊 Cache Summary: ${successful} successful, ${failed} failed, ${rejected} rejected`);
        
        // 🚨 DEBUG: Log failed URLs
        if (failed > 0 || rejected > 0) {
          console.warn('🚨 FAILED/RESJECTED CACHE ATTEMPTS:');
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              console.warn(`❌ [${index}] ${PRECACHE_URLS[index]} - REJECTED:`, result.reason);
            } else if (result.value.status === 'failed') {
              console.warn(`❌ [${index}] ${PRECACHE_URLS[index]} - FAILED:`, result.value.reason);
            }
          });
        }

        // 🚨 DEBUG: Verify what's actually in cache
        const finalKeys = await cache.keys();
        console.log(`🔍 [SW-DEBUG] Final cache entries: ${finalKeys.length}`);
        finalKeys.forEach((request, index) => {
          console.log(`🔍 [SW-DEBUG] Cache entry ${index + 1}: ${request.url}`);
        });

        // 🚨 CRITICAL FIX: Force immediate activation (iOS compatibility)
        console.log('🔍 [SW-DEBUG] Skipping waiting phase...');
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
// ♻️ ACTIVATE – Enhanced cleanup and client control with debugging
// ============================================================================
self.addEventListener('activate', event => {
  console.log('♻️ [SW] Activating service worker and cleaning old caches...');
  console.log(`🔍 [SW-DEBUG] Activate event at: ${new Date().toISOString()}`);

  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheKeys = await caches.keys();
        console.log(`🔍 [SW-DEBUG] Found caches:`, cacheKeys);
        
        const deletePromises = cacheKeys.map(key => {
          if (key !== CACHE_NAME) {
            console.log(`🗑️ Deleting old cache: ${key}`);
            return caches.delete(key);
          }
        });
        
        await Promise.all(deletePromises);
        console.log('✅ Old caches cleaned up');
        
        // 🚨 DEBUG: Verify current cache contents
        const currentCache = await caches.open(CACHE_NAME);
        const currentKeys = await currentCache.keys();
        console.log(`🔍 [SW-DEBUG] Current cache "${CACHE_NAME}" has ${currentKeys.length} entries`);
        
        // 🚨 CRITICAL FIX: Take immediate control of all clients
        console.log('🔍 [SW-DEBUG] Claiming clients...');
        await self.clients.claim();
        console.log('✅ [SW] Now controlling all clients');
        
        // Notify all clients about activation
        const clients = await self.clients.matchAll();
        console.log(`🔍 [SW-DEBUG] Found ${clients.length} clients to notify`);
        
        clients.forEach(client => {
          client.postMessage({ 
            type: 'SW_ACTIVATED',
            version: CACHE_NAME,
            timestamp: new Date().toISOString(),
            cacheSize: currentKeys.length,
            debug: true
          });
        });
        
      } catch (error) {
        console.error('❌ [SW] Activation failed:', error);
      }
    })()
  );
});

// ============================================================================
// 🌍 FETCH – Enhanced caching strategy with detailed debugging
// ============================================================================
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  console.log(`🔍 [SW-FETCH] Intercepted: ${request.method} ${request.url}`);
  console.log(`🔍 [SW-FETCH] Destination: ${request.destination}, Mode: ${request.mode}`);

  // 🚫 Skip non-GET requests and cross-origin requests
  if (request.method !== 'GET') {
    console.log(`🔍 [SW-FETCH] Skipping non-GET request: ${request.method}`);
    return;
  }

    // 🚫 Block source map requests to avoid 404 errors
  if (request.url.endsWith('.map')) {
    event.respondWith(new Response('', { status: 204 }));
    return;
  }

  if (!request.url.startsWith(self.location.origin)) {
    console.log(`🔍 [SW-FETCH] Skipping cross-origin request: ${request.url}`);
    return;
  }

  // 🚫 Block source map requests
  if (request.url.endsWith('.map')) {
    console.log(`🔍 [SW-FETCH] Blocking source map: ${request.url}`);
    event.respondWith(new Response('', { status: 204 }));
    return;
  }

  // 🎯 STRATEGY: Cache-first with network fallback for optimal offline support
  event.respondWith(
    (async () => {
      console.log(`🔍 [SW-FETCH] Processing: ${request.url}`);
      const cache = await caches.open(CACHE_NAME);
      
      try {
        // First, try to get from cache
        console.log(`🔍 [SW-FETCH] Checking cache for: ${request.url}`);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
          console.log(`📂 Serving from cache: ${request.url}`);
          
          // 🚨 CRITICAL FIX: Update cache in background if online
          if (navigator.onLine) {
            console.log(`🔍 [SW-FETCH] Online - updating cache in background: ${request.url}`);
            event.waitUntil(
              (async () => {
                try {
                  const networkResponse = await fetch(request);
                  if (networkResponse.ok) {
                    await cache.put(request, networkResponse);
                    console.log(`🔄 Updated cache in background: ${request.url}`);
                  } else {
                    console.warn(`🔍 [SW-FETCH] Background update failed: HTTP ${networkResponse.status}`);
                  }
                } catch (error) {
                  console.warn(`🔍 [SW-FETCH] Background update error:`, error.message);
                }
              })()
            );
          }
          
          return cachedResponse;
        }

        console.log(`🔍 [SW-FETCH] Not in cache: ${request.url}`);
        
        // 🚨 CRITICAL FIX: If not in cache and online, fetch and cache
        if (navigator.onLine) {
          console.log(`🔍 [SW-FETCH] Fetching from network: ${request.url}`);
          const networkResponse = await fetch(request);
          
          if (networkResponse.ok) {
            // Clone response before caching (Response can only be read once)
            const responseClone = networkResponse.clone();
            await cache.put(request, responseClone);
            console.log(`✅ Fetched and cached: ${request.url}`);
            return networkResponse;
          } else {
            console.warn(`🔍 [SW-FETCH] Network response not OK: HTTP ${networkResponse.status}`);
            throw new Error(`HTTP ${networkResponse.status}`);
          }
        } else {
          // 🚨 OFFLINE: Resource not in cache and we're offline
          console.warn(`🔍 [SW-FETCH] Offline and not cached: ${request.url}`);
          throw new Error('Offline and not cached');
        }
        
      } catch (error) {
        console.warn(`📴 Offline/error for: ${request.url}`, error.message);
        
        // 🎯 Enhanced offline fallbacks based on file type
        const destination = request.destination || 'document';
        console.log(`🔍 [SW-FETCH] Using fallback for destination: ${destination}`);
        
        switch (destination) {
          case 'document':
          case '': // Some requests don't have destination
            // Try to return the main page for navigation requests
            console.log(`🔍 [SW-FETCH] Trying fallback HTML for: ${request.url}`);
            const fallbackHtml = await cache.match('./index.html');
            if (fallbackHtml) {
              console.log(`🔍 [SW-FETCH] Using HTML fallback for: ${request.url}`);
              return fallbackHtml;
            }
            break;
            
          case 'script':
            console.log(`🔍 [SW-FETCH] Using script fallback for: ${request.url}`);
            return new Response(
              `console.log("📴 Script offline: ${request.url}");`,
              { headers: { 'Content-Type': 'application/javascript' } }
            );
            
          case 'style':
            console.log(`🔍 [SW-FETCH] Using style fallback for: ${request.url}`);
            return new Response(
              `/* 📴 Styles offline: ${request.url} */`,
              { headers: { 'Content-Type': 'text/css' } }
            );
            
          case 'image':
            console.log(`🔍 [SW-FETCH] Using image fallback for: ${request.url}`);
            // Return a transparent pixel for missing images
            return new Response(
              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
        }
        
        // Generic offline response
        console.warn(`🔍 [SW-FETCH] Using generic fallback for: ${request.url}`);
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
  console.log(`🔍 [SW-DEBUG] Message event at: ${new Date().toISOString()}`, event.data);
  
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
      console.log('🔍 [SW] Cache status requested');
      event.ports[0]?.postMessage({
        type: 'CACHE_STATUS',
        cacheName: CACHE_NAME,
        cachedUrls: PRECACHE_URLS,
        debug: true,
        timestamp: new Date().toISOString()
      });
      break;
      
    case 'CLEAR_CACHE':
      console.log('🗑️ [SW] Clear cache requested');
      clearOldCaches();
      break;
      
    case 'DEBUG_CACHE_CONTENTS':
      console.log('🔍 [SW] Debug cache contents requested');
      debugCacheContents(event);
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
  console.log(`🔍 [SW-DEBUG] updateSpecificCache called with ${urls.length} URLs`);
  
  try {
    const cache = await caches.open(CACHE_NAME);
    const updatePromises = urls.map(async url => {
      try {
        console.log(`🔍 [SW-DEBUG] Updating: ${url}`);
        const response = await fetch(url, { cache: 'no-cache' });
        if (response.ok) {
          await cache.put(url, response);
          console.log(`🔄 Updated: ${url}`);
          return { url, status: 'updated' };
        } else {
          console.warn(`⚠️ Update failed for ${url}: HTTP ${response.status}`);
          return { url, status: 'failed', error: `HTTP ${response.status}` };
        }
      } catch (error) {
        console.warn(`⚠️ Could not update ${url}:`, error.message);
        return { url, status: 'failed', error: error.message };
      }
    });
    
    const results = await Promise.allSettled(updatePromises);
    console.log('✅ Cache update completed', results);
    
    // Notify clients about update completion
    notifyClients({
      type: 'CACHE_UPDATE_COMPLETE',
      results: results
    });
    
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
    console.log(`🔍 [SW-DEBUG] Clearing caches. Found:`, cacheKeys);
    
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
 * Debug: Get current cache contents
 */
async function debugCacheContents(event) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const contents = await Promise.all(
      keys.map(async (request, index) => {
        const response = await cache.match(request);
        return {
          url: request.url,
          status: response?.status || 'no-response',
          size: response?.headers.get('content-length') || 'unknown',
          type: response?.headers.get('content-type') || 'unknown'
        };
      })
    );
    
    event.ports[0]?.postMessage({
      type: 'DEBUG_CACHE_CONTENTS',
      cacheName: CACHE_NAME,
      totalEntries: contents.length,
      entries: contents,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Debug cache contents failed:', error);
    event.ports[0]?.postMessage({
      type: 'DEBUG_CACHE_ERROR',
      error: error.message
    });
  }
}

/**
 * Notify all clients about updates
 */
async function notifyClients(message) {
  try {
    const clients = await self.clients.matchAll();
    console.log(`🔍 [SW-DEBUG] Notifying ${clients.length} clients:`, message);
    
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
  console.log(`🔍 [SW-DEBUG] Controller change at: ${new Date().toISOString()}`);
  
  notifyClients({
    type: 'CONTROLLER_CHANGED',
    message: 'New service worker is now active',
    version: CACHE_NAME
  });
});

self.addEventListener('waiting', (event) => {
  console.log('🕓 [SW] Update waiting - notify clients to reload');
  console.log(`🔍 [SW-DEBUG] Waiting event at: ${new Date().toISOString()}`);
  
  notifyClients({
    type: 'UPDATE_AVAILABLE',
    message: 'A new version is available. Please reload.',
    version: CACHE_NAME
  });
});

// Periodic cache validation (every 24 hours)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cache-validation') {
    console.log('🔄 [SW] Periodic sync triggered for cache validation');
    event.waitUntil(updateSpecificCache());
  }
});

console.log('✅ Service Worker DEBUG version loaded successfully');
console.log(`🔍 [SW-DEBUG] Service Worker scope: ${self.registration?.scope || 'unknown'}`);
console.log(`🔍 [SW-DEBUG] Service Worker state: ${self.state || 'unknown'}`);