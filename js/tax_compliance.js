// ============================================================================
// 📘 tax_compliance.js — Australian ATO Compliance & Reporting Hub
// ----------------------------------------------------------------------------
// Connected to IndexedDB: pulls live rent, loans, expenses, maintenance data
// Includes popup calculators: CGT & Negative Gearing
// Inline mobile-first styling for testing
// ============================================================================

import { getAllItems, STORE_NAMES } from './db.js';
import { html } from './utils/html.js';

// ============================================================================
// 🎯 Initialize ATO Reports Page
// ============================================================================
export async function initTaxComplianceUI() {
  console.log('📘 ATO Reports Page initializing...');

  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <style>
      body { background:#f9fafb;font-family:'Inter',sans-serif;color:#222;margin:0; }
      .ato-container { padding:16px; display:flex; flex-direction:column; gap:18px; }
      h2 { margin-top:0; font-size:1.5rem; }
      h3 { font-size:1.1rem; margin:12px 0 6px; color:#1f2937; }
      .section { background:white; border-radius:12px; box-shadow:0 2px 5px rgba(0,0,0,0.08); padding:14px; }
      .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:10px; }
      .card { padding:12px; border-radius:10px; background:#f3f4f6; text-align:center; }
      .highlight { background:#dbeafe; color:#1e3a8a; font-weight:600; }
      .btn { padding:8px 12px; border:none; border-radius:6px; cursor:pointer; }
      .btn-primary { background:#2563eb; color:white; }
      .btn-outline { background:none; border:1px solid #2563eb; color:#2563eb; }
      .record-item { padding:6px 0; border-bottom:1px solid #eee; display:flex; justify-content:space-between; }
      .record-item:last-child { border:none; }
      .modal { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:none; align-items:center; justify-content:center; z-index:200; }
      .modal.active { display:flex; }
      .modal-content { background:white; border-radius:12px; padding:20px; max-width:360px; width:90%; box-shadow:0 5px 15px rgba(0,0,0,0.2); }
      .close-btn { float:right; background:none; border:none; font-size:1.4rem; cursor:pointer; color:#666; }
      @media(min-width:768px){
        .ato-container{padding:24px 60px;}
      }
    </style>

    <div class="ato-container">
      <h2>📘 ATO Reports & Compliance Hub</h2>

      <div class="section" id="taxDatesSection">
        <h3>📅 Key Australian Tax Dates</h3>
        <div class="grid" id="taxDatesGrid"></div>
      </div>

      <div class="section">
        <h3>💰 Income & Expense Records</h3>
        <div id="incomeExpenseRecords">Loading...</div>
      </div>

      <div class="section">
        <h3>🏦 Loans & Borrowing Costs</h3>
        <div id="loanRecords">Loading...</div>
      </div>

      <div class="section">
        <h3>🧰 Maintenance & Improvements</h3>
        <div id="maintenanceRecords">Loading...</div>
      </div>

      <div class="section">
        <h3>🧮 Tax Calculators</h3>
        <button class="btn btn-primary" id="btnCGT">📈 CGT Estimator</button>
        <button class="btn btn-outline" id="btnNegGearing">📉 Negative Gearing</button>
      </div>

      <div class="section">
        <h3>📤 Export Reports</h3>
        <button class="btn btn-primary" id="btnExportReport">📦 Export All (coming soon)</button>
      </div>
    </div>

    <!-- CGT Modal -->
    <div class="modal" id="modalCGT">
      <div class="modal-content">
        <button class="close-btn" id="closeCGT">✖</button>
        <h3>📈 Capital Gains Tax Estimator</h3>
        <form id="formCGT" class="styled-form">
          <input type="number" name="purchase" placeholder="Purchase Price (AUD)" required>
          <input type="number" name="sell" placeholder="Estimated Selling Price (AUD)" required>
          <input type="number" name="improve" placeholder="Capital Improvements (AUD)" required>
          <input type="number" name="costs" placeholder="Selling Costs (AUD)" required>
          <input type="number" name="years" placeholder="Years Owned" required>
          <button class="btn btn-primary" type="submit">Calculate</button>
        </form>
        <p id="cgtResult" style="margin-top:10px;"></p>
      </div>
    </div>

    <!-- Negative Gearing Modal -->
    <div class="modal" id="modalNeg">
      <div class="modal-content">
        <button class="close-btn" id="closeNeg">✖</button>
        <h3>📉 Negative Gearing Calculator</h3>
        <form id="formNeg" class="styled-form">
          <input type="number" name="loss" placeholder="Rental Loss Amount (AUD)" required>
          <input type="number" name="taxRate" placeholder="Marginal Tax Rate (%)" required>
          <button class="btn btn-primary" type="submit">Calculate</button>
        </form>
        <p id="negResult" style="margin-top:10px;"></p>
      </div>
    </div>
  `;

  // Load & Render Data
  const [transactions, loans, maintenance] = await Promise.all([
    getAllItems(STORE_NAMES.transactions),
    getAllItems(STORE_NAMES.loans),
    getAllItems(STORE_NAMES.maintenance)
  ]);

  renderTaxDates();
  renderRecords(transactions, loans, maintenance);
  setupModals();
}

// ============================================================================
// 📅 Render Key Tax Dates
// ============================================================================
function renderTaxDates() {
  const grid = document.getElementById('taxDatesGrid');
  const year = new Date().getFullYear();
  const today = new Date();

  const dates = [
    { label: 'Start of Financial Year', date: `${year}-07-01` },
    { label: 'Individual Lodgement Deadline', date: `${year}-10-31` },
    { label: 'Quarterly BAS (Mar)', date: `${year}-03-15` },
    { label: 'Land Tax Assessment', date: `${year}-06-30` }
  ];

  grid.innerHTML = dates.map(d => {
    const due = new Date(d.date);
    const upcoming = due >= today && due - today < 1000 * 60 * 60 * 24 * 30;
    return `<div class="card ${upcoming ? 'highlight' : ''}">
      <div>${d.label}</div>
      <div>${due.toLocaleDateString('en-AU')}</div>
    </div>`;
  }).join('');
}

// ============================================================================
// 📖 Render Records from IndexedDB
// ============================================================================
function renderRecords(transactions, loans, maintenance) {
  const incomeDiv = document.getElementById('incomeExpenseRecords');
  const loanDiv = document.getElementById('loanRecords');
  const maintDiv = document.getElementById('maintenanceRecords');

  const incomeTx = transactions.filter(t => t.type === 'income');
  const expenseTx = transactions.filter(t => t.type === 'expense');

  incomeDiv.innerHTML = `
    <h4>Income Records</h4>
    ${incomeTx.map(t => `<div class="record-item"><span>${t.description || 'Income'}</span><span>${fmt(t.amount)}</span></div>`).join('')}
    <h4>Expense Records</h4>
    ${expenseTx.map(t => `<div class="record-item"><span>${t.description || 'Expense'}</span><span>${fmt(t.amount)}</span></div>`).join('')}
  `;

  loanDiv.innerHTML = loans.length
    ? loans.map(l => `<div class="record-item"><span>${l.name || 'Loan'}</span><span>${fmt(l.currentBalance)}</span></div>`).join('')
    : `<p style="opacity:0.6;">No loan data</p>`;

  maintDiv.innerHTML = maintenance.length
    ? maintenance.map(m => `<div class="record-item"><span>${m.title || 'Maintenance'}</span><span>${fmt(m.cost)}</span></div>`).join('')
    : `<p style="opacity:0.6;">No maintenance data</p>`;
}

// ============================================================================
// 🧮 Popup Calculators
// ============================================================================
function setupModals() {
  const modalCGT = document.getElementById('modalCGT');
  const modalNeg = document.getElementById('modalNeg');

  document.getElementById('btnCGT').onclick = () => modalCGT.classList.add('active');
  document.getElementById('btnNegGearing').onclick = () => modalNeg.classList.add('active');
  document.getElementById('closeCGT').onclick = () => modalCGT.classList.remove('active');
  document.getElementById('closeNeg').onclick = () => modalNeg.classList.remove('active');

  document.getElementById('formCGT').onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const purchase = parseFloat(f.get('purchase') || 0);
    const sell = parseFloat(f.get('sell') || 0);
    const improve = parseFloat(f.get('improve') || 0);
    const costs = parseFloat(f.get('costs') || 0);
    const years = parseFloat(f.get('years') || 0);
    const gain = sell - (purchase + improve + costs);
    const discount = years >= 1 ? 0.5 : 0;
    const taxableGain = gain * (1 - discount);
    document.getElementById('cgtResult').innerHTML = `
      Estimated Capital Gain: ${fmt(gain)}<br>
      CGT Discount: ${discount * 100}%<br>
      Taxable Gain: ${fmt(taxableGain)}
    `;
  };

  document.getElementById('formNeg').onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const loss = parseFloat(f.get('loss') || 0);
    const rate = parseFloat(f.get('taxRate') || 0) / 100;
    const refund = loss * rate;
    const net = loss - refund;
    document.getElementById('negResult').innerHTML = `
      Tax Refund Benefit: ${fmt(refund)}<br>
      Net Cost of Holding Property: ${fmt(net)}
    `;
  };
}

// ============================================================================
// 💰 Utility
// ============================================================================
function fmt(amount, currency = 'AUD') {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount || 0);
}
