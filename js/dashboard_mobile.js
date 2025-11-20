// ============================================================================
// 📱 dashboard_mobile.js — Compact Mobile Dashboard (Auto-switching version)
// ----------------------------------------------------------------------------
// - Detects small screens or mobile user agents
// - Inline mobile styling for testing
// - Fetches real income / expense / balance data from IndexedDB
// - Floating Action Button (FAB) for quick actions
// ============================================================================

import { getAllItems, STORE_NAMES } from './db.js';
import { initDashboardUI } from './dashboard.js';

// ============================================================================
// 🚀 Entry point
// ============================================================================
export async function initDashboardMobileUI() {
  console.log("📲 Mobile Dashboard initializing...");

  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <style>
      body {
        background: #f9fafb;
        font-family: 'Inter', sans-serif;
        color: #222;
        margin: 0;
        padding: 0;
      }
      .mobile-dashboard {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .mobile-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .mobile-header h2 {
        font-size: 1.4rem;
        margin: 0;
      }
      .summary-row {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 4px;
      }
      .summary-card {
        flex: 0 0 70%;
        min-width: 200px;
        padding: 16px;
        border-radius: 14px;
        color: white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        scroll-snap-align: start;
      }
      .card-income { background: linear-gradient(135deg, #34d399, #059669); }
      .card-expense { background: linear-gradient(135deg, #f87171, #dc2626); }
      .card-balance { background: linear-gradient(135deg, #60a5fa, #2563eb); }
      .summary-card h3 {
        margin: 0;
        font-size: 1rem;
        opacity: 0.9;
      }
      .summary-card p {
        font-size: 1.5rem;
        margin: 6px 0 0;
        font-weight: bold;
      }
      .recent-list {
        background: white;
        border-radius: 12px;
        padding: 12px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.05);
      }
      .recent-list h4 {
        margin: 0 0 8px;
        font-size: 1rem;
      }
      .recent-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #eee;
      }
      .recent-item:last-child { border-bottom: none; }
      .recent-item .desc { font-size: 0.95rem; }
      .recent-item .amt {
        font-weight: bold;
        color: #111;
      }
      .fab-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 100;
      }
      .fab-main {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #3b82f6;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.8rem;
        border: none;
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        cursor: pointer;
      }
      .fab-actions {
        display: none;
        flex-direction: column;
        align-items: flex-end;
        margin-bottom: 10px;
      }
      .fab-actions button {
        background: white;
        border: none;
        border-radius: 50px;
        padding: 6px 12px;
        margin-bottom: 6px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        font-size: 0.9rem;
      }
      .fab-container.open .fab-actions {
        display: flex;
      }
    </style>

    <div class="mobile-dashboard">
      <div class="mobile-header">
        <h2>📊 My Finances</h2>
        <button id="refreshMobileDashboard" style="background:none;border:none;font-size:1.4rem;">🔄</button>
      </div>
      <div id="summaryRow" class="summary-row"></div>
      <div class="recent-list">
        <h4>Recent Transactions</h4>
        <div id="recentTransactions"></div>
      </div>
    </div>

    <div class="fab-container" id="fabMenu">
      <div class="fab-actions">
        <button id="fabAddExpense">💸 Add Expense</button>
        <button id="fabAddProperty">🏠 Add Property</button>
        <button id="fabAddTransaction">➕ Add Transaction</button>
      </div>
      <button class="fab-main">＋</button>
    </div>
  `;

  // Fetch Data
  const [transactions] = await Promise.all([getAllItems(STORE_NAMES.transactions)]);
  const income = transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const balance = income - expense;

  // Render summary
  const summary = document.getElementById('summaryRow');
  summary.innerHTML = `
    <div class="summary-card card-income"><h3>Income</h3><p>${formatCurrency(income)}</p></div>
    <div class="summary-card card-expense"><h3>Expenses</h3><p>${formatCurrency(expense)}</p></div>
    <div class="summary-card card-balance"><h3>Balance</h3><p>${formatCurrency(balance)}</p></div>
  `;

  // Recent transactions
  const recent = transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  const list = document.getElementById('recentTransactions');
  list.innerHTML = recent.length
    ? recent.map(t => `
        <div class="recent-item">
          <span class="desc">${t.description || t.type}</span>
          <span class="amt" style="color:${t.type === 'income' ? '#16a34a' : '#dc2626'};">
            ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
          </span>
        </div>
      `).join('')
    : `<p style="opacity:0.6;text-align:center;">No transactions yet</p>`;

  // Floating Action Button
  const fabMenu = document.getElementById('fabMenu');
  const mainFab = fabMenu.querySelector('.fab-main');
  mainFab.addEventListener('click', () => fabMenu.classList.toggle('open'));
  document.getElementById('refreshMobileDashboard').addEventListener('click', initDashboardMobileUI);

  // Placeholder buttons
  document.getElementById('fabAddExpense').addEventListener('click', () => alert('💸 Add Expense pressed'));
  document.getElementById('fabAddProperty').addEventListener('click', () => alert('🏠 Add Property pressed'));
  document.getElementById('fabAddTransaction').addEventListener('click', () => alert('➕ Add Transaction pressed'));
}

// ============================================================================
// 📱 Auto-detect mobile / fallback
// ============================================================================
export function initAutoDashboard() {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
  if (isMobile) initDashboardMobileUI();
  else initDashboardUI();
  console.log(`📲 Dashboard mode: ${isMobile ? 'Mobile' : 'Desktop'}`);
}

// ============================================================================
// 💰 Utility
// ============================================================================
function formatCurrency(amount, currency = 'AUD') {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount || 0);
}
