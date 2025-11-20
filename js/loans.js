// ============================================================================
// 🏦 loans.js — Full Loans Module for Budget Tracker
// Handles creation, editing, payments, amortization schedule, and offset logic.
// ============================================================================

import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES } from './db.js';
import { generateId } from './db.js';
import { html } from './utils/html.js';
import { calculateAmortizationSchedule, calculatePaymentAmount, calculateTotalInterest } from './loanCalculations.js';

// ============================================================================
// 🔹 Default Demo Loans
// ============================================================================
const DEFAULT_LOANS = [
  { id: 'loan1', name: 'Home Mortgage', type: 'mortgage', originalAmount: 300000, currentBalance: 300000, interestRate: 4.5, currency: 'AUD', startDate: new Date().toISOString().split('T')[0], termMonths: 360, paymentFrequency: 'monthly' },
  { id: 'loan2', name: 'Car Loan', type: 'vehicle', originalAmount: 25000, currentBalance: 25000, interestRate: 6.2, currency: 'AUD', startDate: new Date().toISOString().split('T')[0], termMonths: 60, paymentFrequency: 'monthly' },
  { id: 'loan3', name: 'Personal Loan', type: 'personal', originalAmount: 10000, currentBalance: 10000, interestRate: 8.0, currency: 'AUD', startDate: new Date().toISOString().split('T')[0], termMonths: 36, paymentFrequency: 'monthly' },
  { id: 'loan4', name: 'Student Loan', type: 'education', originalAmount: 15000, currentBalance: 15000, interestRate: 3.5, currency: 'AUD', startDate: new Date().toISOString().split('T')[0], termMonths: 120, paymentFrequency: 'monthly' }
];

// ============================================================================
// 💰 Process Loan Payment
// ============================================================================
export async function processLoanPayment(loanId, paymentData) {
  const { amount, fromAccountId, paymentDate = new Date().toISOString().split('T')[0] } = paymentData;

  const [loan, accounts] = await Promise.all([
    getAllItems(STORE_NAMES.loans).then(loans => loans.find(l => l.id === loanId)),
    getAllItems(STORE_NAMES.accounts)
  ]);

  if (!loan) throw new Error('Loan not found');
  const fromAccount = accounts.find(a => a.id === fromAccountId);
  if (!fromAccount) throw new Error('Source account not found');

  const monthlyRate = loan.interestRate / 100 / 12;
  const interest = loan.currentBalance * monthlyRate;
  const principal = Math.min(amount - interest, loan.currentBalance);

  loan.currentBalance -= principal;
  loan.updatedAt = new Date().toISOString();
  fromAccount.balance -= amount;
  fromAccount.updatedAt = new Date().toISOString();

  const loanTransaction = {
    id: generateId(),
    loanId,
    type: 'payment',
    amount,
    principal,
    interest,
    date: paymentDate,
    fromAccountId,
    description: `Loan payment - ${loan.name}`,
    createdAt: new Date().toISOString()
  };

  const paymentTransaction = {
    id: generateId(),
    type: 'expense',
    amount,
    date: paymentDate,
    categoryId: await getLoanExpenseCategoryId(),
    accountId: fromAccountId,
    description: `Loan payment - ${loan.name}`,
    createdAt: new Date().toISOString()
  };

  await updateItem(STORE_NAMES.loans, loan);
  await updateItem(STORE_NAMES.accounts, fromAccount);
  await addItem(STORE_NAMES.loanTransactions, loanTransaction);
  await addItem(STORE_NAMES.transactions, paymentTransaction);

  return { principal, interest, newBalance: loan.currentBalance };
}

// ============================================================================
// 🧮 Offset Interest Calculation
// ============================================================================
export async function calculateOffsetInterest(loanId) {
  const [loan, accounts] = await Promise.all([
    getAllItems(STORE_NAMES.loans).then(loans => loans.find(l => l.id === loanId)),
    getAllItems(STORE_NAMES.accounts)
  ]);
  if (!loan?.linkedOffsetId) return 0;

  const offsetAccount = accounts.find(a => a.id === loan.linkedOffsetId);
  if (!offsetAccount) return 0;

  const monthlyRate = loan.interestRate / 100 / 12;
  const effectiveBalance = Math.max(loan.currentBalance - offsetAccount.balance, 0);
  return (loan.currentBalance - effectiveBalance) * monthlyRate;
}

// ============================================================================
// 📂 Get or Create Loan Expense Category
// ============================================================================
async function getLoanExpenseCategoryId() {
  const categories = await getAllItems(STORE_NAMES.categories);
  let cat = categories.find(c => c.name.toLowerCase().includes('loan') && c.type === 'expense');
  if (!cat) {
    cat = { id: generateId(), name: 'Loan Interest', type: 'expense', icon: '🏦', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await addItem(STORE_NAMES.categories, cat);
  }
  return cat.id;
}

// ============================================================================
// 🧱 UI Initialization
// ============================================================================
export async function initLoansUI() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="loans-header">
      <h2>🏦 Loans</h2>
      <div class="loans-actions">
        <button id="btnNewLoan" class="btn-primary">➕ New Loan</button>
        <button id="btnAddDefaultLoans" class="btn-secondary">📦 Add Default Loans</button>
      </div>
    </div>
    <div id="loansList">Loading...</div>
  `;

  document.getElementById('btnNewLoan').onclick = () => openLoanEditor();
  document.getElementById('btnAddDefaultLoans').onclick = addDefaultLoans;
  await refreshLoansList();
}

// ============================================================================
// 🔁 Refresh Loan Cards
// ============================================================================
async function refreshLoansList() {
  const loans = await getAllItems(STORE_NAMES.loans);
  const list = document.getElementById('loansList');

  if (!loans.length) {
    list.innerHTML = `
      <div class="empty-state">
        <p>No loans defined.</p>
        <button id="btnAddDefaultsEmpty" class="btn-primary">📦 Add Default Loans</button>
      </div>`;
    document.getElementById('btnAddDefaultsEmpty').onclick = addDefaultLoans;
    return;
  }

  const cards = await Promise.all(loans.map(renderLoanCard));
  list.innerHTML = `<div class="loans-grid">${cards.join('')}</div>`;

  list.querySelectorAll('.loan-action-btn').forEach(btn => {
    const { id, action } = btn.dataset;
    if (action === 'edit') btn.onclick = () => openLoanEditor(id);
    if (action === 'delete') btn.onclick = () => deleteLoan(id);
    if (action === 'payment') btn.onclick = () => showPaymentModal(id);
    if (action === 'schedule') btn.onclick = () => viewAmortizationSchedule(id);
  });
}

// ============================================================================
// 💳 Render Loan Card
// ============================================================================
async function renderLoanCard(loan) {
  const progress = ((loan.originalAmount - loan.currentBalance) / loan.originalAmount * 100).toFixed(1);
  const monthlyPayment = calculatePaymentAmount(loan);
  const offsetSavings = await calculateOffsetInterest(loan.id);

  return `
    <div class="loan-card ${loan.type}">
      <div class="loan-header">
        <div class="loan-icon">${getLoanIcon(loan.type)}</div>
        <div class="loan-info">
          <h3>${loan.name}</h3>
          <small>${getLoanTypeLabel(loan.type)} • ${loan.interestRate}%</small>
        </div>
        <div class="loan-balance">
          <strong>${formatCurrency(loan.currentBalance, loan.currency)}</strong>
          <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
          <span>${progress}% paid</span>
        </div>
      </div>
      <div class="loan-details">
        <div>Monthly Payment: ${formatCurrency(monthlyPayment, loan.currency)}</div>
        ${offsetSavings > 0 ? `<div>Offset Savings: ${formatCurrency(offsetSavings, loan.currency)}/month</div>` : ''}
      </div>
      <div class="loan-actions">
        <button class="loan-action-btn" data-id="${loan.id}" data-action="payment" title="Make Payment">💰</button>
        <button class="loan-action-btn" data-id="${loan.id}" data-action="edit" title="Edit">✏️</button>
        <button class="loan-action-btn" data-id="${loan.id}" data-action="schedule" title="View Schedule">📅</button>
        <button class="loan-action-btn" data-id="${loan.id}" data-action="delete" title="Delete">🗑️</button>
      </div>
    </div>`;
}

// ============================================================================
// ✏️ Loan Editor
// ============================================================================
function openLoanEditor(id = null) {
  if (id) {
    getAllItems(STORE_NAMES.loans).then(loans => {
      const loan = loans.find(l => l.id === id);
      showLoanForm(loan);
    });
  } else {
    showLoanForm({
      name: '',
      type: 'personal',
      originalAmount: 0,
      currentBalance: 0,
      interestRate: 0,
      currency: 'AUD',
      startDate: new Date().toISOString().split('T')[0],
      termMonths: 60,
      paymentFrequency: 'monthly'
    });
  }
}

function showLoanForm(loan) {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="loan-form-container">
      <h2>${loan.id ? 'Edit Loan' : 'New Loan'}</h2>
      <form id="loanForm" class="styled-form">
        <label>Loan Name</label>
        <input name="name" value="${loan.name}" required>
        <label>Type</label>
        <select name="type">
          <option value="personal" ${loan.type === 'personal' ? 'selected' : ''}>Personal</option>
          <option value="vehicle" ${loan.type === 'vehicle' ? 'selected' : ''}>Vehicle</option>
          <option value="mortgage" ${loan.type === 'mortgage' ? 'selected' : ''}>Mortgage</option>
          <option value="education" ${loan.type === 'education' ? 'selected' : ''}>Education</option>
          <option value="business" ${loan.type === 'business' ? 'selected' : ''}>Business</option>
        </select>
        <label>Original Amount</label>
        <input name="originalAmount" type="number" step="0.01" value="${loan.originalAmount}">
        <label>Current Balance</label>
        <input name="currentBalance" type="number" step="0.01" value="${loan.currentBalance}">
        <label>Interest Rate (%)</label>
        <input name="interestRate" type="number" step="0.01" value="${loan.interestRate}">
        <label>Term (months)</label>
        <input name="termMonths" type="number" value="${loan.termMonths}">
        <label>Start Date</label>
        <input name="startDate" type="date" value="${loan.startDate}">
        <label>Payment Frequency</label>
        <select name="paymentFrequency">
          <option value="monthly" ${loan.paymentFrequency === 'monthly' ? 'selected' : ''}>Monthly</option>
          <option value="weekly" ${loan.paymentFrequency === 'weekly' ? 'selected' : ''}>Weekly</option>
          <option value="fortnightly" ${loan.paymentFrequency === 'fortnightly' ? 'selected' : ''}>Fortnightly</option>
        </select>
        <div class="form-actions">
          <button type="submit" class="btn-primary">${loan.id ? '💾 Update' : '➕ Add'} Loan</button>
          <button type="button" class="btn-secondary" id="btnCancel">Cancel</button>
        </div>
      </form>
    </div>`;

  document.getElementById('btnCancel').onclick = initLoansUI;

  document.getElementById('loanForm').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const newLoan = {
      id: loan.id || generateId(),
      name: f.name.value.trim(),
      type: f.type.value,
      originalAmount: parseFloat(f.originalAmount.value),
      currentBalance: parseFloat(f.currentBalance.value),
      interestRate: parseFloat(f.interestRate.value),
      termMonths: parseInt(f.termMonths.value),
      startDate: f.startDate.value,
      paymentFrequency: f.paymentFrequency.value,
      currency: loan.currency || 'AUD',
      createdAt: loan.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    loan.id ? await updateItem(STORE_NAMES.loans, newLoan) : await addItem(STORE_NAMES.loans, newLoan);
    initLoansUI();
  };
}

// ============================================================================
// 💳 Payment Modal
// ============================================================================
function showPaymentModal(loanId) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Make Payment</h3>
      <form id="paymentForm" class="styled-form">
        <label>Amount</label><input type="number" id="paymentAmount" step="0.01" required>
        <label>From Account</label><select id="paymentAccount" required><option value="">Select Account</option></select>
        <label>Date</label><input type="date" id="paymentDate" value="${new Date().toISOString().split('T')[0]}">
        <div id="paymentBreakdown" style="display:none;">
          <p><strong>Principal:</strong> <span id="breakdownPrincipal">$0.00</span></p>
          <p><strong>Interest:</strong> <span id="breakdownInterest">$0.00</span></p>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">💳 Pay</button>
          <button type="button" id="cancelPayment" class="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);

  populatePaymentAccounts(loanId);

  document.getElementById('cancelPayment').onclick = () => modal.remove();
  document.getElementById('paymentAmount').oninput = e =>
    calculatePaymentBreakdown(loanId, parseFloat(e.target.value) || 0);
  document.getElementById('paymentForm').onsubmit = async e => {
    e.preventDefault();
    await processLoanPaymentForm(loanId, modal);
  };
}

async function populatePaymentAccounts(loanId) {
  const accounts = await getAllItems(STORE_NAMES.accounts);
  const select = document.getElementById('paymentAccount');
  select.innerHTML += accounts
    .filter(a => a.balance > 0)
    .map(a => `<option value="${a.id}">${a.name} (${formatCurrency(a.balance, a.currency)})</option>`)
    .join('');
}

async function calculatePaymentBreakdown(loanId, amount) {
  const loan = await getAllItems(STORE_NAMES.loans).then(ls => ls.find(l => l.id === loanId));
  if (!loan || amount <= 0) return;
  const monthlyRate = loan.interestRate / 100 / 12;
  const interest = loan.currentBalance * monthlyRate;
  const principal = Math.min(amount - interest, loan.currentBalance);
  document.getElementById('paymentBreakdown').style.display = 'block';
  document.getElementById('breakdownPrincipal').textContent = formatCurrency(principal, loan.currency);
  document.getElementById('breakdownInterest').textContent = formatCurrency(interest, loan.currency);
}

async function processLoanPaymentForm(loanId, modal) {
  const amount = parseFloat(document.getElementById('paymentAmount').value);
  const fromAccountId = document.getElementById('paymentAccount').value;
  const paymentDate = document.getElementById('paymentDate').value;
  if (!amount || !fromAccountId) return alert('Fill all fields');
  try {
    const res = await processLoanPayment(loanId, { amount, fromAccountId, paymentDate });
    alert(`✅ Payment success!\nPrincipal: ${formatCurrency(res.principal, 'AUD')}\nInterest: ${formatCurrency(res.interest, 'AUD')}\nNew Balance: ${formatCurrency(res.newBalance, 'AUD')}`);
    modal.remove();
    initLoansUI();
  } catch (err) {
    alert('❌ ' + err.message);
  }
}

// ============================================================================
// 📅 Amortization Schedule Modal (with summary)
// ============================================================================
function viewAmortizationSchedule(loanId) {
  getAllItems(STORE_NAMES.loans).then(loans => {
    const loan = loans.find(l => l.id === loanId);
    const schedule = calculateAmortizationSchedule(loan);
    const totalInterest = calculateTotalInterest(loan);
    const totalPayments = schedule.reduce((sum, p) => sum + p.payment, 0);
    const finalPayment = schedule[schedule.length - 1];
    const payoffDate = finalPayment ? new Date(finalPayment.date).toLocaleDateString() : 'N/A';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content large">
        <h3>Amortization Schedule — ${loan.name}</h3>

        <div class="schedule-summary">
          <div><strong>Loan Amount:</strong> ${formatCurrency(loan.originalAmount, loan.currency)}</div>
          <div><strong>Total Interest:</strong> ${formatCurrency(totalInterest, loan.currency)}</div>
          <div><strong>Total Payments:</strong> ${formatCurrency(totalPayments, loan.currency)}</div>
          <div><strong>Payoff Date:</strong> ${payoffDate}</div>
        </div>

        <table class="amortization-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Payment</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            ${schedule.map(p => `
              <tr>
                <td>${p.period}</td>
                <td>${new Date(p.date).toLocaleDateString()}</td>
                <td>${formatCurrency(p.payment, loan.currency)}</td>
                <td>${formatCurrency(p.principal, loan.currency)}</td>
                <td>${formatCurrency(p.interest, loan.currency)}</td>
                <td>${formatCurrency(p.balance, loan.currency)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="form-actions">
          <button class="btn-secondary" id="closeSchedule">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('closeSchedule').onclick = () => modal.remove();
  });
}

// ============================================================================
// 🧹 Utilities
// ============================================================================
async function addDefaultLoans() {
  const existing = await getAllItems(STORE_NAMES.loans);
  const ids = existing.map(l => l.id);
  for (const loan of DEFAULT_LOANS) {
    if (!ids.includes(loan.id)) await addItem(STORE_NAMES.loans, { ...loan, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  await refreshLoansList();
}

function getLoanIcon(t) { return { mortgage: '🏠', vehicle: '🚗', personal: '👤', education: '🎓', business: '💼' }[t] || '🏦'; }
function getLoanTypeLabel(t) { return { mortgage: 'Mortgage', vehicle: 'Vehicle', personal: 'Personal', education: 'Education', business: 'Business' }[t] || 'Loan'; }
function formatCurrency(a, c) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(a); }
