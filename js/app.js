// ============================================================================
// app.js - Main Application Entry Point (STABILIZED)
// ============================================================================

// --------------------------
// Imports (UNCHANGED)
// --------------------------
import { setupDebugConsole } from './debugConsole.js';
import { getAllItems, STORE_NAMES } from './db.js';
import { buildCategoryIndex } from './import/categoryRules.js';
import { initCategoryMapper } from './import/categoryMapper.js';

import { initUI } from './ui.js';
import { processRecurringTransactions, processDueBills } from './recurringJob.js';
import { applyLayoutChanges, LayoutModes } from './layoutManager.js';

import { APP_VERSION } from './version.js';

// --------------------------
// Global Category Intelligence (UNCHANGED)
// --------------------------
window.__DFM_CATEGORY_INDEX__ = [];
window.__DFM_CATEGORIES__ = [];

// --------------------------
// Debug Console (MOVED, SAFE)
// --------------------------
function initDebugConsoleSafe() {
    try {
        if (localStorage.getItem('debug') === 'true') {
            setupDebugConsole();
            console.log('[DEBUG] Debug console enabled');
        }
    } catch (err) {
        console.warn('[DEBUG] Debug console failed', err);
    }
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
                granted
                    ? console.log("✅ Persistent storage granted")
                    : console.warn("⚠️ Persistent storage not granted");
            } else {
                console.log("🔒 Already using persistent storage");
            }
        } catch (err) {
            console.error("❌ Error requesting persistent storage:", err);
        }
    }
}

// --------------------------
// PWA Install Banner Logic (UNCHANGED)
// --------------------------
let deferredPrompt = null;

function showInstallBanner() {
    document.getElementById('installBanner')?.classList.add('show');
}

function hideInstallBanner() {
    document.getElementById('installBanner')?.classList.remove('show');
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
});

// --------------------------
// Development Branch Indicator
// --------------------------
function checkBranchIndicator() {
    const indicator = document.getElementById('branchIndicator');
    const isDevEnvironment =
        location.host.includes('localhost') || location.href.includes('/dev/');

    if (indicator && isDevEnvironment) {
        indicator.style.display = 'block';
    }
}

// --------------------------
// Toast / Offline / Connection UI (UNCHANGED)
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
        navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
    });

    toast.querySelector('#btnDismiss').addEventListener('click', () => toast.remove());
}

function showOfflineBanner() {
    if (document.getElementById('offlineBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'offlineBanner';
    banner.textContent = '📴 You\'re offline — viewing cached data';
    banner.style.cssText = `
        position: fixed; bottom: 0; left: 0; right: 0;
        background: #f39c12; color: white; text-align: center;
        padding: 8px 0; font-weight: bold; z-index: 9999;
    `;
    document.body.appendChild(banner);

    window.addEventListener('online', () => banner.remove(), { once: true });
}

function updateConnectionIcon() {
    const icon = document.getElementById('connectionStatus');
    if (!icon) return;

    if (navigator.onLine) {
        icon.textContent = '🟢';
        icon.title = 'Online';
    } else {
        icon.textContent = '🔴';
        icon.title = 'Offline';
    }
}

// --------------------------
// Core App Initialisation (UNCHANGED LOGIC)
// --------------------------
async function initializeAppCore() {
    console.log('🚀 Starting core app initialization...');

    try {
        const categories = await getAllItems(STORE_NAMES.categories);
        window.__DFM_CATEGORIES__ = categories;
        window.__DFM_CATEGORY_INDEX__ = buildCategoryIndex(categories);
        initCategoryMapper();
    } catch (err) {
        console.error('❌ Failed to initialise category engines', err);
    }

    initUI();

    await processRecurringTransactions();
    await processDueBills();
    await requestPersistentStorage();

    console.log('✅ Core app initialization completed');
}

// ============================================================================
// BOOTSTRAP (SINGLE ENTRY POINT)
// ============================================================================
export async function bootstrapApp() {
    console.log("🚀 Dashers Finance - Version", APP_VERSION);

    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        console.warn('⚠️ PWA install prompt might not work without HTTPS');
    }

    initDebugConsoleSafe();

    checkBranchIndicator();

    // Splash screen
    const splash = document.getElementById("splashScreen");
    if (splash) {
        setTimeout(() => {
            splash.classList.add("fade-out");
            setTimeout(() => splash.classList.add("hidden"), 700);
        }, 1500);
    }

    await initializeAppCore();

    // Connectivity
    window.addEventListener('online', updateConnectionIcon);
    window.addEventListener('offline', () => {
        updateConnectionIcon();
        showOfflineBanner();
    });
    updateConnectionIcon();

    if (!navigator.onLine) showOfflineBanner();

    // Install buttons
    document.getElementById('installBtn')?.addEventListener('click', async () => {
        if (!deferredPrompt) return hideInstallBanner();
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        hideInstallBanner();
    });

    document.getElementById('installDismiss')?.addEventListener('click', hideInstallBanner);

    console.log('🎉 Budget Tracker fully initialized!');
}
