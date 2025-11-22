// ============================================================================
// 📱 dashboard_mobile_v3_ui.js
// ----------------------------------------------------------------------------
// Fintech-style Mobile Dashboard (Monzo-inspired)
// - Responsive layout with bottom nav & floating FAB
// - Chart + Tiles + Quick Actions
// - Works seamlessly in PWAs / GitHub Pages
// ============================================================================

import { getAllItems, STORE_NAMES } from './db.js';

export async function initDashboardMobileV3UI() {
  console.log('📊 Initializing Mobile Dashboard v3 (Fintech Style)');

  const main = document.getElementById('mainContent');
  main.innerHTML = `
  <style>
    /* ===== BASE LAYOUT ===== */
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      margin: 0;
      padding-bottom: 90px; /* space for bottom nav */
    }

    .mobile-dashboard {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .mobile-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .mobile-header h2 {
      font-size: 1.35rem;
      font-weight: 700;
      color: #111827;
    }

    .refresh-btn {
      background: none;
      border: none;
      font-size: 1.4rem;
      cursor: pointer;
    }

    /* ===== TILE ROWS ===== */
    .tile-row {
      background: #fff;
      border-radius: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.9rem 1rem;
      box-shadow: 0 2px 6px rgba(0,0,0,0.05);
      transition: transform 0.15s ease, box-shadow 0.3s ease;
    }
    .tile-row:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.08); }

    .tile-label { font-size: 0.9rem; color: #64748b; }
    .tile-amount { font-size: 1.05rem; font-weight: 700; color: #0f172a; }

    /* ===== CHART SECTIONS ===== */
    .chart-section {
      background: #fff;
      border-radius: 14px;
      padding: 1rem;
      box-shadow: 0 2px 6px rgba(0,0,0,0.05);
    }

    .chart-section h4 {
      margin: 0 0 0.5rem;
      font-size: 1rem;
      color: #1e293b;
    }

    /* ===== RECENT LIST ===== */
    .recent-section {
      background: #fff;
      border-radius: 14px;
      padding: 1rem;
      box-shadow: 0 2px 6px rgba(0,0,0,0.05);
    }
    .recent-item {
      display: flex;
      justify-content: space-between;
      padding: 0.6rem 0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.95rem;
    }
    .recent-item:last-child { border-bottom: none; }

    /* ===== BOTTOM NAV ===== */
    .bottom-nav {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      height: 65px;
      background: #fff;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-around;
      align-items: center;
      box-shadow: 0 -2px 8px rgba(0,0,0,0.05);
      z-index: 50;
    }

    .bottom-nav a {
      flex: 1;
      text-align: center;
      color: #6b7280;
      font-size: 1.4rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      gap: 4px;
    }

    .bottom-nav a span {
      font-size: 0.7rem;
      font-weight: 600;
    }

    .bottom-nav a.active {
      color: #2563eb;
      font-weight: 700;
    }

    /* ===== FLOATING ACTION BUTTON ===== */
    .fab-container {
      position: fixed;
      bottom: 85px;
      right: 20px;
      z-index: 100;
      transition: transform 0.3s ease;
    }

    .fab-main {
      width: 58px; height: 58px;
      border-radius: 50%;
      background: #2563eb;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.8rem;
      border: none;
      box-shadow: 0 4px 10px rgba(0,0,0,0.25);
      cursor: pointer;
    }

    .fab-actions {
      display: none;
      flex-direction: column;
      align-items: flex-end;
      margin-bottom: 8px;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }

    .fab-actions button {
      background: white;
      border: none;
      border-radius: 50px;
      padding: 6px 12px;
      margin-bottom: 6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      font-size: 0.85rem;
      cursor: pointer;
    }

    .fab-container.open .fab-actions {
      display: flex;
      opacity: 1;
      transform: translateY(0);
    }

    @media (max-width: 600px) {
      .tile-row { font-size: 0.9em; }
      .chart-section h4 { font-size: 0.9rem; }
    }
  </style>

  <div class="mobile-dashboard">
    <div class="mobile-header">
      <h2>My Finances</h2>
      <button class="refresh-btn" id="refreshMobileV3">🔄</button>
    </div>

    <div id="tileContainer"></div>

    <div class="chart-section">
      <h4>Overview</h4>
      <canvas id="summaryChart" height="160"></canvas>
    </div>

    <div class="chart-section">
      <h4>Expenses by Category</h4>
      <canvas id="categoryChart" height="180"></canvas>
    </div>

    <div class="recent-section">
      <h4>Last 3 Bills Paid</h4>
      <div id="recentBills"></div>
    </div>
  </div>

  <div class="fab-container" id="fabMenu">
    <div class="fab-actions">
      <button>💸 Add Expense</button>
      <button>🏠 Add Property</button>
      <button>➕ Add Transaction</button>
      <button>🧾 Pay Bill</button>
    </div>
    <button class="fab-main">＋</button>
  </div>

  <nav class="bottom-nav">
    <a data-view="dashboard" class="active">🏠<span>Home</span></a>
    <a data-view="transactions">💸<span>Transact</span></a>
    <a data-view="reports">📊<span>Reports</span></a>
    <a data-view="settings">⚙️<span>Settings</span></a>
  </nav>
  `;

  document.getElementById('refreshMobileV3').addEventListener('click', initDashboardMobileV3UI);
  const fab = document.getElementById('fabMenu');
  fab.querySelector('.fab-main').addEventListener('click', () => fab.classList.toggle('open'));

  await renderDashboardData();
}

// ============================================================================
// 🔁 Data & Chart Rendering
// ============================================================================
async function renderDashboardData() {
  const [transactions, bills, categories] = await Promise.all([
    getAllItems(STORE_NAMES.transactions),
    getAllItems(STORE_NAMES.bills),
    getAllItems(STORE_NAMES.categories)
  ]);

  const income = transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const balance = income - expense;
  const paidBills = bills.filter(b => b.status === 'paid').slice(-3);

  const tileContainer = document.getElementById('tileContainer');
  tileContainer.innerHTML = `
    ${makeRow('💰 Income', fmt(income))}
    ${makeRow('📉 Expenses', fmt(expense))}
    ${makeRow('💵 Balance', fmt(balance))}
  `;

  const ctxSummary = document.getElementById('summaryChart').getContext('2d');
  const ctxCat = document.getElementById('categoryChart').getContext('2d');

  if (window.mobileSummaryChart) window.mobileSummaryChart.destroy();
  if (window.mobileCatChart) window.mobileCatChart.destroy();

  window.mobileSummaryChart = new Chart(ctxSummary, {
    type: 'bar',
    data: {
      labels: ['Income', 'Expenses', 'Balance'],
      datasets: [{
        data: [income, expense, balance],
        backgroundColor: ['#34d399', '#f87171', '#60a5fa'],
        borderRadius: 6,
      }],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
  });

  const expensesByCat = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const cat = categories.find(c => c.id === t.categoryId)?.name || 'Other';
    expensesByCat[cat] = (expensesByCat[cat] || 0) + t.amount;
  });

  window.mobileCatChart = new Chart(ctxCat, {
    type: 'pie',
    data: {
      labels: Object.keys(expensesByCat),
      datasets: [{ data: Object.values(expensesByCat), borderWidth: 1 }],
    },
    options: { plugins: { legend: { position: 'bottom' } } },
  });

  const recentBillsDiv = document.getElementById('recentBills');
  recentBillsDiv.innerHTML = paidBills.length
    ? paidBills.map(b => `<div class="recent-item"><span>${b.name || 'Bill'}</span><span>${fmt(b.amount)}</span></div>`).join('')
    : `<p style="opacity:0.6;">No bills paid yet</p>`;
}

// ============================================================================
// 💰 Utility
// ============================================================================
function makeRow(label, value) {
  return `<div class='tile-row'><div class='tile-label'>${label}</div><div class='tile-amount'>${value}</div></div>`;
}
function fmt(amount, currency = 'AUD') {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount || 0);
}
