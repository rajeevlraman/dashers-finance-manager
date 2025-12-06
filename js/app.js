// ============================================================================
// app.js - Main Application Entry Point
// ============================================================================

// ✅ Enable debug console for testing; comment out for production
import { setupDebugConsole } from './debugConsole.js';
setupDebugConsole();

import { initUI } from './ui.js';
import { processRecurringTransactions, processDueBills } from './recurringJob.js';
import { applyLayoutChanges, LayoutModes } from './layoutManager.js';
//version import 
import { APP_VERSION } from './version.js';
console.log("🚀 Dashers Finance - Version", APP_VERSION);


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
    console.log("📥 beforeinstallprompt fired!"); 
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
    
    const isDevEnvironment = location.host.includes('localhost') || 
                             location.href.includes('/dev/'); 
    
    if (indicator && isDevEnvironment) {
        indicator.style.display = 'block';
    } else {
        if (location.href.includes('dashers-finance-manager') && location.href.includes('dev')) {
             if (indicator) {
                indicator.style.display = 'block';
            }
        }
    }
}

// --------------------------
// Enhanced Professional Login Functionality
// --------------------------
function setupProfessionalLogin() {
    const loginScreen = document.getElementById('loginScreen');
    const loginForm = document.getElementById('loginForm');
    const loginButton = document.getElementById('loginButton');
    const loginError = document.getElementById('loginError');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');



 

    // Check for saved credentials
    const savedEmail = localStorage.getItem('savedEmail');
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    
    if (savedEmail && rememberMe) {
        emailInput.value = savedEmail;
        document.getElementById('rememberMe').checked = true;
    }

    // Auto-hide login if already logged in
    if (localStorage.getItem('loggedIn') === 'true') {
        loginScreen.classList.add('hidden');
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const rememberMe = document.getElementById('rememberMe').checked;

        // Show loading state
        loginButton.classList.add('loading');
        loginButton.disabled = true;
        loginError.style.display = 'none';

        // Simulate authentication delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Enhanced validation
        if (validateCredentials(email, password)) {
            // Save credentials if remember me is checked
            if (rememberMe) {
                localStorage.setItem('savedEmail', email);
                localStorage.setItem('rememberMe', 'true');
            } else {
                localStorage.removeItem('savedEmail');
                localStorage.removeItem('rememberMe');
            }

            // Set logged in state
            localStorage.setItem('loggedIn', 'true');
            localStorage.setItem('userEmail', email);
            
            // Hide login screen with smooth transition
            loginScreen.style.opacity = '0';
            setTimeout(() => {
                loginScreen.classList.add('hidden');
                loginScreen.style.opacity = '1';
            }, 300);

            console.log('✅ User authenticated successfully');
        } else {
            // Show error
            loginError.style.display = 'block';
            emailInput.classList.add('error');
            passwordInput.classList.add('error');
        }

        // Reset button state
        loginButton.classList.remove('loading');
        loginButton.disabled = false;
    });

    // Real-time validation
    emailInput.addEventListener('input', () => {
        emailInput.classList.remove('error');
        loginError.style.display = 'none';
    });

    passwordInput.addEventListener('input', () => {
        passwordInput.classList.remove('error');
        loginError.style.display = 'none';
    });

    // Forgot password handler
    document.getElementById('forgotPassword')?.addEventListener('click', (e) => {
        e.preventDefault();
        showForgotPasswordModal();
    });

    // Register link handler
    document.getElementById('registerLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showRegistrationModal();
    });
}

function validateCredentials(email, password) {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return false;
    }

    // Password strength (at least 6 characters)
    if (password.length < 6) {
        return false;
    }

    // For demo purposes - replace with real authentication
    const demoAccounts = [
        { email: 'admin@budgettracker.com', password: 'demo123' },
        { email: 'user@example.com', password: 'password123' }
    ];

    return demoAccounts.some(acc => acc.email === email && acc.password === password);
}

function showForgotPasswordModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Reset Password</h3>
            <p>Enter your email to receive a password reset link.</p>
            <input type="email" placeholder="Your email" class="form-input">
            <div class="modal-actions">
                <button class="btn btn-primary">Send Reset Link</button>
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function showRegistrationModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Create Account</h3>
            <p>Registration feature coming soon.</p>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
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
// Enhanced App Initialization
// --------------------------
async function initializeAppCore() {
    console.log('🚀 Starting core app initialization...');
    
    // Layout detection
/*
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
*/    
    // Initialize UI
    // Only initialize UI *after login*
    if (localStorage.getItem("loggedIn") === "true") {
        initUI();
    }

    
    // Run automation
    await processRecurringTransactions();
    await processDueBills();
    
    // Request persistent storage
    await requestPersistentStorage();
    
    console.log('✅ Core app initialization completed');
}

// ============================================================================
// --------------------------
// Main Initialization Block (Single DOMContentLoaded Event)
// --------------------------
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM Content Loaded - Starting app...');
    
    // --- 0. Development Branch Check ---
    checkBranchIndicator();

    // --- 1. Enhanced Professional Login ---
    setupProfessionalLogin();

    // --- 2. Splash screen fade‐out ---
    const splash = document.getElementById("splashScreen");
    if (!splash) return;

    // Minimum splash duration
    setTimeout(() => {
        splash.classList.add("fade-out");
        
        // Ensure complete removal
        setTimeout(() => {
            splash.classList.add("hidden");
        }, 700); // fade-out duration
    }, 1500); // overall time on screen

    // --- 3. Initialize core application ---
    await initializeAppCore();

    // --- 4. Register Service Worker for PWA ---
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

    // --- 5. Setup connection monitoring ---
    window.addEventListener('online', updateConnectionIcon);
    window.addEventListener('offline', () => {
        updateConnectionIcon();
        showOfflineBanner();
    });
    updateConnectionIcon();

    // --- 6. If offline at startup, show offline banner ---
    if (!navigator.onLine) {
        showOfflineBanner();
    }

    // --- 7. Setup Install / Dismiss button handlers ---
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

    console.log('🎉 Budget Tracker fully initialized!');
});

// --------------------------
// Optional: Fake logout function
// --------------------------
window.logout = () => {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('userEmail');
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
        loginScreen.classList.remove('hidden');
    }
    console.log('🚪 User logged out');
};

// --------------------------
// Service Worker Debugging
// --------------------------
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