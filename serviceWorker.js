// ============================================================================
// 💰 Budget Tracker – iOS-Optimized Service Worker
// ============================================================================

const CACHE_NAME = 'budget-tracker-v36'; // 🚨 Increment version
const DYNAMIC_CACHE = 'budget-tracker-dynamic';

// 🎯 CRITICAL iOS FIX: Reduced cache list to essential files only
const PRECACHE_URLS = [
  // Core files only - iOS has limits
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',

  // Essential JS files only
  './js/app.js',
  './js/ui.js',
  './js/db.js',
  './js/dashboard.js',
  './js/transactions.js',
  './js/accounts.js',
  './js/budgets.js',
  './js/vendor/chart.umd.min.js',
  './js/vendor/dexie.min.js',

  // Essential icons only
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

// ============================================================================
// 🏗️ INSTALL – iOS-Optimized (Sequential, not parallel)
// ============================================================================
self.addEventListener('install', event => {
  console.log('📦 [SW] Installing essential files for iOS...');

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log(`✅ Cache opened: ${CACHE_NAME}`);
        
        // 🚨 CRITICAL iOS FIX: Cache files SEQUENTIALLY, not in parallel
        let successful = 0;
        let failed = 0;
        
        for (const url of PRECACHE_URLS) {
          try {
            // 🚨 iOS FIX: Add timeout and simpler fetch
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            
            const response = await fetch(url, {
              signal: controller.signal,
              cache: 'no-cache'
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              await cache.put(url, response);
              console.log(`✅ Cached: ${getFileName(url)}`);
              successful++;
            } else {
              console.warn(`⚠️ Failed to cache ${url}: HTTP ${response.status}`);
              failed++;
            }
          } catch (error) {
            console.warn(`⚠️ Could not cache ${url}:`, error.name);
            failed++;
            
            // 🚨 iOS FIX: Continue even if some files fail
            continue;
          }
        }

        console.log(`📊 iOS Cache Summary: ${successful} successful, ${failed} failed`);
        
        // 🚨 CRITICAL iOS FIX: Skip waiting immediately
        self.skipWaiting().catch(err => {
          console.log('⚠️ Skip waiting failed, continuing anyway:', err);
        });
        
        console.log('✅ [SW] iOS installation completed');
        
      } catch (error) {
        console.error('❌ [SW] Installation failed:', error);
        // 🚨 iOS FIX: Even if installation fails, try to activate
        self.skipWaiting().catch(() => {});
      }
    })()
  );
});

// ============================================================================
// ♻️ ACTIVATE – iOS-Optimized Cleanup
// ============================================================================
self.addEventListener('activate', event => {
  console.log('♻️ [SW] Activating service worker for iOS...');

  event.waitUntil(
    (async () => {
      try {
        // 🚨 iOS FIX: Cleanup old caches with timeout protection
        const cacheKeys = await caches.keys();
        const cleanupPromises = cacheKeys.map(async key => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            try {
              await caches.delete(key);
              console.log(`🗑️ Deleted old cache: ${key}`);
            } catch (err) {
              console.warn(`⚠️ Could not delete cache ${key}:`, err);
            }
          }
        });
        
        await Promise.allSettled(cleanupPromises);
        console.log('✅ Cache cleanup completed');
        
        // 🚨 CRITICAL iOS FIX: Claim clients with timeout
        try {
          await self.clients.claim();
          console.log('✅ [SW] Now controlling all clients');
        } catch (claimError) {
          console.warn('⚠️ clients.claim() failed:', claimError);
        }
        
      } catch (error) {
        console.error('❌ [SW] Activation failed:', error);
      }
    })()
  );
});

// ============================================================================
// 🌍 FETCH – iOS-Optimized Strategy
// ============================================================================
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip source maps and analytics
  if (request.url.endsWith('.map') || request.url.includes('google-analytics')) {
    return;
  }

  // 🚨 iOS FIX: Use simpler, more reliable fetch strategy
  event.respondWith(
    (async () => {
      // For navigation requests, always try cache first for speed
      if (request.mode === 'navigate') {
        try {
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match('./index.html');
          if (cachedResponse) {
            console.log('📱 Serving index.html from cache');
            return cachedResponse;
          }
        } catch (error) {
          console.warn('⚠️ Cache match failed for navigation:', error);
        }
      }

      try {
        // Try network first for better data freshness
        const networkResponse = await fetch(request);
        
        // If successful, cache it
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone()).catch(err => {
            console.warn('⚠️ Cache put failed:', err);
          });
        }
        
        return networkResponse;
        
      } catch (networkError) {
        console.log(`📴 Network failed, trying cache: ${getFileName(request.url)}`);
        
        // Network failed, try cache
        try {
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(request);
          
          if (cachedResponse) {
            console.log(`📱 Serving from cache: ${getFileName(request.url)}`);
            return cachedResponse;
          }
          
          // Nothing in cache - return offline page for HTML, error for others
          if (request.mode === 'navigate') {
            return caches.match('./index.html')
              .then(response => response || createOfflineResponse());
          } else {
            throw new Error('Offline and not cached');
          }
          
        } catch (cacheError) {
          console.warn('⚠️ Cache match also failed:', cacheError);
          return createOfflineResponse();
        }
      }
    })()
  );
});

// ============================================================================
// 🛠️ iOS-OPTIMIZED UTILITY FUNCTIONS
// ============================================================================

/**
 * Get filename from URL for cleaner logging
 */
function getFileName(url) {
  const parts = url.split('/');
  return parts[parts.length - 1] || url;
}

/**
 * Create offline response - iOS compatible
 */
function createOfflineResponse() {
  return new Response(
    `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Budget Tracker - Offline</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; text-align: center; }
        .icon { font-size: 48px; margin: 20px 0; }
        h1 { color: #333; }
        p { color: #666; }
      </style>
    </head>
    <body>
      <div class="icon">📴</div>
      <h1>You're Offline</h1>
      <p>Budget Tracker needs an internet connection for this content.</p>
      <p>Basic functionality may be available when you're back online.</p>
    </body>
    </html>`,
    { 
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

/**
 * iOS-Optimized cache update - Sequential with timeouts
 */
async function updateCacheForIOS(urls = PRECACHE_URLS) {
  console.log('🔄 Starting iOS-optimized cache update...');
  
  try {
    const cache = await caches.open(CACHE_NAME);
    let updated = 0;
    let failed = 0;
    
    // 🚨 iOS FIX: Update files SEQUENTIALLY with timeouts
    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
        
        const response = await fetch(url, {
          signal: controller.signal,
          cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          await cache.put(url, response);
          console.log(`✅ Updated: ${getFileName(url)}`);
          updated++;
        } else {
          console.warn(`⚠️ Failed to update ${url}: HTTP ${response.status}`);
          failed++;
        }
        
        // 🚨 iOS FIX: Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.warn(`⚠️ Could not update ${url}:`, error.name);
        failed++;
        continue; // Continue with next file
      }
    }
    
    console.log(`✅ iOS cache update: ${updated} updated, ${failed} failed`);
    return { updated, failed };
    
  } catch (error) {
    console.error('❌ iOS cache update failed:', error);
    throw error;
  }
}

// ============================================================================
// 📨 MESSAGE HANDLING – iOS-Optimized
// ============================================================================
self.addEventListener('message', event => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      console.log('⚡ Skip waiting triggered');
      self.skipWaiting().catch(err => {
        console.warn('⚠️ Skip waiting failed:', err);
      });
      break;
      
    case 'UPDATE_CACHE':
      console.log('🔄 Cache update requested for iOS');
      // 🚨 iOS FIX: Don't use event.waitUntil for cache updates
      updateCacheForIOS(data?.urls).catch(err => {
        console.error('❌ Cache update failed:', err);
      });
      break;
      
    case 'GET_CACHE_STATUS':
      // Simple response without complex operations
      event.ports?.[0]?.postMessage({
        type: 'CACHE_STATUS',
        cacheName: CACHE_NAME,
        fileCount: PRECACHE_URLS.length
      });
      break;
  }
});

// ============================================================================
// 📡 LIFECYCLE EVENT LISTENERS
// ============================================================================

self.addEventListener('controllerchange', () => {
  console.log('🔁 Controller changed - new SW active');
});

self.addEventListener('waiting', () => {
  console.log('🕓 Update waiting - notify clients');
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'UPDATE_AVAILABLE',
        message: 'New version ready'
      });
    });
  }).catch(err => {
    console.warn('⚠️ Could not notify clients:', err);
  });
});

console.log('✅ iOS-Optimized Service Worker loaded');