// ============================================================================
// 📱 dashboard_mobile_v2_charts.js
// ----------------------------------------------------------------------------
// - Extends dashboard_mobile_v2.js with two charts and timeframe dropdown
// - Keeps clear layout and spacing
// ============================================================================

import { getAllItems, STORE_NAMES } from './db.js';

export async function initDashboardMobileV2UI() {
  console.log('📊 Mobile Dashboard (v2 + charts) initializing...');

  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <style>
      body {
        background: #f9fafb;
        font-family: 'Inter', sans-serif;
        color: #222;
        margin: 0;
      }
      .mobile-dashboard {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 18px;
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
      .filter-bar {
        display: flex;
        justify-content: flex-end;
        margin-top: -10px;
      }
      select.timeframe {
        border: 1px solid #ddd;
        border-radius: 6px;
        padding: 6px 8px;
        background: white;
      }
      .tile-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }
      .tile {
        border-radius: 50px;
        padding: 12px 14px;
        background: #ffffffcc;
        border: 1px solid #e5e7eb;
        color: #111;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .tile-label { flex: 1; text-align: left; font-size: 0.95rem; }
      .tile-amount { flex: 3; text-align: right; font-size: 1rem; font-weight: 600; }

      .chart-section {
        background: white;
        border-radius: 12px;
        padding: 12px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.08);
      }
      .chart-section h4 {
        margin: 0 0 8px;
        font-size: 1.05rem;
      }

      .recent-section {
        background: white;
        border-radius: 12px;
        padding: 12px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.08);
      }

      .recent-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #eee;
      }
      .recent-item:last-child { border-bottom: none; }

      .fab-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 100;
      }
      .fab-main {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: #2563eb;
        color: white;
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
      }
      .fab-actions button {
        background: white;
        border: none;
        border-radius: 50px;
        padding: 6px 12px;
        margin-bottom: 6px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        font-size: 0.85rem;
      }
      .fab-container.open .fab-actions { display: flex; }
    </style>

    <div class="mobile-dashboard">
      <div class="mobile-header">
        <h2>📊 My Finances</h2>
        <button id="refreshMobileV2" style="background:none;border:none;font-size:1.4rem;">🔄</button>
      </div>
      <div class="filter-bar">
        <select id="timeframeSelect" class="timeframe">
          <option value="month">This Month</option>
          <option value="6months">Last 6 Months</option>
          <option value="year">Last 12 Months</option>
        </select>
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
        <h4>🧾 Last 3 Bills Paid</h4>
        <div id="recentBills"></div>
      </div>
    </div>

    <div class="fab-container" id="fabMenu">
      <div class="fab-actions">
        <button>💸 Add Expense</button>
        <button>🏠 Add Property</button>
        <button>➕ Add Transaction</button>
        <button>🧾 Pay Bill</button>
        <button>🔧 Log Maintenance</button>
        <button>👤 Add Tenant</button>
      </div>
      <button class="fab-main">＋</button>
    </div>
  `;

  const timeframeSelect = document.getElementById('timeframeSelect');
  timeframeSelect.addEventListener('change', () => renderDashboardData(timeframeSelect.value));
  document.getElementById('refreshMobileV2').addEventListener('click', initDashboardMobileV2UI);

  renderDashboardData('month');
}

// ============================================================================
// 🔁 Load & Render Data
// ============================================================================
async function renderDashboardData(timeframe) {
  const [transactions, properties, maintenance, bills, categories] = await Promise.all([
    getAllItems(STORE_NAMES.transactions),
    getAllItems(STORE_NAMES.properties),
    getAllItems(STORE_NAMES.maintenance),
    getAllItems(STORE_NAMES.bills),
    getAllItems(STORE_NAMES.categories),
  ]);

  const now = new Date();
  const start = new Date(now);

  if (timeframe === '6months') start.setMonth(now.getMonth() - 6);
  else if (timeframe === 'year') start.setFullYear(now.getFullYear() - 1);
  else start.setMonth(now.getMonth() - 1);

  const filtered = transactions.filter(t => new Date(t.date) >= start && new Date(t.date) <= now);
  const income = filtered.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const expense = filtered.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const balance = income - expense;

  const rentYTD = transactions
    .filter(t => t.type === 'income' && /rent/i.test(t.description || ''))
    .reduce((a, t) => a + t.amount, 0);

  const maintenanceYTD = maintenance.reduce((a, m) => a + (parseFloat(m.cost) || 0), 0);

  const upcomingMaint = maintenance.filter(m => new Date(m.date) > new Date());
  const upcomingBills = bills.filter(b => new Date(b.dueDate) > new Date());
  const paidBills = bills.filter(b => b.status === 'paid').slice(-3);

  const tileContainer = document.getElementById('tileContainer');
  tileContainer.innerHTML = `
    ${makeRow('💰 Income', fmt(income))}
    ${makeRow('📉 Expenses', fmt(expense))}
    ${makeRow('💵 Balance', fmt(balance))}
    ${properties.length ? makeRow('🏡 Rent YTD', fmt(rentYTD)) : ''}
    ${properties.length ? makeRow('🔧 Maint. YTD', fmt(maintenanceYTD)) : ''}
    ${properties.length ? makeRow('📅 Upcoming Bills', upcomingBills.length) : ''}
    ${properties.length ? makeRow('🧰 Upcoming Maint.', upcomingMaint.length) : ''}
  `;

  // ===== Charts =====
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
  filtered.filter(t => t.type === 'expense').forEach(t => {
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
// 💰 Utility Helpers
// ============================================================================
function makeRow(label, value) {
  return `<div class='tile-row'><div class='tile tile-label'>${label}</div><div class='tile tile-amount'>${value}</div></div>`;
}
function fmt(amount, currency = 'AUD') {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount || 0);
}
