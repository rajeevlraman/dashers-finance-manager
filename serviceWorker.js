// ============================================================================
// 💰 Budget Tracker – Service Worker with IMMEDIATE Control
// ============================================================================

const CACHE_NAME = 'budget-tracker-v37'; // 🚨 Bump version

const PRECACHE_URLS = [
  '/dashers-finance-manager/',
  '/dashers-finance-manager/index.html',
  '/dashers-finance-manager/manifest.json',
  '/dashers-finance-manager/css/styles.css',
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
  '/dashers-finance-manager/js/vendor/chart.umd.min.js',
  '/dashers-finance-manager/vendor/dexie.min.js',
  '/dashers-finance-manager/assets/icons/icon-192.png',
  '/dashers-finance-manager/assets/icons/icon-512.png'
];

// ============================================================================
// 🏗️ INSTALL – Force immediate activation
// ============================================================================
self.addEventListener('install', event => {
  console.log('📦 [SW] Installing...');
  
  // CRITICAL: Skip waiting immediately
  self.skipWaiting();

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        
        // Cache critical files first
        const criticalFiles = [
          '/dashers-finance-manager/index.html',
          '/dashers-finance-manager/js/app.js',
          '/dashers-finance-manager/js/db.js',
          '/dashers-finance-manager/js/ui.js',
          '/dashers-finance-manager/css/styles.css'
        ];
        
        for (const url of criticalFiles) {
          try {
            await cache.add(url);
            console.log(`✅ [SW] Cached: ${url}`);
          } catch (err) {
            console.warn(`⚠️ [SW] Failed to cache ${url}`);
          }
        }
        
        console.log('✅ [SW] Installation completed');
      } catch (err) {
        console.error('❌ [SW] Installation failed:', err);
      }
    })()
  );
});

// ============================================================================
// ♻️ ACTIVATE – Force immediate control
// ============================================================================
self.addEventListener('activate', event => {
  console.log('♻️ [SW] Activating and taking control...');

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
        
        // CRITICAL: Claim clients immediately - no waiting
        await self.clients.claim();
        console.log('✅ [SW] Now controlling all clients immediately');
        
        // Notify all clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({ 
            type: 'SW_CONTROLLING',
            version: CACHE_NAME 
          });
        });
        
      } catch (err) {
        console.error('❌ [SW] Activation failed:', err);
      }
    })()
  );
});

// ============================================================================
// 🌍 FETCH – Simple cache-first strategy
// ============================================================================
self.addEventListener('fetch', event => {
  const request = event.request;
  
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;
  if (request.url.endsWith('.map')) {
    event.respondWith(new Response('', { status: 204 }));
    return;
  }

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
        // For navigation, return cached index.html
        if (request.mode === 'navigate') {
          const fallback = await cache.match('/dashers-finance-manager/index.html');
          if (fallback) return fallback;
        }
        return new Response('Offline', { status: 503 });
      }
    })()
  );
});

// ============================================================================
// 🔄 MESSAGES
// ============================================================================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});