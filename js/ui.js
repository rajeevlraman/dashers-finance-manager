// ui.js
import { initBudgetsUI } from './budgets.js';
import { initTransactionsUI } from './transactions.js';
import { initAccountsUI } from './accounts.js';
import { initCategoriesUI } from './categories.js';
import { initReportsUI } from './reports.js';
import { initDashboardUI } from './dashboard.js';
import { initSettingsUI } from './settings.js';
import { initBillsUI } from './bills.js';
import { initCalendarUI } from './calendar.js';
import { initRecurringUI } from './recurring.js';
import { initLoansUI } from './loans.js'; // Add static import like others
import { initPropertiesUI } from './properties.js';
import { initTenantsUI } from './tenants.js';
import { initMaintenanceUI } from './maintenance.js';
import { initExpensesUI } from './expenses.js';
//import { initPropertyDashboardUI } from './dashboardProperties.js';
//import { initDashboardMobileUI } from './dashboard_mobile.js';
//import { initDashboardMobileV2UI } from './dashboard_mobile_v2.js';
import { initTaxComplianceUI } from './tax_compliance.js';
import { initCostBaseTrackerUI } from './cost_base_tracker.js';
//import { initDashboardMobileV3UI } from './dashboard_mobile_v3_ui.js';
import { initNavigation, showAppContainer, updateActiveNav } from './navigation.js';
// ============================================================================
// 📱 BOTTOM NAVIGATION ENHANCEMENTS
// ============================================================================

function initBottomNavigation() {
  const bottomNav = document.querySelector('.bottom-nav');
  const mainContent = document.getElementById('mainContent');
  
  if (!bottomNav) {
    console.log('❌ Bottom navigation not found');
    return;
  }
  
  console.log('✅ Initializing bottom navigation');
  
  // Update active state based on current view
  function updateActiveNav() {
    const currentView = window.location.hash.replace('#', '') || 'dashboard';
    const navLinks = bottomNav.querySelectorAll('a');
    
    navLinks.forEach(link => {
      const view = link.getAttribute('data-view');
      if (view === currentView) {
        link.classList.add('active');
        // Add loading animation
        link.classList.add('nav-loading');
        setTimeout(() => {
          link.classList.remove('nav-loading');
        }, 600);
      } else {
        link.classList.remove('active');
        link.classList.remove('nav-loading');
      }
    });
    
    // Also update sidebar nav if it exists
    const sidebarLinks = document.querySelectorAll('nav:not(.bottom-nav) a[data-view]');
    sidebarLinks.forEach(link => {
      const view = link.getAttribute('data-view');
      link.classList.toggle('active', view === currentView);
    });
  }
  
  // Add enhanced click handlers
  bottomNav.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    
    e.preventDefault();
    const view = link.getAttribute('data-view');
    
    if (!view) return;
    
    // Add immediate visual feedback
    link.classList.add('nav-tap');
    
    // Update URL and load view
    window.location.hash = view;
    
    // Remove tap effect after animation
    setTimeout(() => {
      link.classList.remove('nav-tap');
    }, 300);
  });
  
  // Add glass effect on scroll for modern look
  let lastScrollTop = 0;
  const scrollHandler = () => {
    if (window.innerWidth > 768) return; // Only on mobile
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > lastScrollTop && scrollTop > 50) {
      // Scrolling down - add glass effect
      bottomNav.classList.add('glass');
    } else {
      // Scrolling up - remove glass effect
      bottomNav.classList.remove('glass');
    }
    
    lastScrollTop = scrollTop;
  };
  
  // Use passive scroll listener for performance
  window.addEventListener('scroll', scrollHandler, { passive: true });
  
  // Update active state on hash change
  window.addEventListener('hashchange', updateActiveNav);
  
  // Handle responsive behavior
  function handleResponsiveNav() {
    if (window.innerWidth <= 768) {
      // Mobile - show bottom nav, hide sidebar
      bottomNav.style.display = 'flex';
      const sidebar = document.querySelector('nav:not(.bottom-nav)');
      if (sidebar) sidebar.style.display = 'none';
      
      // Ensure main content has bottom padding
      mainContent.style.paddingBottom = '80px';
    } else {
      // Desktop - hide bottom nav, show sidebar
      bottomNav.style.display = 'none';
      const sidebar = document.querySelector('nav:not(.bottom-nav)');
      if (sidebar) sidebar.style.display = 'block';
      
      // Remove bottom padding
      mainContent.style.paddingBottom = '0';
    }
  }
  
  // Initial setup
  handleResponsiveNav();
  updateActiveNav();
  
  // Handle window resize
  window.addEventListener('resize', handleResponsiveNav);
  
  console.log('✅ Bottom navigation fully initialized');
}

// ============================================================================
// 🎯 NAVIGATION FUNCTIONS
// ============================================================================

function setActiveNav(view) {
  // Update bottom navigation
  document.querySelectorAll('.bottom-nav a').forEach(link => {
    const linkView = link.getAttribute('data-view');
    const isActive = linkView === view;
    link.classList.toggle('active', isActive);
    
    // Add pulse effect for active item
    if (isActive) {
      link.classList.add('nav-pulse');
      setTimeout(() => {
        link.classList.remove('nav-pulse');
      }, 1000);
    }
  });
  
  // Update sidebar navigation (if exists)
  document.querySelectorAll('nav:not(.bottom-nav) a[data-view]').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-view') === view);
  });
}

// ============================================================================
// 📄 VIEW LOADING
// ============================================================================

export async function loadView(view) {
  console.log(`📄 Loading view: ${view}`);
  
  // Update navigation immediately for better UX
  setActiveNav(view);

  const main = document.getElementById('mainContent');
  
  // Show loading state with smooth transition
  main.style.opacity = '0.7';
  main.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading ${view.replace('-', ' ')}...</p>
    </div>
  `;

  try {
    // Add small delay for smooth transition
    await new Promise(resolve => setTimeout(resolve, 100));
    
    switch (view) {
      case 'dashboard': 
        await initDashboardUI(); 
        break;
      case 'transactions': 
        await initTransactionsUI(); 
        break;
      case 'budgets': 
        await initBudgetsUI(); 
        break;
      case 'accounts': 
        await initAccountsUI(); 
        break;
      case 'categories': 
        await initCategoriesUI(); 
        break;
      case 'reports': 
        await initReportsUI(); 
        break;
      case 'calendar': 
        await initCalendarUI(); 
        break;
      case 'bills': 
        await initBillsUI(); 
        break;
      case 'recurring': 
        await initRecurringUI(); 
        break;
      case 'settings': 
        await initSettingsUI(); 
        break;
      case 'loans': 
        await initLoansUI();
        break;
      case 'properties': 
        await initPropertiesUI(); 
        break;
      case 'tenants':
        await initTenantsUI();
        break;
      case 'maintenance':
        await initMaintenanceUI();
        break;
      case 'expenses':
        await initExpensesUI();
        break;
      case 'tax':
        await initTaxComplianceUI();
        break;
      case 'costbase':
        await initCostBaseTrackerUI();
        break;

      default:
        main.innerHTML = `
          <div class="page-container">
            <div class="page-header">
              <h2>Welcome to Budget Tracker</h2>
            </div>
            <div class="section-card">
              <p>Select a tab to begin managing your finances.</p>
            </div>
          </div>
        `;
    }
    
    // Restore opacity
    main.style.opacity = '1';
    
  } catch (error) {
    console.error(`❌ Error loading view ${view}:`, error);
    main.style.opacity = '1';
    main.innerHTML = `
      <div class="error-state">
        <h2>⚠️ Error Loading ${view}</h2>
        <p>${error.message || 'There was a problem loading this section.'}</p>
        <div class="error-actions">
          <button class="btn btn-primary" onclick="loadView('${view}')">🔄 Retry</button>
          <button class="btn btn-secondary" onclick="loadView('dashboard')">🏠 Go Home</button>
        </div>
      </div>
    `;
  }

  // Scroll to top on every view change (iPad-friendly)
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// 🚀 INITIALIZATION
// ============================================================================

export function initUI() {
  console.log('✅ initUI() running...');

  // Initialize bottom navigation first
  initBottomNavigation();
  checkAuthState();
  initNavigation();
  // Enhanced event delegation for both sidebar and bottom nav
  ['click', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, e => {
      const link = e.target.closest('a[data-view]');
      if (link) {
        e.preventDefault();
        const view = link.dataset.view;
        console.log(`📱 Navigation tapped → ${view}`);
        
        // Add visual feedback
        link.classList.add('nav-tap-feedback');
        setTimeout(() => {
          link.classList.remove('nav-tap-feedback');
        }, 300);
        
        if (view) {
          window.location.hash = view;
          loadView(view);
        }
      }
    }, { passive: false });
  });

  // Handle manual hash change (e.g. back button)
  window.addEventListener('hashchange', () => {
    const view = window.location.hash.slice(1) || 'dashboard';
    console.log(`🔗 Hash changed to: ${view}`);
    loadView(view);
  });

  // Load initial view with a small delay for better UX
  setTimeout(() => {
    const initialView = window.location.hash.slice(1) || 'dashboard';
    console.log(`🚀 Loading initial view: ${initialView}`);
    loadView(initialView);
  }, 100);
}

// Make loadView available globally for error retry
window.loadView = loadView;

// Export for other modules
export { initBottomNavigation };