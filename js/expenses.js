// ============================================================================
// 💸 expenses.js — Enhanced Unified Expense Manager
// ============================================================================

import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES } from './db.js';
import { generateId } from './db.js';

// Enhanced expense categories with ATO classifications
const EXPENSE_CATEGORIES = {
  'Maintenance': { type: 'immediate', deductible: true, color: '#3B82F6' },
  'Repairs': { type: 'immediate', deductible: true, color: '#EF4444' },
  'Utilities': { type: 'ongoing', deductible: true, color: '#10B981' },
  'Insurance': { type: 'ongoing', deductible: true, color: '#F59E0B' },
  'Council Rates': { type: 'ongoing', deductible: true, color: '#8B5CF6' },
  'Property Management': { type: 'ongoing', deductible: true, color: '#EC4899' },
  'Loan Interest': { type: 'ongoing', deductible: true, color: '#06B6D4' },
  'Body Corporate': { type: 'ongoing', deductible: true, color: '#84CC16' },
  'Capital Improvements': { type: 'capital', deductible: false, color: '#F97316' },
  'Travel': { type: 'immediate', deductible: true, color: '#6366F1' },
  'Legal Fees': { type: 'immediate', deductible: true, color: '#8B5CF6' },
  'Other': { type: 'other', deductible: true, color: '#6B7280' }
};

// ============================================================================
// 🏗️ Initialize Enhanced Expenses UI
// ============================================================================
export async function initExpensesUI() {
  console.log('💸 Enhanced Expense Manager initialized');
  const main = document.getElementById('mainContent');

  main.innerHTML = `
    <div class="page-header">
      <div class="header-content">
        <h1>💸 Expense Management</h1>
        <p>Track, analyze, and optimize your property expenses</p>
      </div>
      <div class="header-actions">
        <button id="btnQuickExpense" class="btn btn-outline">⚡ Quick Add</button>
        <button id="btnNewExpense" class="btn btn-primary">➕ Add Expense</button>
        <button id="btnExportExpenses" class="btn btn-secondary">📤 Export</button>
      </div>
    </div>

    <!-- Enhanced Filters -->
    <div class="filters-card">
      <div class="filter-group">
        <label>Property</label>
        <select id="filterProperty" class="form-select">
          <option value="">All Properties</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Category</label>
        <select id="filterCategory" class="form-select">
          <option value="">All Categories</option>
          ${Object.keys(EXPENSE_CATEGORIES).map(cat => 
            `<option value="${cat}">${cat}</option>`
          ).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label>Date Range</label>
        <select id="filterPeriod" class="form-select">
          <option value="all">All Time</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Financial Year</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>
      <div class="filter-group" id="customDateRange" style="display: none;">
        <label>From</label>
        <input type="date" id="filterDateFrom" class="form-input">
        <label>To</label>
        <input type="date" id="filterDateTo" class="form-input">
      </div>
      <div class="filter-group">
        <label>Status</label>
        <select id="filterStatus" class="form-select">
          <option value="">All Status</option>
          <option value="Paid">Paid</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Reimbursed">Reimbursed</option>
        </select>
      </div>
      <button id="btnApplyFilters" class="btn btn-primary">Apply Filters</button>
      <button id="btnResetFilters" class="btn btn-outline">Reset</button>
    </div>

    <!-- Enhanced Summary Dashboard -->
    <div class="dashboard-grid" id="expensesDashboard">
      <div class="summary-card highlight">
        <div class="summary-icon">💰</div>
        <div class="summary-content">
          <div class="summary-value" id="totalExpenses">$0</div>
          <div class="summary-label">Total Expenses</div>
          <div class="summary-trend" id="expenseTrend">Loading...</div>
        </div>
      </div>
      
      <div class="summary-card">
        <div class="summary-icon">📊</div>
        <div class="summary-content">
          <div class="summary-value" id="avgMonthly">$0</div>
          <div class="summary-label">Avg Monthly</div>
        </div>
      </div>
      
      <div class="summary-card warning">
        <div class="summary-icon">⏰</div>
        <div class="summary-content">
          <div class="summary-value" id="unpaidCount">0</div>
          <div class="summary-label">Unpaid Bills</div>
        </div>
      </div>
      
      <div class="summary-card success">
        <div class="summary-icon">🎯</div>
        <div class="summary-content">
          <div class="summary-value" id="taxDeductions">$0</div>
          <div class="summary-label">Tax Deductible</div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="charts-container">
      <div class="chart-card">
        <div class="chart-header">
          <h3>📊 Expenses by Category</h3>
          <select id="chartType" class="form-select">
            <option value="pie">Pie Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="line">Trend Line</option>
          </select>
        </div>
        <canvas id="expenseChart" height="300"></canvas>
      </div>
      
      <div class="chart-card">
        <div class="chart-header">
          <h3>📅 Monthly Trend</h3>
          <button id="btnToggleTrend" class="btn btn-outline">📈 Show Details</button>
        </div>
        <canvas id="trendChart" height="300"></canvas>
      </div>
    </div>

    <!-- Enhanced Expenses List -->
    <div class="section-card">
      <div class="section-header">
        <h3>🧾 Expense Records</h3>
        <div class="section-actions">
          <span class="record-count" id="expenseCount">0 expenses</span>
          <button id="btnBulkActions" class="btn btn-outline">🔄 Bulk Actions</button>
        </div>
      </div>
      <div id="expensesList" class="expenses-list">
        <div class="loading-state">Loading expenses...</div>
      </div>
    </div>

    <!-- Recurring Expenses Section -->
    <div class="section-card">
      <div class="section-header">
        <h3>🔄 Recurring Expenses</h3>
        <button id="btnAddRecurring" class="btn btn-outline">➕ Add Recurring</button>
      </div>
      <div id="recurringExpenses" class="recurring-list">
        <!-- Recurring expenses will be populated here -->
      </div>
    </div>
  `;

  setupEventListeners();
  await populateFilters();
  await refreshExpensesDashboard();
}

// ============================================================================
// 🎛️ Setup Event Listeners
// ============================================================================
function setupEventListeners() {
  document.getElementById('btnNewExpense').addEventListener('click', () => openExpenseForm());
  document.getElementById('btnQuickExpense').addEventListener('click', () => openQuickExpenseForm());
  document.getElementById('btnExportExpenses').addEventListener('click', exportExpenses);
  document.getElementById('btnApplyFilters').addEventListener('click', refreshExpensesDashboard);
  document.getElementById('btnResetFilters').addEventListener('click', resetFilters);
  document.getElementById('btnAddRecurring').addEventListener('click', () => openRecurringExpenseForm());
  document.getElementById('btnBulkActions').addEventListener('click', showBulkActions);
  
  document.getElementById('filterPeriod').addEventListener('change', function() {
    document.getElementById('customDateRange').style.display = 
      this.value === 'custom' ? 'grid' : 'none';
  });
  
  document.getElementById('chartType').addEventListener('change', refreshExpensesDashboard);
  document.getElementById('btnToggleTrend').addEventListener('click', toggleTrendDetails);
}

// ============================================================================
// 🧩 Enhanced Filter Population
// ============================================================================
async function populateFilters() {
  const properties = await getAllItems(STORE_NAMES.properties);
  const propertySelect = document.getElementById('filterProperty');
  propertySelect.innerHTML =
    `<option value="">All Properties</option>` +
    properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

  // Set default period to current financial year
  const now = new Date();
  const currentFY = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  document.getElementById('filterPeriod').value = 'year';
}

// ============================================================================
// 🔁 Enhanced Dashboard Refresh
// ============================================================================
async function refreshExpensesDashboard() {
  const [expenses, properties, budgets] = await Promise.all([
    getAllItems(STORE_NAMES.expenses || 'expenses').catch(() => []),
    getAllItems(STORE_NAMES.properties).catch(() => []),
    getAllItems(STORE_NAMES.budgets).catch(() => [])
  ]);

  const filteredExpenses = applyFilters(expenses);
  renderEnhancedSummary(filteredExpenses, expenses, budgets);
  renderEnhancedCharts(filteredExpenses, properties);
  renderEnhancedExpenseList(filteredExpenses, properties);
  renderRecurringExpenses(expenses, properties);
}

// ============================================================================
= 🔍 Apply Enhanced Filters
// ============================================================================
function applyFilters(expenses) {
  const filterProperty = document.getElementById('filterProperty').value;
  const filterCategory = document.getElementById('filterCategory').value;
  const filterPeriod = document.getElementById('filterPeriod').value;
  const filterStatus = document.getElementById('filterStatus').value;
  
  let filtered = [...expenses];
  
  if (filterProperty) filtered = filtered.filter(e => e.propertyId === filterProperty);
  if (filterCategory) filtered = filtered.filter(e => e.category === filterCategory);
  if (filterStatus) filtered = filtered.filter(e => e.status === filterStatus);
  
  // Date filtering
  const now = new Date();
  switch(filterPeriod) {
    case 'month':
      filtered = filtered.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate.getMonth() === now.getMonth() && 
               expenseDate.getFullYear() === now.getFullYear();
      });
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      filtered = filtered.filter(e => {
        const expenseDate = new Date(e.date);
        return Math.floor(expenseDate.getMonth() / 3) === quarter && 
               expenseDate.getFullYear() === now.getFullYear();
      });
      break;
    case 'year':
      const fyStart = new Date(now.getFullYear() - (now.getMonth() < 6 ? 1 : 0), 6, 1);
      const fyEnd = new Date(fyStart.getFullYear() + 1, 5, 30);
      filtered = filtered.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= fyStart && expenseDate <= fyEnd;
      });
      break;
    case 'custom':
      const from = document.getElementById('filterDateFrom').value;
      const to = document.getElementById('filterDateTo').value;
      if (from) filtered = filtered.filter(e => e.date >= from);
      if (to) filtered = filtered.filter(e => e.date <= to);
      break;
  }
  
  return filtered;
}

// ============================================================================
// 💰 Enhanced Summary Dashboard
// ============================================================================
function renderEnhancedSummary(filteredExpenses, allExpenses, budgets) {
  const total = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const unpaid = filteredExpenses.filter(e => e.status === 'Unpaid').length;
  const taxDeductible = filteredExpenses
    .filter(e => EXPENSE_CATEGORIES[e.category]?.deductible)
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  
  // Calculate average monthly
  const monthlyExpenses = calculateMonthlyAverage(allExpenses);
  
  // Calculate trend (compared to previous period)
  const trend = calculateExpenseTrend(allExpenses);
  
  document.getElementById('totalExpenses').textContent = formatCurrency(total);
  document.getElementById('avgMonthly').textContent = formatCurrency(monthlyExpenses);
  document.getElementById('unpaidCount').textContent = unpaid;
  document.getElementById('taxDeductions').textContent = formatCurrency(taxDeductible);
  
  const trendElement = document.getElementById('expenseTrend');
  if (trend > 0) {
    trendElement.innerHTML = `<span style="color: #ef4444">↑ ${trend}% from last period</span>`;
  } else if (trend < 0) {
    trendElement.innerHTML = `<span style="color: #10b981">↓ ${Math.abs(trend)}% from last period</span>`;
  } else {
    trendElement.innerHTML = `<span style="color: #6b7280">No change</span>`;
  }
}

// ============================================================================
// 📊 Enhanced Charts
// ============================================================================
function renderEnhancedCharts(expenses, properties) {
  renderCategoryChart(expenses);
  renderTrendChart(expenses);
}

function renderCategoryChart(expenses) {
  const ctx = document.getElementById('expenseChart').getContext('2d');
  const chartType = document.getElementById('chartType').value;
  
  const categories = {};
  expenses.forEach(e => {
    categories[e.category] = (categories[e.category] || 0) + (e.amount || 0);
  });

  const labels = Object.keys(categories);
  const data = Object.values(categories);
  const backgroundColors = labels.map(cat => EXPENSE_CATEGORIES[cat]?.color || '#6B7280');

  if (window.expenseChartInstance) window.expenseChartInstance.destroy();
  
  window.expenseChartInstance = new Chart(ctx, {
    type: chartType,
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => color.replace('0.6', '1')),
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { 
          position: 'bottom',
          labels: { usePointStyle: true }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.raw / total) * 100).toFixed(1);
              return `${context.label}: ${formatCurrency(context.raw)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

function renderTrendChart(expenses) {
  const ctx = document.getElementById('trendChart').getContext('2d');
  
  // Group by month
  const monthly = {};
  expenses.forEach(e => {
    if (!e.date) return;
    const month = e.date.substring(0, 7); // YYYY-MM
    monthly[month] = (monthly[month] || 0) + (e.amount || 0);
  });

  const months = Object.keys(monthly).sort();
  const amounts = months.map(month => monthly[month]);

  if (window.trendChartInstance) window.trendChartInstance.destroy();
  
  window.trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months.map(m => formatMonthLabel(m)),
      datasets: [{
        label: 'Monthly Expenses',
        data: amounts,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => formatCurrency(value)
          }
        }
      }
    }
  });
}

// ============================================================================
// 🧾 Enhanced Expense List
// ============================================================================
function renderEnhancedExpenseList(expenses, properties) {
  const list = document.getElementById('expensesList');
  const count = document.getElementById('expenseCount');

  count.textContent = `${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`;

  if (!expenses.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💸</div>
        <h3>No expenses found</h3>
        <p>Try adjusting your filters or add a new expense</p>
        <button class="btn btn-primary" onclick="openExpenseForm()">Add Your First Expense</button>
      </div>
    `;
    return;
  }

  list.innerHTML = `
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th><input type="checkbox" id="selectAllExpenses"></th>
            <th>Description</th>
            <th>Property</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Status</th>
            <th>Tax Deductible</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${expenses.map(expense => {
            const property = properties.find(p => p.id === expense.propertyId);
            const categoryInfo = EXPENSE_CATEGORIES[expense.category];
            const isDeductible = categoryInfo?.deductible;
            
            return `
              <tr class="expense-row ${expense.status === 'Unpaid' ? 'unpaid' : ''}">
                <td><input type="checkbox" class="expense-checkbox" value="${expense.id}"></td>
                <td>
                  <div class="expense-description">
                    <strong>${expense.description || 'Unnamed Expense'}</strong>
                    ${expense.receiptUrl ? '<span class="receipt-badge">📎</span>' : ''}
                  </div>
                </td>
                <td>${property ? property.name : 'General'}</td>
                <td>
                  <span class="category-tag" style="background: ${categoryInfo?.color || '#6B7280'}22; color: ${categoryInfo?.color || '#6B7280'};">
                    ${expense.category}
                  </span>
                </td>
                <td class="amount-cell">${formatCurrency(expense.amount)}</td>
                <td>${new Date(expense.date).toLocaleDateString('en-AU')}</td>
                <td>
                  <span class="status-badge status-${expense.status?.toLowerCase()}">
                    ${expense.status}
                  </span>
                </td>
                <td>
                  <span class="deductible-badge ${isDeductible ? 'deductible-yes' : 'deductible-no'}">
                    ${isDeductible ? '✓ Yes' : '✗ No'}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon" onclick="openExpenseForm('${expense.id}')" title="Edit">
                      ✏️
                    </button>
                    <button class="btn-icon" onclick="duplicateExpense('${expense.id}')" title="Duplicate">
                      📋
                    </button>
                    <button class="btn-icon btn-danger" onclick="confirmDeleteExpense('${expense.id}')" title="Delete">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Select all functionality
  document.getElementById('selectAllExpenses').addEventListener('change', function() {
    const checkboxes = document.querySelectorAll('.expense-checkbox');
    checkboxes.forEach(checkbox => checkbox.checked = this.checked);
  });
}

// ============================================================================
// 🔄 Recurring Expenses
// ============================================================================
function renderRecurringExpenses(expenses, properties) {
  const recurringContainer = document.getElementById('recurringExpenses');
  const recurring = expenses.filter(e => e.recurring);
  
  if (!recurring.length) {
    recurringContainer.innerHTML = `
      <div class="empty-state small">
        <p>No recurring expenses set up</p>
        <button class="btn btn-outline" onclick="openRecurringExpenseForm()">Add Recurring Expense</button>
      </div>
    `;
    return;
  }

  recurringContainer.innerHTML = `
    <div class="recurring-grid">
      ${recurring.map(expense => {
        const property = properties.find(p => p.id === expense.propertyId);
        const nextDate = calculateNextRecurringDate(expense);
        
        return `
          <div class="recurring-card">
            <div class="recurring-header">
              <h4>${expense.description}</h4>
              <span class="recurring-amount">${formatCurrency(expense.amount)}</span>
            </div>
            <div class="recurring-details">
              <div><strong>Frequency:</strong> ${expense.frequency || 'Monthly'}</div>
              <div><strong>Next Due:</strong> ${nextDate.toLocaleDateString('en-AU')}</div>
              <div><strong>Property:</strong> ${property ? property.name : 'General'}</div>
            </div>
            <div class="recurring-actions">
              <button class="btn btn-outline" onclick="skipRecurringExpense('${expense.id}')">
                Skip
              </button>
              <button class="btn btn-primary" onclick="processRecurringExpense('${expense.id}')">
                Mark Paid
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ============================================================================
// ➕ Enhanced Expense Form
// ============================================================================
async function openExpenseForm(id = null) {
  const main = document.getElementById('mainContent');
  const properties = await getAllItems(STORE_NAMES.properties);
  const existingExpenses = await getAllItems(STORE_NAMES.expenses).catch(() => []);
  const expense = id ? existingExpenses.find(e => e.id === id) : {
    id: null,
    propertyId: '',
    category: 'Other',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    recurring: false,
    frequency: 'monthly',
    status: 'Unpaid',
    receiptUrl: '',
    notes: ''
  };

  main.innerHTML = `
    <div class="form-container">
      <div class="form-header">
        <h2>${id ? 'Edit Expense' : 'Add Expense'}</h2>
        <button class="btn btn-outline" onclick="initExpensesUI()">← Back to Expenses</button>
      </div>
      
      <form id="expenseForm" class="styled-form">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Description *</label>
            <input type="text" name="description" value="${expense.description || ''}" 
                   class="form-input" placeholder="What was this expense for?" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Property</label>
            <select name="propertyId" class="form-select">
              <option value="">General (No Property)</option>
              ${properties.map(p => 
                `<option value="${p.id}" ${p.id === expense.propertyId ? 'selected' : ''}>
                  ${p.name}
                </option>`
              ).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Category *</label>
            <select name="category" class="form-select" required>
              ${Object.keys(EXPENSE_CATEGORIES).map(cat => 
                `<option value="${cat}" ${expense.category === cat ? 'selected' : ''}
                 style="color: ${EXPENSE_CATEGORIES[cat].color}">
                  ${cat} ${EXPENSE_CATEGORIES[cat].deductible ? '✓' : '✗'}
                </option>`
              ).join('')}
            </select>
            <div class="form-hint" id="categoryHint"></div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Amount (AUD) *</label>
            <input type="number" step="0.01" name="amount" value="${expense.amount}" 
                   class="form-input" placeholder="0.00" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Date *</label>
            <input type="date" name="date" value="${expense.date}" class="form-input" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Status</label>
            <select name="status" class="form-select">
              <option value="Paid" ${expense.status === 'Paid' ? 'selected' : ''}>Paid</option>
              <option value="Unpaid" ${expense.status === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
              <option value="Reimbursed" ${expense.status === 'Reimbursed' ? 'selected' : ''}>Reimbursed</option>
            </select>
          </div>
        </div>
        
        <div class="form-section">
          <h3>Additional Details</h3>
          
          <div class="form-group">
            <label class="form-label">
              <input type="checkbox" name="recurring" ${expense.recurring ? 'checked' : ''} 
                     onchange="toggleRecurringFields(this.checked)">
              This is a recurring expense
            </label>
          </div>
          
          <div id="recurringFields" style="display: ${expense.recurring ? 'block' : 'none'};">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Frequency</label>
                <select name="frequency" class="form-select">
                  <option value="weekly" ${expense.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                  <option value="monthly" ${expense.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                  <option value="quarterly" ${expense.frequency === 'quarterly' ? 'selected' : ''}>Quarterly</option>
                  <option value="yearly" ${expense.frequency === 'yearly' ? 'selected' : ''}>Yearly</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Next Due Date</label>
                <input type="date" name="nextDue" value="${expense.nextDue || ''}" class="form-input">
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Receipt URL (optional)</label>
            <input type="url" name="receiptUrl" value="${expense.receiptUrl || ''}" 
                   class="form-input" placeholder="https://...">
          </div>
          
          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea name="notes" class="form-input" rows="3" 
                      placeholder="Any additional notes about this expense">${expense.notes || ''}</textarea>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-lg">
            💾 ${id ? 'Update Expense' : 'Add Expense'}
          </button>
          <button type="button" class="btn btn-outline" onclick="initExpensesUI()">
            Cancel
          </button>
          ${id ? `
            <button type="button" class="btn btn-warning" onclick="duplicateExpense('${expense.id}')">
              📋 Duplicate
            </button>
          ` : ''}
        </div>
      </form>
    </div>
  `;

  // Add category hint
  document.querySelector('[name="category"]').addEventListener('change', function() {
    const category = EXPENSE_CATEGORIES[this.value];
    const hint = document.getElementById('categoryHint');
    if (category) {
      hint.innerHTML = `
        <span style="color: ${category.color}">
          ${category.type} expense • 
          ${category.deductible ? 'Tax deductible ✓' : 'Not tax deductible ✗'}
        </span>
      `;
    }
  });
  // Trigger change event to show initial hint
  document.querySelector('[name="category"]').dispatchEvent(new Event('change'));

  document.getElementById('expenseForm').addEventListener('submit', async e => {
    e.preventDefault();
    await saveExpense(expense, new FormData(e.target));
  });
}

// ============================================================================
// 💾 Save Expense Function
// ============================================================================
async function saveExpense(originalExpense, formData) {
  const newExpense = {
    id: originalExpense.id || generateId(),
    propertyId: formData.get('propertyId'),
    category: formData.get('category'),
    description: formData.get('description').trim(),
    amount: parseFloat(formData.get('amount')),
    date: formData.get('date'),
    recurring: formData.get('recurring') === 'on',
    frequency: formData.get('frequency'),
    nextDue: formData.get('nextDue'),
    status: formData.get('status'),
    receiptUrl: formData.get('receiptUrl'),
    notes: formData.get('notes'),
    createdAt: originalExpense.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    if (originalExpense.id) {
      await updateItem(STORE_NAMES.expenses, newExpense);
    } else {
      await addItem(STORE_NAMES.expenses, newExpense);
    }
    initExpensesUI();
  } catch (err) {
    console.error('❌ Error saving expense:', err);
    alert('Error saving expense: ' + err.message);
  }
}

// ============================================================================
// ⚡ Quick Expense Form
// ============================================================================
async function openQuickExpenseForm() {
  const main = document.getElementById('mainContent');
  
  main.innerHTML = `
    <div class="quick-form-container">
      <div class="quick-form-header">
        <h2>⚡ Quick Expense</h2>
        <button class="btn btn-outline" onclick="initExpensesUI()">← Back</button>
      </div>
      
      <form id="quickExpenseForm" class="quick-form">
        <div class="quick-form-grid">
          <input type="text" name="description" placeholder="What was this for?" required
                 class="quick-input" autofocus>
          
          <input type="number" name="amount" placeholder="Amount" step="0.01" required
                 class="quick-input">
          
          <select name="category" class="quick-select" required>
            ${Object.keys(EXPENSE_CATEGORIES).map(cat => 
              `<option value="${cat}">${cat}</option>`
            ).join('')}
          </select>
          
          <button type="submit" class="btn btn-primary btn-lg">💾 Save Expense</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('quickExpenseForm').addEventListener('submit', async e => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const expense = {
      id: generateId(),
      description: formData.get('description'),
      amount: parseFloat(formData.get('amount')),
      category: formData.get('category'),
      date: new Date().toISOString().split('T')[0],
      status: 'Paid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await addItem(STORE_NAMES.expenses, expense);
      initExpensesUI();
    } catch (err) {
      console.error('❌ Error saving quick expense:', err);
      alert('Error saving expense');
    }
  });
}

// ============================================================================
// 🗑️ Enhanced Delete with Confirmation
// ============================================================================
async function confirmDeleteExpense(id) {
  if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) return;
  
  try {
    await deleteItem(STORE_NAMES.expenses, id);
    await refreshExpensesDashboard();
    showNotification('Expense deleted successfully', 'success');
  } catch (err) {
    console.error('❌ Error deleting expense:', err);
    showNotification('Error deleting expense', 'error');
  }
}

// ============================================================================
// 📤 Export Functionality
// ============================================================================
async function exportExpenses() {
  const expenses = await getAllItems(STORE_NAMES.expenses).catch(() => []);
  const properties = await getAllItems(STORE_NAMES.properties).catch(() => []);
  
  const exportData = expenses.map(expense => {
    const property = properties.find(p => p.id === expense.propertyId);
    return {
      'Description': expense.description,
      'Property': property ? property.name : 'General',
      'Category': expense.category,
      'Amount': expense.amount,
      'Date': expense.date,
      'Status': expense.status,
      'Tax Deductible': EXPENSE_CATEGORIES[expense.category]?.deductible ? 'Yes' : 'No',
      'Recurring': expense.recurring ? 'Yes' : 'No',
      'Notes': expense.notes || ''
    };
  });

  const csv = convertToCSV(exportData);
  downloadCSV(csv, `expenses-export-${new Date().toISOString().split('T')[0]}.csv`);
}

// ============================================================================
// 🛠️ Utility Functions
// ============================================================================
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', { 
    style: 'currency', 
    currency: 'AUD',
    minimumFractionDigits: 2
  }).format(amount || 0);
}

function formatMonthLabel(monthString) {
  const [year, month] = monthString.split('-');
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function calculateMonthlyAverage(expenses) {
  if (!expenses.length) return 0;
  
  const monthlyTotals = {};
  expenses.forEach(expense => {
    const month = expense.date.substring(0, 7);
    monthlyTotals[month] = (monthlyTotals[month] || 0) + expense.amount;
  });
  
  const total = Object.values(monthlyTotals).reduce((sum, amount) => sum + amount, 0);
  return total / Object.keys(monthlyTotals).length;
}

function calculateExpenseTrend(expenses) {
  // Simplified trend calculation - compare current month with previous month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const currentMonthExpenses = expenses.filter(e => {
    const date = new Date(e.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).reduce((sum, e) => sum + e.amount, 0);
  
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  
  const prevMonthExpenses = expenses.filter(e => {
    const date = new Date(e.date);
    return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
  }).reduce((sum, e) => sum + e.amount, 0);
  
  if (prevMonthExpenses === 0) return 0;
  return Math.round(((currentMonthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100);
}

function calculateNextRecurringDate(expense) {
  const lastDate = new Date(expense.date);
  const nextDate = new Date(lastDate);
  
  switch(expense.frequency) {
    case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
    case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
    case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
    case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
    default: nextDate.setMonth(nextDate.getMonth() + 1);
  }
  
  return nextDate;
}

function convertToCSV(data) {
  const headers = Object.keys(data[0] || {});
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
  ];
  return csv.join('\n');
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showNotification(message, type = 'info') {
  // Simple notification implementation
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
    color: white;
    border-radius: 8px;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function resetFilters() {
  document.getElementById('filterProperty').value = '';
  document.getElementById('filterCategory').value = '';
  document.getElementById('filterPeriod').value = 'year';
  document.getElementById('filterStatus').value = '';
  document.getElementById('customDateRange').style.display = 'none';
  refreshExpensesDashboard();
}

function toggleRecurringFields(show) {
  document.getElementById('recurringFields').style.display = show ? 'block' : 'none';
}

function toggleTrendDetails() {
  const btn = document.getElementById('btnToggleTrend');
  const trendChart = document.getElementById('trendChart');
  // Implementation for showing/hiding trend details
}

// ============================================================================
// 🌐 Global Function Exports
// ============================================================================
window.openExpenseForm = openExpenseForm;
window.openQuickExpenseForm = openQuickExpenseForm;
window.confirmDeleteExpense = confirmDeleteExpense;
window.toggleRecurringFields = toggleRecurringFields;
window.duplicateExpense = async function(id) {
  const expenses = await getAllItems(STORE_NAMES.expenses).catch(() => []);
  const original = expenses.find(e => e.id === id);
  if (original) {
    const duplicate = { ...original, id: generateId() };
    duplicate.description = `${duplicate.description} (Copy)`;
    duplicate.createdAt = new Date().toISOString();
    duplicate.updatedAt = new Date().toISOString();
    await addItem(STORE_NAMES.expenses, duplicate);
    refreshExpensesDashboard();
    showNotification('Expense duplicated successfully', 'success');
  }
};

window.openRecurringExpenseForm = function() {
  // Open form with recurring preset
  const expense = {
    id: null,
    recurring: true,
    frequency: 'monthly',
    status: 'Unpaid'
  };
  openExpenseForm(null, expense);
};

window.showBulkActions = function() {
  const selected = document.querySelectorAll('.expense-checkbox:checked');
  if (selected.length === 0) {
    showNotification('Please select expenses first', 'error');
    return;
  }
  
  // Show bulk actions menu
  const action = prompt(`Bulk actions for ${selected.length} expenses:\n1. Mark as Paid\n2. Mark as Unpaid\n3. Delete\n\nEnter choice (1-3):`);
  
  if (action === '1') {
    selected.forEach(checkbox => markExpenseStatus(checkbox.value, 'Paid'));
  } else if (action === '2') {
    selected.forEach(checkbox => markExpenseStatus(checkbox.value, 'Unpaid'));
  } else if (action === '3') {
    if (confirm(`Delete ${selected.length} expenses?`)) {
      selected.forEach(checkbox => deleteItem(STORE_NAMES.expenses, checkbox.value));
      refreshExpensesDashboard();
    }
  }
};

async function markExpenseStatus(id, status) {
  const expenses = await getAllItems(STORE_NAMES.expenses);
  const expense = expenses.find(e => e.id === id);
  if (expense) {
    expense.status = status;
    expense.updatedAt = new Date().toISOString();
    await updateItem(STORE_NAMES.expenses, expense);
  }
}