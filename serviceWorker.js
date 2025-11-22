// serviceWorker.js — GitHub Pages Compatible
const VERSION = "v1.0.3";
const STATIC_CACHE = `bt-static-${VERSION}`;
const RUNTIME_CACHE = `bt-runtime-${VERSION}`;

// GitHub Pages base path
const BASE = "/dashers-finance-manager/";

// Assets to precache (must use absolute BASE paths)
const STATIC_ASSETS = [
  BASE,
  BASE + "index.html",
  BASE + "manifest.json",
  BASE + "css/styles.css",

  // Core JS
  BASE + "js/app.js",
  BASE + "js/ui.js",
  BASE + "js/db.js",

  // Feature modules
  BASE + "js/dashboard.js",
  BASE + "js/accounts.js",
  BASE + "js/transactions.js",
  BASE + "js/budgets.js",
  BASE + "js/categories.js",
  BASE + "js/bills.js",
  BASE + "js/calendar.js",
  BASE + "js/reports.js",
  BASE + "js/settings.js",
  BASE + "js/recurring.js",
  BASE + "js/recurringJob.js",
  BASE + "js/emojiPicker.js",
  BASE + "js/charts.js",
  BASE + "js/dashboard_mobile.js",

  // Vendor
  BASE + "js/vendor/chart.umd.min.js",

  // Icons
  BASE + "assets/icons/icon-192.png",
  BASE + "assets/icons/icon-512.png",
  BASE + "assets/icons/icon-512-maskable.png"
];

// ---------------------- INSTALL ----------------------
self.addEventListener("install", (event) => {
  console.log("[SW] Installing…");

  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);

      await Promise.all(
        STATIC_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: "no-cache" });
            if (response.ok) {
              await cache.put(url, response);
            } else {
              console.warn("[SW] Skip (not OK):", url, response.status);
            }
          } catch (err) {
            console.warn("[SW] Cache failed:", url, err);
          }
        })
      );

      await self.skipWaiting();
      console.log("[SW] Install complete.");
    })()
  );
});

// ---------------------- ACTIVATE ----------------------
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating…");

  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      // Remove old caches
      await Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== RUNTIME_CACHE) {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          }
        })
      );

      await self.clients.claim();
      console.log("[SW] Ready.");
    })()
  );
});

// ---------------------- FETCH ----------------------
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.url.startsWith("chrome-extension://")) return;

  // Navigation requests → return cached index.html
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const network = await fetch(req);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, network.clone());
          return network;
        } catch {
          console.warn("[SW] Offline → serving cached index.html");
          return caches.match(BASE + "index.html");
        }
      })()
    );
    return;
  }

  // Static assets → cache-first
  if (["script", "style", "image", "font", "worker"].includes(req.destination)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Everything else → network-first
  event.respondWith(networkFirst(req));
});

// ---------------------- HELPERS ----------------------
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  try {
    const network = await fetch(req);
    if (network.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, network.clone());
    }
    return network;
  } catch {
    return cached || new Response("Offline", { status: 503 });
  }
}

async function networkFirst(req) {
  try {
    const network = await fetch(req);
    if (network.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, network.clone());
    }
    return network;
  } catch {
    const cached = await caches.match(req);
    return cached || new Response("Offline", { status: 503 });
  }
}

// Allow skipWaiting
self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});
