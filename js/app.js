// app.js

// ✅ Enable debug console for testing; comment out for production
import { setupDebugConsole } from './debugConsole.js';
setupDebugConsole();

import { initUI } from './ui.js';
import { processRecurringTransactions, processDueBills } from './recurringjob.js';

// Optional check: warn if not HTTPS (affects PWA install prompt)
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  console.warn('⚠️ PWA install prompt might not work when not served over HTTPS');
}

// --------------------------
// Persistent Storage Request
// --------------------------
async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        if (granted) {
          console.log("✅ Persistent storage granted");
        } else {
          console.warn("⚠️ Persistent storage not granted");
        }
      } else {
        console.log("🔒 Already using persistent storage");
      }
    } catch (err) {
      console.error("❌ Error requesting persistent storage:", err);
    }
  } else {
    console.log("❌ Persistent storage API not supported");
  }
}

// --------------------------
// PWA Install Banner Logic
// --------------------------
let deferredPrompt = null;

function showInstallBanner() {
  const banner = document.getElementById('installBanner');
  if (banner) {
    banner.classList.add('show');
  }
}

function hideInstallBanner() {
  const banner = document.getElementById('installBanner');
  if (banner) {
    banner.classList.remove('show');
  }
}

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('📥 beforeinstallprompt event captured');
  showInstallBanner();
});

// --------------------------
// Main Initialization Block
// --------------------------
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Splash screen fade‐out
  const splash = document.getElementById('splashScreen');
  if (splash) {
    setTimeout(() => splash.classList.add('hidden'), 1200);
  }

  // 2. Initialize UI (navigation, view management)
  initUI();

  // 3. Run daily automation: recurring transactions + due bills
  await processRecurringTransactions();
  await processDueBills();

  // 4. Request persistent storage
  await requestPersistentStorage();

  // 5. Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('serviceWorker.js')
      .then(reg => {
        console.log('✅ Service Worker registered:', reg.scope);
        if (reg.waiting) {
          showUpdateToast(reg.waiting);
        }
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateToast(newWorker);
            }
          });
        });
      })
      .catch(err => console.error('❌ Service Worker registration failed:', err));
  }

  // 6. If offline at startup, show offline banner
  if (!navigator.onLine) {
    showOfflineBanner();
  }

  // 7. Setup Install / Dismiss button handlers
  const installBtn = document.getElementById('installBtn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) {
        console.warn('⚠️ Install prompt event not available');
        hideInstallBanner();
        return;
      }
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      console.log('👍 User choice for install:', choice.outcome);
      deferredPrompt = null;
      hideInstallBanner();
    });
  }
  const installDismissBtn = document.getElementById('installDismiss');
  if (installDismissBtn) {
    installDismissBtn.addEventListener('click', () => {
      console.log('🚫 User dismissed install banner');
      hideInstallBanner();
    });
  }

  updateConnectionIcon();
});



// --------------------------
// Auxiliary UI Helpers
// --------------------------
function showUpdateToast(worker) {
  if (document.getElementById('updateToast')) return;
  const toast = document.createElement('div');
  toast.id = 'updateToast';
  toast.innerHTML = `
    <div class="toast-content">
      <span>🚀 A new version of <strong>Budget Tracker</strong> is available!</span>
      <div class="toast-buttons">
        <button id="btnReload" class="button">Update</button>
        <button id="btnDismiss" class="button red">Dismiss</button>
      </div>
    </div>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  toast.querySelector('#btnReload').addEventListener('click', () => {
    worker.postMessage({ type: 'SKIP_WAITING' });
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔁 New version activated, reloading...');
      window.location.reload();
    });
  });

  toast.querySelector('#btnDismiss').addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  });
}

function showOfflineBanner() {
  if (document.getElementById('offlineBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'offlineBanner';
  banner.textContent = '📴 You’re offline — viewing cached data';
  banner.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #f39c12;
    color: white;
    text-align: center;
    padding: 8px 0;
    font-weight: bold;
    z-index: 9999;
    transition: transform 0.3s ease-in-out;
  `;
  document.body.appendChild(banner);

  window.addEventListener('online', () => {
    banner.style.transform = 'translateY(100%)';
    setTimeout(() => banner.remove(), 300);
  }, { once: true });
}

function updateConnectionIcon() {
  const icon = document.getElementById('connectionStatus');
  if (!icon) return;
  if (navigator.onLine) {
    icon.textContent = '🟢';
    icon.title = 'Online';
    icon.classList.remove('offline');
    icon.classList.add('online', 'syncing');
    setTimeout(() => icon.classList.remove('syncing'), 1500);
  } else {
    icon.textContent = '🔴';
    icon.title = 'Offline';
    icon.classList.remove('online');
    icon.classList.add('offline');
  }
}

window.addEventListener('online', updateConnectionIcon);
window.addEventListener('offline', updateConnectionIcon);
updateConnectionIcon();
