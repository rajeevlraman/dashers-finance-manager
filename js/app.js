// ============================================================================
// app.js - Main Application Entry Point with iOS Home Screen Support
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
            const cache = await caches.open('budget-tracker-v36'); // 🚨 Match SW version
            const keys = await cache.keys();
            console.log(`📊 Cache contains ${keys.length} items`);
            
            // Log what's actually in cache
            if (keys.length > 0) {
                console.log('📋 Cached files:');
                keys.forEach(request => {
                    console.log(`   ✅ ${new URL(request.url).pathname}`);
                });
            }
            
            // Check for critical files with correct paths
            const criticalFiles = [
                '/dashers-finance-manager/index.html',
                '/dashers-finance-manager/js/app.js',
                '/dashers-finance-manager/js/db.js',
                '/dashers-finance-manager/js/ui.js',
                '/dashers-finance-manager/css/styles.css',
                '/dashers-finance-manager/js/dashboard.js',
                '/dashers-finance-manager/js/transactions.js',
                '/dashers-finance-manager/js/accounts.js'
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
                console.log(`🔄 ${missingFiles.length} files missing, triggering cache update...`);
                // Trigger service worker to update cache
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'UPDATE_CACHE'
                    });
                }
            } else if (missingFiles.length === 0) {
                console.log('✅ All critical files cached successfully!');
            }
            
            return missingFiles;
        } catch (err) {
            console.error('❌ Cache verification failed:', err);
            return [];
        }
    }
    console.log('❌ Cache API not supported');
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
        '/dashers-finance-manager/js/app.js',
        '/dashers-finance-manager/js/db.js', 
        '/dashers-finance-manager/js/ui.js',
        '/dashers-finance-manager/css/styles.css',
        '/dashers-finance-manager/index.html',
        '/dashers-finance-manager/js/dashboard.js',
        '/dashers-finance-manager/js/transactions.js'
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
// iOS Home Screen Launch Fix
// --------------------------
function setupIOSHomeScreenLaunch() {
    if (!isIOS) return;
    
    console.log('📱 Setting up iOS home screen launch handler...');
    
    // Check if we're in standalone mode (launched from home screen)
    const isStandalone = window.navigator.standalone === true;
    
    if (isStandalone) {
        console.log('📱 iOS: Launched from home screen');
        document.body.classList.add('ios-standalone');
        
        // Add iOS-specific styles for home screen app
        const style = document.createElement('style');
        style.textContent = `
            .ios-standalone {
                padding-top: env(safe-area-inset-top);
                padding-bottom: env(safe-area-inset-bottom);
                padding-left: env(safe-area-inset-left);
                padding-right: env(safe-area-inset-right);
            }
            .ios-standalone header {
                padding-top: env(safe-area-inset-top);
            }
        `;
        document.head.appendChild(style);
    }
    
    // Service Worker readiness check for iOS
    let swReadyCheckAttempts = 0;
    const maxSwReadyAttempts = 10;
    
    function checkSWReady() {
        if (navigator.serviceWorker.controller) {
            console.log('✅ iOS: Service Worker is controlling the page');
            return true;
        }
        
        if (swReadyCheckAttempts < maxSwReadyAttempts) {
            swReadyCheckAttempts++;
            console.log(`⏳ iOS: Waiting for SW (attempt ${swReadyCheckAttempts}/${maxSwReadyAttempts})`);
            setTimeout(checkSWReady, 500);
            return false;
        }
        
        console.warn('⚠️ iOS: Service Worker not controlling after max attempts');
        
        // Last resort: try to reload if online
        if (navigator.onLine && isStandalone) {
            console.log('🔄 iOS: Attempting reload to activate Service Worker');
            setTimeout(() => window.location.reload(), 2000);
        }
        
        return false;
    }
    
    // Start checking for Service Worker readiness
    setTimeout(checkSWReady, 1000);
}

// --------------------------
// Enhanced Service Worker Registration for iOS
// --------------------------
// --------------------------
// Simplified Service Worker Registration
// --------------------------
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            console.log('🔧 Registering Service Worker...');
            
            const reg = await navigator.serviceWorker.register('serviceWorker.js', { 
                scope: '/dashers-finance-manager/',
                updateViaCache: 'none'
            });
            
            console.log('✅ Service Worker registered:', reg.scope);
            
            // Wait for controller to be set
            if (navigator.serviceWorker.controller) {
                console.log('✅ Service Worker is CONTROLLING the page');
                return reg;
            }
            
            // If no controller, wait a bit and check again
            return new Promise((resolve) => {
                const checkController = () => {
                    if (navigator.serviceWorker.controller) {
                        console.log('✅ Service Worker now CONTROLLING the page');
                        resolve(reg);
                    } else {
                        console.log('⏳ Waiting for Service Worker control...');
                        setTimeout(checkController, 500);
                    }
                };
                setTimeout(checkController, 100);
            });
            
        } catch (err) {
            console.error('❌ Service Worker registration failed:', err);
            return null;
        }
    }
    console.log('❌ Service Worker not supported');
    return null;
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
            
            if (event.data && event.data.type === 'SW_READY') {
                console.log('✅ Service Worker reports ready:', event.data.version);
            }
        });
    }
}

// --------------------------
// Core App Initialization
// --------------------------
async function initializeAppCore() {
    console.log('🚀 Starting core app initialization...');
    
    // Your existing initialization code here:
    checkBranchIndicator();
    
    // Login handling
    const loginScreen = document.getElementById('loginScreen');
    const loginForm = document.getElementById('loginForm');
    
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
    
    // Layout detection
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
    
    // Initialize UI
    initUI();
    
    // Run automation
    await processRecurringTransactions();
    await processDueBills();
    
    // Request persistent storage
    await requestPersistentStorage();
    
    // Cache verification
    setTimeout(async () => {
        await verifyCacheAndRetry();
    }, 2000);
    
    console.log('✅ Core app initialization completed');
}

// --------------------------
// Enhanced App Initialization with iOS Support
// --------------------------
async function initializeAppWithIOSSupport() {
    console.log('🚀 Starting app initialization with iOS support...');
    
    // Show splash screen immediately for iOS
    const splash = document.getElementById('splashScreen');
    if (splash) {
        splash.classList.remove('hidden');
    }
    
    // Setup iOS home screen launch fixes
    setupIOSHomeScreenLaunch();
    
    // Register service worker FIRST (critical for iOS)
    await registerServiceWorker();
    
    // Setup service worker message handling
    setupServiceWorkerMessages();
    
    // Then initialize the rest of the app
    await initializeAppCore();
    
    // Hide splash screen after everything is ready
    if (splash) {
        setTimeout(() => splash.classList.add('hidden'), 1000);
    }
}

// --------------------------
// Error Handling
// --------------------------
window.addEventListener('error', function(e) {
    console.error('🚨 Global error caught:', e.error);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('🚨 Unhandled promise rejection:', e.reason);
});

// ============================================================================
// --------------------------
// Main Initialization Block
// --------------------------
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM Content Loaded - Starting app...');
    
    // Use the new iOS-optimized initialization
    await initializeAppWithIOSSupport();

    // --- Setup connection event listeners ---
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

    // --- Setup Install / Dismiss button handlers ---
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

    // --- Run offline capability test after everything loads ---
    setTimeout(() => {
        testOfflineCapability();
    }, 5000);

    // --- Force cache update after a delay ---
    setTimeout(forceCacheUpdate, 8000);

    console.log('🎉 Budget Tracker fully initialized with iOS support!');
});

// --------------------------
// Manual Cache Refresh (for debugging)
// --------------------------
window.forceCacheRefresh = async function() {
    console.log('🔄 Manual cache refresh triggered');
    if ('caches' in window) {
        try {
            await caches.delete('budget-tracker-v36');
            console.log('✅ Old cache deleted');
        } catch (err) {
            console.error('❌ Cache deletion failed:', err);
        }
    }
    
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'UPDATE_CACHE' });
    }
    
    // Reload to trigger fresh installation
    setTimeout(() => window.location.reload(), 1000);
};



// --------------------------
// Service Worker Debugging
// --------------------------
async function debugServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                console.log('🔍 SW Debug Info:', {
                    controller: !!navigator.serviceWorker.controller,
                    state: registration.active?.state,
                    scope: registration.scope,
                    version: 'v36'
                });
            } else {
                console.warn('❌ No service worker registration found');
            }
        } catch (err) {
            console.error('❌ SW debug failed:', err);
        }
    }
}

// Call this in your DOMContentLoaded after service worker registration
setTimeout(debugServiceWorker, 2000);

// --------------------------
// Export functions for potential reuse
// --------------------------
export {
    verifyCacheAndRetry,
    testOfflineCapability,
    forceCacheUpdate,
    warmCacheForIOS
};