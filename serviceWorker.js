// ============================================================================
// 💰 Budget Tracker – Enhanced Service Worker (Fixed Cache Management)
// ============================================================================

const CACHE_NAME = 'budget-tracker-v35'; // 🚨 Keep this consistent
const DYNAMIC_CACHE = 'budget-tracker-dynamic';

// 🎯 CRITICAL FIX: Remove files that don't exist to avoid 404 errors
const PRECACHE_URLS = [
  // Root and core files
  './',
  './index.html',
  './manifest.json',
  
  // CSS
  './css/styles.css',

  // Core Application JS - ONLY files that actually exist
  './js/app.js',
  './js/ui.js',
  './js/db.js',
  './js/db_dexie.js',
  './js/debugConsole.js',
  './js/recurringJob.js',
  // './js/exportimport.js', // 🚨 REMOVED - file doesn't exist
  './js/loanCalculations.js',
  './js/reports.js',
  './js/settings.js',
  // './js/emojipicker.js', // 🚨 REMOVED - file doesn't exist
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
  // './js/costbase.js', // 🚨 REMOVED - file doesn't exist

  // Vendor Libraries
  './js/vendor/chart.umd.min.js',
  './js/vendor/dexie.min.js',

  // Icons and Assets
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  // './assets/icons/maskable_icon.png', // 🚨 REMOVED - file doesn't exist
  './assets/icons/splash.png',
  './assets/icons/icon-152.png',
  './assets/icons/icon-167.png',
  './assets/icons/icon-180.png'
];

// ============================================================================
// 🏗️ INSTALL – Enhanced with cache existence checking
// ============================================================================
self.addEventListener('install', event => {
  console.log('📦 [SW] Installing and caching essential files...');

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log(`✅ Cache opened: ${CACHE_NAME}`);
        
        // Enhanced caching with file existence checking
        const cacheResults = [];
        
        for (const url of PRECACHE_URLS) {
          try {
            const response = await fetch(url, {
              cache: 'no-cache',
              headers: { 'Pragma': 'no-cache' }
            });
            
            if (response.ok) {
              await cache.put(url, response);
              console.log(`✅ Successfully cached: ${url}`);
              cacheResults.push({ url, status: 'success' });
            } else {
              console.warn(`⚠️ Failed to cache ${url}: HTTP ${response.status}`);
              cacheResults.push({ url, status: 'failed', reason: `HTTP ${response.status}` });
            }
          } catch (error) {
            console.warn(`⚠️ Could not cache ${url}:`, error.message);
            cacheResults.push({ url, status: 'failed', reason: error.message });
          }
        }

        const successful = cacheResults.filter(r => r.status === 'success').length;
        const failed = cacheResults.filter(r => r.status === 'failed').length;
        
        console.log(`📊 Cache Summary: ${successful} successful, ${failed} failed`);
        
        if (failed > 0) {
          console.log('🚨 Failed files:', cacheResults.filter(r => r.status === 'failed').map(r => r.url));
        }

        // 🚨 CRITICAL FIX: Force immediate activation
        await self.skipWaiting();
        console.log('✅ [SW] Installation completed - skipping waiting');
        
      } catch (error) {
        console.error('❌ [SW] Installation failed:', error);
      }
    })()
  );
});

// ============================================================================
// ♻️ ACTIVATE – Enhanced cleanup
// ============================================================================
self.addEventListener('activate', event => {
  console.log('♻️ [SW] Activating service worker and cleaning old caches...');

  event.waitUntil(
    (async () => {
      try {
        // Clean up ALL old caches except current
        const cacheKeys = await caches.keys();
        const deletePromises = cacheKeys.map(key => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            console.log(`🗑️ Deleting old cache: ${key}`);
            return caches.delete(key);
          }
        });
        
        await Promise.all(deletePromises);
        console.log('✅ Old caches cleaned up');
        
        // 🚨 CRITICAL FIX: Take immediate control
        await self.clients.claim();
        console.log('✅ [SW] Now controlling all clients');
        
        // Notify all clients
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
// 🌍 FETCH – Enhanced strategy with proper cache checking
// ============================================================================
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip source maps
  if (request.url.endsWith('.map')) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      try {
        // Try cache first
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
          console.log(`📂 Serving from cache: ${getFileName(request.url)}`);
          
          // Update cache in background if online
          if (navigator.onLine) {
            event.waitUntil(
              (async () => {
                try {
                  const networkResponse = await fetch(request);
                  if (networkResponse.ok) {
                    await cache.put(request, networkResponse);
                    console.log(`🔄 Updated cache: ${getFileName(request.url)}`);
                  }
                } catch (error) {
                  // Silent fail
                }
              })()
            );
          }
          
          return cachedResponse;
        }

        // Not in cache - try network
        if (navigator.onLine) {
          const networkResponse = await fetch(request);
          
          if (networkResponse.ok) {
            // Cache the response for future use
            await cache.put(request, networkResponse.clone());
            console.log(`✅ Fetched and cached: ${getFileName(request.url)}`);
            return networkResponse;
          } else {
            throw new Error(`HTTP ${networkResponse.status}`);
          }
        } else {
          // Offline and not in cache
          throw new Error('Offline and not cached');
        }
        
      } catch (error) {
        console.warn(`📴 Offline/error: ${getFileName(request.url)} - ${error.message}`);
        
        // Provide better fallbacks
        return createFallbackResponse(request, error.message);
      }
    })()
  );
});

// ============================================================================
// 🛠️ UTILITY FUNCTIONS
// ============================================================================

/**
 * Get filename from URL for cleaner logging
 */
function getFileName(url) {
  return url.split('/').pop() || url;
}

/**
 * Create appropriate fallback responses
 */
function createFallbackResponse(request, error) {
  const url = request.url;
  const destination = request.destination || 'document';
  
  // For HTML navigation, try to return the main page
  if (destination === 'document' || url.endsWith('.html')) {
    return caches.match('./index.html')
      .then(response => response || new Response(
        `<!DOCTYPE html>
        <html>
        <head><title>Offline</title></head>
        <body>
          <h1>📴 You're Offline</h1>
          <p>Budget Tracker is not available offline.</p>
          <p>Error: ${error}</p>
        </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      ));
  }
  
  // For other file types, return appropriate empty responses
  switch (destination) {
    case 'script':
      return new Response(
        `console.log("📴 Script offline: ${url}");`,
        { headers: { 'Content-Type': 'application/javascript' } }
      );
      
    case 'style':
      return new Response(
        `/* 📴 CSS offline: ${url} */`,
        { headers: { 'Content-Type': 'text/css' } }
      );
      
    case 'image':
      return new Response(
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
      
    default:
      return new Response(
        `📴 Offline - "${getFileName(url)}" not available\nError: ${error}`,
        { 
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        }
      );
  }
}

/**
 * Update cache - enhanced version
 */
async function updateSpecificCache(urls = PRECACHE_URLS) {
  try {
    const cache = await caches.open(CACHE_NAME);
    console.log(`🔄 Updating ${urls.length} files in cache...`);
    
    const updatePromises = urls.map(async url => {
      try {
        const response = await fetch(url, { 
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (response.ok) {
          await cache.put(url, response);
          console.log(`✅ Updated: ${getFileName(url)}`);
          return { url, status: 'updated' };
        } else {
          console.warn(`⚠️ Failed to update ${url}: HTTP ${response.status}`);
          return { url, status: 'failed', reason: `HTTP ${response.status}` };
        }
      } catch (error) {
        console.warn(`⚠️ Could not update ${url}:`, error.message);
        return { url, status: 'failed', reason: error.message };
      }
    });
    
    const results = await Promise.allSettled(updatePromises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 'updated').length;
    
    console.log(`✅ Cache update completed: ${successful}/${urls.length} files updated`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Cache update failed:', error);
    throw error;
  }
}

// ============================================================================
// 📨 MESSAGE HANDLING
// ============================================================================
self.addEventListener('message', event => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      console.log('⚡ Skip waiting triggered');
      self.skipWaiting();
      break;
      
    case 'UPDATE_CACHE':
      console.log('🔄 Manual cache update requested');
      event.waitUntil(updateSpecificCache(data?.urls));
      break;
      
    case 'GET_CACHE_INFO':
      event.ports?.[0]?.postMessage({
        type: 'CACHE_INFO',
        cacheName: CACHE_NAME,
        precachedUrls: PRECACHE_URLS,
        timestamp: new Date().toISOString()
      });
      break;
  }
});

console.log('✅ Service Worker loaded successfully');