// ============================================================================
// 💰 Budget Tracker – iOS OPTIMIZED Service Worker (Fixed)
// ============================================================================

const CACHE_NAME = 'budget-tracker-v37'; // 🚨 Incremented Version

// 🔴 CRITICAL: These MUST exist for the app to load. 
// If any of these fail, the SW will NOT install (preventing broken offline state).
const CRITICAL_ASSETS = [
  '/dashers-finance-manager/',
  '/dashers-finance-manager/index.html',
  '/dashers-finance-manager/css/styles.css',
  '/dashers-finance-manager/js/app.js',
  '/dashers-finance-manager/js/ui.js',
  '/dashers-finance-manager/js/db.js'
];

// 🟡 AUXILIARY: These are good to have, but if one fails, we continue anyway.
const AUXILIARY_ASSETS = [
  '/dashers-finance-manager/manifest.json',
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

// 🏗️ INSTALL
self.addEventListener('install', event => {
  console.log('📦 [SW] Installing...');
  self.skipWaiting();

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      // 1. Install CRITICAL assets (Fail if any missing)
      try {
        await cache.addAll(CRITICAL_ASSETS);
        console.log('✅ [SW] Critical assets cached');
      } catch (err) {
        console.error('❌ [SW] Critical asset failed. Aborting install.', err);
        throw err; // This forces the SW to try again next reload
      }

      // 2. Try to install AUXILIARY assets (Don't fail if missing)
      const auxiliaryPromises = AUXILIARY_ASSETS.map(async url => {
        try {
            const req = new Request(url, { cache: 'reload' });
            const res = await fetch(req);
            if (res.ok) await cache.put(url, res);
        } catch (e) {
            console.warn(`⚠️ [SW] Could not cache optional: ${url}`);
        }
      });
      await Promise.allSettled(auxiliaryPromises);
    })()
  );
});

// ♻️ ACTIVATE
self.addEventListener('activate', event => {
  console.log('♻️ [SW] Activating...');
  event.waitUntil(
    (async () => {
      // Clean old caches
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
      // Take control immediately
      await self.clients.claim();
    })()
  );
});

// 🌍 FETCH
self.addEventListener('fetch', event => {
  const request = event.request;

  // Ignore non-GET and cross-origin
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

  // 1️⃣ NAVIGATION REQUESTS (HTML)
  // Strategy: Network First -> Fallback to Cache -> Fallback to /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try Network
          const networkResp = await fetch(request);
          if (networkResp.ok) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(request, networkResp.clone());
              return networkResp;
          }
        } catch (err) {
          // Network failed, fall through to cache
        }

        const cache = await caches.open(CACHE_NAME);
        
        // Try to match exact URL (e.g., /dashboard)
        const cachedResp = await cache.match(request, { ignoreSearch: true });
        if (cachedResp) return cachedResp;

        // Fallback: Serve the App Shell (index.html) for ALL navigation
        // This fixes the issue where deep links fail offline
        const appShell = await cache.match('/dashers-finance-manager/index.html', { ignoreSearch: true });
        return appShell || new Response('Offline - App Shell Missing', { status: 503 });
      })()
    );
    return;
  }

  // 2️⃣ ASSET REQUESTS (JS, CSS, IMAGES)
  // Strategy: Cache First -> Network -> Update Cache
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResp = await cache.match(request, { ignoreSearch: true });

      if (cachedResp) {
        // Return cached file immediately
        return cachedResp; 
      }

      try {
        const networkResp = await fetch(request);
        if (networkResp.ok) {
          cache.put(request, networkResp.clone());
        }
        return networkResp;
      } catch (err) {
        return new Response('', { status: 404 });
      }
    })()
  );
});

// 📨 MESSAGING
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});