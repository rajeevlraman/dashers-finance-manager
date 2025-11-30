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
// Development Branch Indicator Logic
// --------------------------
function checkBranchIndicator() {
    const indicator = document.getElementById('branchIndicator');
    
    // Checks for localhost or explicit 'dev' in the URL path.
    // NOTE: If using the 'is_development_branch.txt' method, replace this with the fetch logic.
    const isDevEnvironment = location.host.includes('localhost') || 
                             location.href.includes('/dev/'); 
    
    if (indicator && isDevEnvironment) {
        indicator.style.display = 'block';
    } else {
        // Fallback for GitHub Pages hosting on the 'dev' branch
        // This is a simple heuristic: if the app is on GitHub Pages,
        // and we have a way to confirm the branch (e.g., marker file)
        // the indicator should show. 
        // For now, using the basic URL check from the original logic:
        if (location.href.includes('dashers-finance-manager') && location.href.includes('dev')) {
             if (indicator) {
                indicator.style.display = 'block';
            }
        }
    }
}


// --------------------------
// Auxiliary UI Helpers (Toast, Offline Banner, Connection Icon)
// --------------------------
// (Functions showUpdateToast, showOfflineBanner, updateConnectionIcon moved here for brevity)

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


// ============================================================================
// --------------------------
// Main Initialization Block (Single DOMContentLoaded Event)
// --------------------------
document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 0. Development Branch Check ---
    checkBranchIndicator();

    // --- 1. Login/Authentication Logic ---
    const loginScreen = document.getElementById('loginScreen');
    const loginForm = document.getElementById('loginForm');

    // If user already logged in, skip login
    if (localStorage.getItem('loggedIn') === 'true') {
        loginScreen && loginScreen.classList.add('hidden');
    }

    // Handle login
    loginForm && loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        // Simple validation (you can replace this later)
        if (email && password) {
            localStorage.setItem('loggedIn', 'true');
            loginScreen && loginScreen.classList.add('hidden');
            console.log('✅ Logged in successfully');
        } else {
            alert('Please enter valid credentials');
        }
    });

    // Optional: fake logout (you can trigger this elsewhere)
    window.logout = () => {
        localStorage.removeItem('loggedIn');
        loginScreen && loginScreen.classList.remove('hidden');
    };

    // --- 2. Splash screen fade‐out ---
    const splash = document.getElementById('splashScreen');
    if (splash) {
        setTimeout(() => splash.classList.add('hidden'), 1200);
    }

//layout detection
document.addEventListener('DOMContentLoaded', async () => {

    // --- 0. Development Branch Check ---
    checkBranchIndicator();

    // --- 1. Login/Authentication Logic ---
    const loginScreen = document.getElementById('loginScreen');
    const loginForm = document.getElementById('loginForm');
    if (localStorage.getItem('loggedIn') === 'true') {
        loginScreen && loginScreen.classList.add('hidden');
    }

    loginForm && loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        if (email && password) {
            localStorage.setItem('loggedIn', 'true');
            loginScreen && loginScreen.classList.add('hidden');
            console.log('✅ Logged in successfully');
        } else {
            alert('Please enter valid credentials');
        }
    });

    // Optional: fake logout
    window.logout = () => {
        localStorage.removeItem('loggedIn');
        loginScreen && loginScreen.classList.remove('hidden');
    };

    // --- 2. Splash screen fade‐out ---
    const splash = document.getElementById('splashScreen');
    if (splash) setTimeout(() => splash.classList.add('hidden'), 1200);

    // --- 🧭 2.5 Apply responsive layout detection ---
    applyLayoutChanges(mode => {
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

    // --- 3. Initialize global UI (nav, menus, etc.) ---
    initUI();

    // --- 4. Run daily automation ---
    await processRecurringTransactions();
    await processDueBills();

    // --- 5. Request persistent storage ---
    await requestPersistentStorage();

    // --- 6. Register Service Worker ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('serviceWorker.js', { scope: './' })
            .then(reg => {
                console.log('✅ Service Worker registered:', reg.scope);
                if (reg.waiting) showUpdateToast(reg.waiting);
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

    // --- 7. If offline at startup, show offline banner ---
    if (!navigator.onLine) showOfflineBanner();

    // --- 8. Setup Install / Dismiss button handlers ---
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
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
    }

    const installDismissBtn = document.getElementById('installDismiss');
    if (installDismissBtn) {
        installDismissBtn.addEventListener('click', () => {
            console.log('🚫 User dismissed install banner');
            hideInstallBanner();
        });
    }
});


    // --- 3. Initialize UI (navigation, view management) ---
    initUI();

    // --- 4. Run daily automation: recurring transactions + due bills ---
    await processRecurringTransactions();
    await processDueBills();

    // --- 5. Request persistent storage ---
    await requestPersistentStorage();

    // --- 6. Register Service Worker for PWA ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('serviceWorker.js', { scope: './' })
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

    // --- 7. If offline at startup, show offline banner ---
    if (!navigator.onLine) {
        showOfflineBanner();
    }

    // --- 8. Setup Install / Dismiss button handlers ---
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
});

// Add this to your main app.js to debug service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistration().then(registration => {
    if (registration) {
      console.log('🔍 [APP-DEBUG] Service Worker registered:', registration);
      console.log('🔍 [APP-DEBUG] Service Worker state:', registration.active?.state);
      
      // Request cache status from SW
      if (registration.active) {
        registration.active.postMessage({ type: 'GET_CACHE_STATUS' });
      }
    } else {
      console.log('🔍 [APP-DEBUG] No Service Worker registration found');
    }
  });

  // Listen for messages from Service Worker
  navigator.serviceWorker.addEventListener('message', event => {
    console.log('🔍 [APP-DEBUG] Message from SW:', event.data);
  });
}