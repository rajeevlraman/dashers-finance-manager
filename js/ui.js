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
import { initPropertyDashboardUI } from './dashboardProperties.js';
import { initDashboardMobileUI } from './dashboard_mobile.js';
import { initDashboardMobileV2UI } from './dashboard_mobile_v2.js';
import { initTaxComplianceUI } from './tax_compliance.js';
import { initCostBaseTrackerUI } from './cost_base_tracker.js';
import { initDashboardMobileV3UI } from './dashboard_mobile_v3_ui.js';


//to navigation bar temporary comments
//function setActiveNav(view) {
//  document.querySelectorAll('nav ul li a').forEach(link => {
//    link.classList.toggle('active', link.getAttribute('data-view') === view);
//  });
//}

function setActiveNav(view) {
  document.querySelectorAll('.bottom-nav a').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-view') === view);
  });
}


export async function loadView(view) {
  console.log(`📄 Loading view: ${view}`);
  setActiveNav(view);

  const main = document.getElementById('mainContent');
  main.innerHTML = '<div class="loading-state"><p>⏳ Loading...</p></div>';

  try {
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
        await initLoansUI(); // Use static import like others
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
      case 'property-dashboard':
        await initPropertyDashboardUI();
        break;
      case 'mobile-dashboard':
        await initDashboardMobileUI();
        break;
      case 'mobiledash':
        await initDashboardMobileV2UI();
        break;
      case 'tax':
        await initTaxComplianceUI();
        break;
      case 'costbase':
        await initCostBaseTrackerUI();
        break;
      case 'mobiledashv3':
        await initDashboardMobileV3UI();
        break;


      default:
        main.innerHTML = '<h2>Welcome</h2><p>Select a tab to begin.</p>';
    }
  } catch (error) {
    console.error(`❌ Error loading view ${view}:`, error);
    main.innerHTML = `
      <div class="error-state">
        <h2>⚠️ Error Loading ${view}</h2>
        <p>There was a problem loading this section. Please try again.</p>
        <button class="btn-primary" onclick="loadView('${view}')">Retry</button>
      </div>
    `;
  }

  // Scroll to top on every view change (iPad-friendly)
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function initUI() {
  console.log('✅ initUI() running...');

  // iOS-safe event delegation
  ['click', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, e => {
      const link = e.target.closest('a[data-view]');
      if (link) {
        e.preventDefault();
        const view = link.dataset.view;
        console.log(`📱 Navigation tapped → ${view}`);
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
    loadView(view);
  });

  // Load initial view
  const initialView = window.location.hash.slice(1) || 'dashboard';
  loadView(initialView);
}

// Make loadView available globally for error retry
window.loadView = loadView;