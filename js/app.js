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
// Device Detection
// --------------------------
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isAndroid = /Android/.test(navigator.userAgent);

console.log('📱 Device Detection:', {
    isIOS: isIOS,
    isSafari: isSafari, 
    isAndroid: isAndroid,
    userAgent: navigator.userAgent
});

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
    const isDevEnvironment = location.host.includes('localhost') || 
                             location.href.includes('/dev/'); 
    
    if (indicator && isDevEnvironment) {
        indicator.style.display = 'block';
    } else {
        // Fallback for GitHub Pages hosting on the 'dev' branch
        if (location.href.includes('dashers-finance-manager') && location.href.includes('dev')) {
             if (indicator) {
                indicator.style.display = 'block';
            }
        }
    }
}

// --------------------------
// Cache Verification and Management
// --------------------------
async function verifyCacheAndRetry() {
    if ('caches' in window) {
        try {
            const cache = await caches.open('budget-tracker-v34');
            const keys = await cache.keys();
            console.log(`📊 Cache contains ${keys.length} items`);
            
            // Check for critical files
            const criticalFiles = [
                './index.html', 
                './js/app.js', 
                './js/db.js',
                './js/ui.js',
                './css/styles.css',
                './js/dashboard.js',
                './js/transactions.js',
                './js/accounts.js'
            ];
            
            const missingFiles = [];
            for (const file of criticalFiles) {
                const match = await cache.match(file);
                if (!match) {
                    missingFiles.push(file);
                    console.warn(`⚠️ Critical file missing from cache: ${file}`);
                } else {
                    console.log(`✅ Cached: ${file}`);
                }
            }
            
            if (missingFiles.length > 0 && navigator.onLine) {
                console.log('🔄 Attempting to cache missing files...');
                // Trigger service worker to update cache
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'UPDATE_CACHE'
                    });
                }
            }
            
            return missingFiles;
        } catch (err) {
            console.error('❌ Cache verification failed:', err);
            return [];
        }
    }
    return [];
}

// --------------------------
// iOS-specific Cache Warming
// --------------------------
function warmCacheForIOS() {
    if (!isIOS) return;
    
    console.log('🔥 Warming cache for iOS...');
    
    // Pre-warm cache by requesting critical resources
    const criticalResources = [
        './js/app.js',
        './js/db.js', 
        './js/ui.js',
        './css/styles.css',
        './index.html',
        './js/dashboard.js',
        './js/transactions.js'
    ];
    
    criticalResources.forEach(resource => {
        fetch(resource).catch(() => {
            // Silent fail - just warming cache
        });
    });
}

// --------------------------
// Test Offline Functionality
// --------------------------
async function testOfflineCapability() {
    console.log('🧪 Testing offline capability...');
    
    if (!navigator.onLine) {
        console.log('📴 Currently offline - verifying cached resources');
        const missingFiles = await verifyCacheAndRetry();
        
        if (missingFiles.length === 0) {
            console.log('✅ All critical files available offline');
        } else {
            console.warn(`⚠️ ${missingFiles.length} files missing for offline use`);
        }
    } else {
        console.log('✅ Online - caching should be active');
        
        // Verify cache even when online
        const missingFiles = await verifyCacheAndRetry();
        if (missingFiles.length === 0) {
            console.log('✅ All critical files cached successfully');
        }
    }
}

// --------------------------
// Force Cache Update on App Start
// --------------------------
function forceCacheUpdate() {
    if (navigator.onLine && navigator.serviceWorker && navigator.serviceWorker.controller) {
        console.log('🔄 Forcing cache update...');
        navigator.serviceWorker.controller.postMessage({
            type: 'UPDATE_CACHE'
        });
    }
}

// --------------------------
// Auxiliary UI Helpers (Toast, Offline Banner, Connection Icon)
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
    banner.textContent = '📴 You\'re offline — viewing cached data';
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

// --------------------------
// Service Worker Message Handler
// --------------------------
function setupServiceWorkerMessages() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
                console.log('🔄 Service worker update available:', event.data.version);
                // You could show a custom update notification here
            }
        });
    }
}

// --------------------------
// Enhanced Service Worker Registration
// --------------------------
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const reg = await navigator.serviceWorker.register('serviceWorker.js', { scope: './' });
            console.log('✅ Service Worker registered:', reg.scope);
            
            // Wait for service worker to be ready
            await navigator.serviceWorker.ready;
            console.log('✅ Service Worker ready');
            
            // Warm cache for iOS
            warmCacheForIOS();
            
            // Verify cache after registration
            setTimeout(async () => {
                const missingFiles = await verifyCacheAndRetry();
                if (missingFiles.length === 0) {
                    console.log('✅ All critical files cached successfully');
                }
            }, 3000);
            
            // Handle updates
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
            
            return reg;
        } catch (err) {
            console.error('❌ Service Worker registration failed:', err);
            return null;
        }
    }
    return null;
}

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

    // --- 6. Register Service Worker with enhanced caching ---
    await registerServiceWorker();

    // --- 7. Setup service worker message handling ---
    setupServiceWorkerMessages();

    // --- 8. If offline at startup, show offline banner ---
    if (!navigator.onLine) {
        showOfflineBanner();
    }

    // --- 9. Setup connection event listeners ---
    window.addEventListener('online', () => {
        updateConnectionIcon();
        console.log('✅ Back online');
        // Force cache update when coming back online
        setTimeout(forceCacheUpdate, 1000);
    });
    
    window.addEventListener('offline', () => {
        updateConnectionIcon();
        showOfflineBanner();
        console.log('📴 Gone offline');
    });
    
    // Initial connection status
    updateConnectionIcon();

    // --- 10. Setup Install / Dismiss button handlers ---
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

    // --- 11. Run offline capability test after everything loads ---
    setTimeout(() => {
        testOfflineCapability();
    }, 5000);

    // --- 12. Force cache update after a delay ---
    setTimeout(forceCacheUpdate, 8000);

    console.log('🚀 Budget Tracker initialized successfully');
});

// --------------------------
// Export functions for potential reuse
// --------------------------
export {
    verifyCacheAndRetry,
    testOfflineCapability,
    forceCacheUpdate,
    warmCacheForIOS
};