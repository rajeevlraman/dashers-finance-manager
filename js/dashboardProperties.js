// ============================================================================
// 🏠 dashboardProperties.js — Property Dashboard (with ROI Tracker)
// ----------------------------------------------------------------------------
// Unified Dashboard combining Tenants, Loans, Transactions, and ROI Trends
// ============================================================================

import { getAllItems, STORE_NAMES } from './db.js';
import { html } from './utils/html.js';

// ============================================================================
// 🎯 Initialize Property Dashboard
// ============================================================================
export async function initPropertyDashboardUI() {
  console.log("📊 Prop Dashboard initialized");

  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="dashboard-header">
      <h2>🏠 Prop Dashboard</h2>
      <div class="dashboard-filters">
        <select id="dashboardPropertyFilter" class="form-select"></select>
        <select id="dashboardCategoryFilter" class="form-select">
          <option value="">All Categories</option>
          <option value="rent">Rent</option>
          <option value="maintenance">Maintenance</option>
          <option value="loans">Loans</option>
          <option value="utilities">Utilities</option>
          <option value="insurance">Insurance</option>
        </select>
      </div>
    </div>

    <div id="dashboardSummary" class="summary-row"></div>

    <div class="progress-section">
      <h3>🏦 Rent Collection Progress</h3>
      <div class="progress-bar">
        <div id="rentProgressFill" class="progress-fill"></div>
      </div>
      <p id="rentProgressLabel">0% Collected</p>
    </div>

    <div class="chart-section">
      <canvas id="expensePieChart"></canvas>
    </div>

    <div class="chart-section">
      <h3>💹 Monthly Rent vs Expenses</h3>
      <canvas id="rentVsExpenseChart"></canvas>
    </div>

    <div id="propertyRoiTracker" class="roi-tracker"></div>

    <div id="dashboardRecent" class="dashboard-recent"></div>
  `;

  await populateDashboardFilters();
  await refreshDashboard();
}

// ============================================================================
// 🧩 Populate Dropdown Filters
// ============================================================================
async function populateDashboardFilters() {
  const properties = await getAllItems(STORE_NAMES.properties);
  const select = document.getElementById('dashboardPropertyFilter');

  select.innerHTML =
    `<option value="">All Properties</option>` +
    properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

  select.addEventListener('change', refreshDashboard);
  document.getElementById('dashboardCategoryFilter').addEventListener('change', refreshDashboard);
}

// ============================================================================
// 🔁 Refresh Dashboard
// ============================================================================
async function refreshDashboard() {
  const propertyId = document.getElementById('dashboardPropertyFilter').value;
  const category = document.getElementById('dashboardCategoryFilter').value;

  const [properties, tenants, transactions, loans] = await Promise.all([
    getAllItems(STORE_NAMES.properties),
    getAllItems(STORE_NAMES.tenants),
    getAllItems(STORE_NAMES.transactions),
    getAllItems(STORE_NAMES.loans)
  ]);

  const filteredTenants = propertyId ? tenants.filter(t => t.propertyId === propertyId) : tenants;
  const filteredTransactions = propertyId ? transactions.filter(t => t.propertyId === propertyId) : transactions;
  const filteredLoans = propertyId ? loans.filter(l => l.propertyId === propertyId) : loans;

  const totalRent = filteredTenants.reduce((sum, t) => sum + (parseFloat(t.rent) || 0), 0);
  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const totalLoanBalance = filteredLoans.reduce((sum, l) => sum + (parseFloat(l.currentBalance) || 0), 0);

  renderDashboardSummary(totalRent, totalExpenses, totalLoanBalance);
  renderRentProgress(filteredTenants);
  renderExpenseChart(filteredTransactions, category);
  renderRentVsExpenseChart(filteredTenants, filteredTransactions);
  renderROITracker(properties, tenants);
  renderRecentTransactions(filteredTransactions, properties);
}

// ============================================================================
// 🧾 Summary Cards
// ============================================================================
function renderDashboardSummary(totalRent, totalExpenses, totalLoanBalance) {
  const summary = document.getElementById('dashboardSummary');
  summary.innerHTML = `
    <div class="summary-card rent">
      <div class="summary-icon">💸</div>
      <div class="summary-info">
        <h4>Total Rent</h4>
        <p>${formatCurrency(totalRent)}</p>
      </div>
    </div>

    <div class="summary-card maintenance">
      <div class="summary-icon">💰</div>
      <div class="summary-info">
        <h4>Total Expenses</h4>
        <p>${formatCurrency(totalExpenses)}</p>
      </div>
    </div>

    <div class="summary-card loans">
      <div class="summary-icon">🏦</div>
      <div class="summary-info">
        <h4>Loan Balance</h4>
        <p>${formatCurrency(totalLoanBalance)}</p>
      </div>
    </div>
  `;
}

// ============================================================================
// 📊 Rent Collection Progress
// ============================================================================
function renderRentProgress(tenants) {
  const expected = tenants.reduce((sum, t) => sum + (parseFloat(t.rent) || 0), 0);
  const collected = tenants.reduce((sum, t) => sum + (parseFloat(t.rentPaid || 0)), 0);
  const percent = expected ? Math.min((collected / expected) * 100, 100).toFixed(1) : 0;

  const fill = document.getElementById('rentProgressFill');
  const label = document.getElementById('rentProgressLabel');

  fill.style.width = `${percent}%`;
  label.textContent = `${percent}% Collected`;
}

// ============================================================================
// 🥧 Expense Pie Chart
// ============================================================================
function renderExpenseChart(transactions) {
  const ctx = document.getElementById('expensePieChart').getContext('2d');
  const grouped = {};

  transactions
    .filter(t => t.type === 'expense')
    .forEach(tx => {
      const cat = tx.categoryId || 'General';
      grouped[cat] = (grouped[cat] || 0) + (parseFloat(tx.amount) || 0);
    });

  const labels = Object.keys(grouped);
  const data = Object.values(grouped);

  if (window.expenseChartInstance) window.expenseChartInstance.destroy();
  window.expenseChartInstance = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets: [{ data, borderWidth: 1 }] },
    options: { plugins: { legend: { position: 'bottom' } } }
  });
}

// ============================================================================
// 💹 Rent vs Expense Chart
// ============================================================================
function renderRentVsExpenseChart(tenants, transactions) {
  const ctx = document.getElementById('rentVsExpenseChart').getContext('2d');
  const monthlyData = {};

  tenants.forEach(t => {
    const rent = parseFloat(t.rent) || 0;
    for (let m = 0; m < 12; m++) {
      const month = new Date(new Date().getFullYear(), m).toLocaleString('en-AU', { month: 'short' });
      monthlyData[month] = monthlyData[month] || { rent: 0, expenses: 0 };
      monthlyData[month].rent += rent;
    }
  });

  transactions
    .filter(t => t.type === 'expense' && t.date)
    .forEach(tx => {
      const month = new Date(tx.date).toLocaleString('en-AU', { month: 'short' });
      monthlyData[month] = monthlyData[month] || { rent: 0, expenses: 0 };
      monthlyData[month].expenses += parseFloat(tx.amount) || 0;
    });

  const months = Object.keys(monthlyData);
  const rentValues = months.map(m => monthlyData[m].rent);
  const expenseValues = months.map(m => monthlyData[m].expenses);

  if (window.rentVsExpenseChartInstance) window.rentVsExpenseChartInstance.destroy();
  window.rentVsExpenseChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        { label: 'Rent', data: rentValues, borderColor: 'green', tension: 0.3 },
        { label: 'Expenses', data: expenseValues, borderColor: 'red', tension: 0.3 }
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
}

// ============================================================================
// 📈 ROI Tracker (NEW)
// ============================================================================
function renderROITracker(properties, tenants) {
  const container = document.getElementById('propertyRoiTracker');
  if (!properties.length) {
    container.innerHTML = `<div class="empty-state"><p>No properties available.</p></div>`;
    return;
  }

  container.innerHTML = `
    <h3>📈 Property ROI Tracker</h3>
    <div class="roi-grid">
      ${properties.map(p => `
        <div class="roi-card">
          <h4>${p.name}</h4>
          <p>ROI: ${calcROI(p, tenants)}%</p>
          <p>Value Δ: ${calcValueChange(p)}%</p>
          <canvas id="roiChart-${p.id}" height="60"></canvas>
        </div>
      `).join('')}
    </div>
  `;

  // Create mini trendlines
  properties.forEach(p => {
    const ctx = document.getElementById(`roiChart-${p.id}`);
    if (!ctx) return;

    const trend = Array.from({ length: 6 }, (_, i) =>
      (Math.random() * 10 + calcROI(p, tenants) - 5).toFixed(1)
    ); // Mock trendline for simplicity

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'],
        datasets: [{
          data: trend,
          borderColor: 'blue',
          borderWidth: 1,
          tension: 0.3,
          pointRadius: 0
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } }
      }
    });
  });
}

// ============================================================================
// ROI Helper Calculations
// ============================================================================
function calcROI(p, tenants) {
  const t = tenants.find(t => t.propertyId === p.id);
  if (!p.purchasePrice || !t?.rent) return 0;
  return ((t.rent * 12) / p.purchasePrice * 100).toFixed(1);
}

function calcValueChange(p) {
  if (!p.purchasePrice || !p.currentValue) return 0;
  return ((p.currentValue - p.purchasePrice) / p.purchasePrice * 100).toFixed(1);
}

// ============================================================================
// 🧾 Recent Transactions
// ============================================================================
function renderRecentTransactions(transactions, properties) {
  const container = document.getElementById('dashboardRecent');
  const sorted = transactions
    .filter(t => t.type === 'expense')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (!sorted.length) {
    container.innerHTML = `<div class="empty-state"><p>No recent expenses.</p></div>`;
    return;
  }

  container.innerHTML = `
    <h3>🧾 Recent Expenses</h3>
    <div class="recent-list">
      ${sorted.map(t => {
        const property = properties.find(p => p.id === t.propertyId);
        return html`
          <div class="recent-item">
            <strong>${t.description || 'Expense'}</strong> - ${formatCurrency(t.amount)}
            <br><small>${property ? property.name : 'General'} — ${new Date(t.date).toLocaleDateString()}</small>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ============================================================================
// 💰 Utility
// ============================================================================
function formatCurrency(amount, currency = 'AUD') {
  if (isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);
}
