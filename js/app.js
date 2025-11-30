// ============================================================================
// app.js - Main Application Entry Point
// ============================================================================

// ✅ Enable debug console for testing; comment out for production
import { setupDebugConsole } from './debugConsole.js';
setupDebugConsole();

import { initUI } from './ui.js';
import { processRecurringTransactions, processDueBills } from './recurringJob.js';
import { applyLayoutChanges, LayoutModes } from './layoutManager.js';
import { initDashboardMobileV2UI } from './dashboard_mobile_v2.js';
import { initDashboardDesktopUI } from './dashboard_desktop.js';

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
        console[granted ? 'log' : 'warn'](granted ? '✅ Persistent storage granted' : '⚠️ Persistent storage not granted');
      } else {
        console.log('🔒 Already using persistent storage');
      }
    } catch (err) {
      console.error('❌ Error requesting persistent storage:', err);
    }
  } else {
    console.log('❌ Persistent storage API not supported');
  }
}

// --------------------------
// PWA Install Banner Logic
// --------------------------
let deferredPrompt = null;

function showInstallBanner() {
  const banner = document.getElementById('installBanner');
  if (banner) banner.classList.add('show');
}
function hideInstallBanner() {
  const banner = document.getElementById('installBanner');
  if (banner) banner.classList.remove('show');
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('📥 beforeinstallprompt event captured');
  showInstallBanner();
});

// --------------------------
// Development Branch Indicator
// --------------------------
function checkBranchIndicator() {
  const indicator = document.getElementById('branchIndicator');
  const isDevEnvironment = location.host.includes('localhost') || location.href.includes('/dev/');
  if (indicator && isDevEnvironment) {
    indicator.style.display = 'block';
  } else if (location.href.includes('dashers-finance-manager') && location.href.includes('dev')) {
    if (indicator) indicator.style.display = 'block';
  }
}

// --------------------------
// Connection UI Helpers
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
      console.log('🔁 New version activated, reloading…');
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
    position: fixed; bottom: 0; left: 0; right: 0;
    background: #f39c12; color: white; text-align: center;
    padding: 8px 0; font-weight: bold; z-index: 9999;
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

// ============================================================================
// Main Initialization
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // 0) Dev UI
  checkBranchIndicator();

  // 1) Login
  const loginScreen = document.getElementById('loginScreen');
  const loginForm = document.getElementById('loginForm');
  if (localStorage.getItem('loggedIn') === 'true') loginScreen?.classList.add('hidden');

  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if (email && password) {
      localStorage.setItem('loggedIn', 'true');
      loginScreen?.classList.add('hidden');
      console.log('✅ Logged in successfully');
    } else {
      alert('Please enter valid credentials');
    }
  });

  window.logout = () => {
    localStorage.removeItem('loggedIn');
    loginScreen?.classList.remove('hidden');
  };

  // 2) Splash
  const splash = document.getElementById('splashScreen');
  if (splash) setTimeout(() => splash.classList.add('hidden'), 1200);

  // 3) Responsive layout
  applyLayoutChanges((mode) => {
    console.log(`📱 Layout changed → ${mode}`);
    if (mode === LayoutModes.MOBILE) {
      document.body.classList.add('is-mobile');
      document.body.classList.remove('is-desktop');
      initDashboardMobileV2UI();
    } else {
      document.body.classList.add('is-desktop');
      document.body.classList.remove('is-mobile');
      initDashboardDesktopUI();
    }
  });

  // 4) Initialize global UI
  initUI();

  // 5) Automations
  await processRecurringTransactions();
  await processDueBills();

  // 6) Storage
  await requestPersistentStorage();

  // 7) Service Worker (page-side events belong here)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('./serviceWorker.js', { scope: './' });
      console.log('✅ Service Worker registered:', reg.scope);

      if (reg.waiting) showUpdateToast(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast(newWorker);
          }
        });
      });
    } catch (err) {
      console.error('❌ Service Worker registration failed:', err);
    }
  }

  // 8) Offline UI at startup
  if (!navigator.onLine) showOfflineBanner();

  // 9) Install banner buttons
  const installBtn = document.getElementById('installBtn');
  installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) {
      console.warn('⚠️ Install prompt not available');
      hideInstallBanner();
      return;
    }
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    console.log('👍 User choice for install:', choice.outcome);
    deferredPrompt = null;
    hideInstallBanner();
  });

  const installDismissBtn = document.getElementById('installDismiss');
  installDismissBtn?.addEventListener('click', () => {
    console.log('🚫 User dismissed install banner');
    hideInstallBanner();
  });
});
