// ============================================================================
// 💸 expenses.js — Unified Expense Manager
// Tracks all property-related and general expenses.
// Integrates with properties, maintenance, and dashboard.
// ============================================================================

import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES } from './db.js';
import { generateId } from './db.js';
import { html } from './utils/html.js';

// ============================================================================
// 🏗️ Initialize Expenses UI
// ============================================================================
export async function initExpensesUI() {
  console.log('💸 Expense Manager initialized');
  const main = document.getElementById('mainContent');

  main.innerHTML = `
    <div class="expenses-header">
      <h2>💸 Expenses</h2>
      <div class="expenses-actions">
        <button id="btnNewExpense" class="btn-primary">➕ Add Expense</button>
      </div>
    </div>
    <div class="filters">
      <select id="filterProperty" class="form-select"></select>
      <select id="filterCategory" class="form-select">
        <option value="">All Categories</option>
        <option value="Maintenance">Maintenance</option>
        <option value="Utilities">Utilities</option>
        <option value="Insurance">Insurance</option>
        <option value="Fees">Fees</option>
        <option value="Taxes">Taxes</option>
        <option value="Other">Other</option>
      </select>
      <input type="month" id="filterMonth" class="form-input" />
    </div>
    <div id="expensesSummary" class="expenses-summary"></div>
    <div class="chart-container"><canvas id="expenseChart"></canvas></div>
    <div id="expensesList">Loading...</div>
  `;

  document.getElementById('btnNewExpense').addEventListener('click', () => openExpenseForm());
  await populateFilters();
  await refreshExpensesList();
}

// ============================================================================
// 🧩 Populate Filters
// ============================================================================
async function populateFilters() {
  const properties = await getAllItems(STORE_NAMES.properties);
  const propertySelect = document.getElementById('filterProperty');
  propertySelect.innerHTML =
    `<option value="">All Properties</option>` +
    properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

  propertySelect.addEventListener('change', refreshExpensesList);
  document.getElementById('filterCategory').addEventListener('change', refreshExpensesList);
  document.getElementById('filterMonth').addEventListener('change', refreshExpensesList);
}

// ============================================================================
// 🔁 Refresh Expense List
// ============================================================================
async function refreshExpensesList() {
  const [expenses, properties] = await Promise.all([
    getAllItems(STORE_NAMES.expenses || 'expenses').catch(() => []),
    getAllItems(STORE_NAMES.properties).catch(() => [])
  ]);

  const filterProperty = document.getElementById('filterProperty').value;
  const filterCategory = document.getElementById('filterCategory').value;
  const filterMonth = document.getElementById('filterMonth').value;

  let filtered = expenses;
  if (filterProperty) filtered = filtered.filter(e => e.propertyId === filterProperty);
  if (filterCategory) filtered = filtered.filter(e => e.category === filterCategory);
  if (filterMonth) filtered = filtered.filter(e => e.date?.startsWith(filterMonth));

  renderSummary(filtered);
  renderChart(filtered);
  renderExpenseList(filtered, properties);
}

// ============================================================================
// 💰 Render Summary Totals
// ============================================================================
function renderSummary(expenses) {
  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const summary = document.getElementById('expensesSummary');
  summary.innerHTML = `
    <div class="summary-card">
      <h3>Total Expenses</h3>
      <p>${formatCurrency(total)}</p>
    </div>
  `;
}

// ============================================================================
// 📊 Render Category Chart
// ============================================================================
function renderChart(expenses) {
  const ctx = document.getElementById('expenseChart').getContext('2d');
  const categories = {};
  expenses.forEach(e => (categories[e.category] = (categories[e.category] || 0) + e.amount));

  const labels = Object.keys(categories);
  const data = Object.values(categories);

  if (window.expenseChartInstance) window.expenseChartInstance.destroy();
  window.expenseChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data, borderWidth: 1 }]
    },
    options: {
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

// ============================================================================
// 🧾 Render Expense List
// ============================================================================
function renderExpenseList(expenses, properties) {
  const list = document.getElementById('expensesList');

  if (!expenses.length) {
    list.innerHTML = `<div class="empty-state"><p>No expenses found.</p></div>`;
    return;
  }

  list.innerHTML = `
    <div class="expense-grid">
      ${expenses
        .map(e => {
          const property = properties.find(p => p.id === e.propertyId);
          return html`
            <div class="expense-card">
              <h3>${e.description || 'Expense'}</h3>
              <div><strong>Property:</strong> ${property ? property.name : 'General'}</div>
              <div><strong>Category:</strong> ${e.category}</div>
              <div><strong>Amount:</strong> ${formatCurrency(e.amount)}</div>
              <div><strong>Date:</strong> ${new Date(e.date).toLocaleDateString()}</div>
              <div class="expense-actions">
                <button class="expense-action-btn" data-id="${e.id}" data-action="edit">✏️</button>
                <button class="expense-action-btn" data-id="${e.id}" data-action="delete">🗑️</button>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;

  list.querySelectorAll('.expense-action-btn').forEach(btn => {
    const { id, action } = btn.dataset;
    if (action === 'edit') btn.onclick = () => openExpenseForm(id);
    if (action === 'delete') btn.onclick = () => confirmDeleteExpense(id);
  });
}

// ============================================================================
// ➕ Add / Edit Expense Form
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
    status: 'Paid'
  };

  main.innerHTML = `
    <div class="expense-form-container">
      <h2>${id ? 'Edit Expense' : 'Add Expense'}</h2>
      <form id="expenseForm" class="styled-form">
        <div class="form-group">
          <label>Property</label>
          <select name="propertyId" class="form-select">
            <option value="">-- Select Property --</option>
            ${properties.map(p => `<option value="${p.id}" ${p.id === expense.propertyId ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Category</label>
          <select name="category" class="form-select">
            ${['Maintenance', 'Utilities', 'Insurance', 'Fees', 'Taxes', 'Other']
              .map(cat => `<option value="${cat}" ${expense.category === cat ? 'selected' : ''}>${cat}</option>`)
              .join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" name="description" value="${expense.description || ''}" required>
        </div>
        <div class="form-group">
          <label>Amount (AUD)</label>
          <input type="number" step="0.01" name="amount" value="${expense.amount}" required>
        </div>
        <div class="form-group">
          <label>Date</label>
          <input type="date" name="date" value="${expense.date}" required>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select name="status" class="form-select">
            <option value="Paid" ${expense.status === 'Paid' ? 'selected' : ''}>Paid</option>
            <option value="Unpaid" ${expense.status === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">💾 Save</button>
          <button type="button" id="btnCancel" class="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('btnCancel').addEventListener('click', initExpensesUI);

  document.getElementById('expenseForm').addEventListener('submit', async e => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newExpense = {
      id: expense.id || generateId(),
      propertyId: formData.get('propertyId'),
      category: formData.get('category'),
      description: formData.get('description').trim(),
      amount: parseFloat(formData.get('amount')),
      date: formData.get('date'),
      recurring: false,
      status: formData.get('status'),
      createdAt: expense.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (expense.id) await updateItem(STORE_NAMES.expenses, newExpense);
      else await addItem(STORE_NAMES.expenses, newExpense);
      initExpensesUI();
    } catch (err) {
      console.error('❌ Error saving expense:', err);
      alert('Error saving expense');
    }
  });
}

// ============================================================================
// 🗑️ Delete Expense
// ============================================================================
async function confirmDeleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  await deleteItem(STORE_NAMES.expenses, id);
  await refreshExpensesList();
}

// ============================================================================
// 💰 Utility
// ============================================================================
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount || 0);
}
