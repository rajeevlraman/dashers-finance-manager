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
import { initLoansUI } from './loans.js';
import { initPropertiesUI } from './properties.js';
import { initTenantsUI } from './tenants.js';
import { initMaintenanceUI } from './maintenance.js';
import { initExpensesUI } from './expenses.js';
import { initTaxComplianceUI } from './tax_compliance.js';
import { initCostBaseTrackerUI } from './cost_base_tracker.js';

// ============================================================================
// 🎯 VIEW ROUTING
// ============================================================================

function setActiveNav(view) {
  // Navigation owns active UI, but this is kept
  // in case other modules rely on it later.
  document.querySelectorAll('[data-view]').forEach(link => {
    link.classList.toggle('active', link.dataset.view === view);
  });
}

// ============================================================================
// 📄 VIEW LOADING
// ============================================================================

export async function loadView(view) {
  console.log(`📄 Loading view: ${view}`);

  const main = document.getElementById('mainContent');
  if (!main) return;

  setActiveNav(view);

  main.style.opacity = '0.7';
  main.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading ${view.replace('-', ' ')}...</p>
    </div>
  `;

  try {
    await new Promise(resolve => setTimeout(resolve, 100));

    switch (view) {
      case 'dashboard':   await initDashboardUI(); break;
      case 'transactions':await initTransactionsUI(); break;
      case 'budgets':     await initBudgetsUI(); break;
      case 'accounts':    await initAccountsUI(); break;
      case 'categories':  await initCategoriesUI(); break;
      case 'reports':     await initReportsUI(); break;
      case 'calendar':    await initCalendarUI(); break;
      case 'bills':       await initBillsUI(); break;
      case 'recurring':   await initRecurringUI(); break;
      case 'settings':    await initSettingsUI(); break;
      case 'loans':       await initLoansUI(); break;
      case 'properties':  await initPropertiesUI(); break;
      case 'tenants':     await initTenantsUI(); break;
      case 'maintenance': await initMaintenanceUI(); break;
      case 'expenses':    await initExpensesUI(); break;
      case 'tax':         await initTaxComplianceUI(); break;
      case 'costbase':    await initCostBaseTrackerUI(); break;

      default:
        main.innerHTML = `
          <div class="page-container">
            <div class="page-header">
              <h2>Welcome to Budget Tracker</h2>
            </div>
            <div class="section-card">
              <p>Select a section from the menu to begin.</p>
            </div>
          </div>
        `;
    }

    main.style.opacity = '1';

  } catch (err) {
    console.error(`❌ Error loading view ${view}`, err);
    main.style.opacity = '1';
    main.innerHTML = `
      <div class="error-state">
        <h2>⚠️ Error Loading ${view}</h2>
        <p>${err.message || 'There was a problem loading this section.'}</p>
        <div class="error-actions">
          <button class="btn btn-primary" onclick="loadView('${view}')">Retry</button>
          <button class="btn btn-secondary" onclick="loadView('dashboard')">Home</button>
        </div>
      </div>
    `;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// 🚀 UI INITIALIZATION
// ============================================================================

export function initUI() {
  console.log('✅ initUI() running...');

  // Unified navigation handling (clicks handled in navigation.js)
  ['click', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, e => {
      const link = e.target.closest('[data-view]');
      if (!link) return;

      e.preventDefault();
      const view = link.dataset.view;
      if (!view) return;

      // Navigation.js will set the hash
      window.location.hash = view;
    }, { passive: false });
  });

  // Hash-based routing (single source of truth)
  window.addEventListener('hashchange', () => {
    const view = window.location.hash.slice(1) || 'dashboard';
    loadView(view);
  });

  // Initial view
  setTimeout(() => {
    const initialView = window.location.hash.slice(1) || 'dashboard';
    console.log(`🚀 Loading initial view: ${initialView}`);
    loadView(initialView);
  }, 100);
}

// Expose for navigation.js
window.loadView = loadView;
