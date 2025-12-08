// modal.js - Import Modal functionality
import { parseCSVFile } from './parser.js';
import { saveImportedTransactions } from './saver.js';

export function initImportModal({ accounts, categories, onImported }) {
  console.log("[MODAL] initImportModal called");
  
  const btnImportTx = document.getElementById("btnImportTx");
  const modal = document.getElementById("importModal");
  
  console.log("[MODAL] Button:", btnImportTx);
  console.log("[MODAL] Modal element:", modal);
  
  if (!btnImportTx) {
    console.error("[MODAL] btnImportTx not found!");
    return;
  }
  
  // Create modal if it doesn't exist
  if (!modal) {
    createImportModal();
  }
  
  // Add click handler
  btnImportTx.addEventListener("click", () => {
    console.log("[MODAL] Import button clicked, showing modal...");
    showImportModal({ accounts, categories, onImported });
  });
  
  console.log("[MODAL] Event listener added to button");
}

function createImportModal() {
  console.log("[MODAL] Creating modal HTML...");
  
  const modalHTML = `
    <div id="importModal" class="modal" style="display: none;">
      <div class="modal-overlay" id="importModalOverlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>📁 Import Transactions</h3>
          <button class="modal-close" id="closeImportModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="import-tabs">
            <button class="tab-btn active" data-tab="csv">CSV File</button>
            <button class="tab-btn" data-tab="text">Statement Text</button>
          </div>
          
          <div id="csvTab" class="tab-content active">
            <div class="form-group">
              <label>Select CSV File</label>
              <input type="file" id="csvFile" accept=".csv,.txt" class="form-control">
              <small class="form-text">Supported formats: CSV, TSV, Bank statements</small>
            </div>
            <div class="form-group">
              <label>Bank/Format</label>
              <select id="csvFormat" class="form-control">
                <option value="anz">ANZ Bank</option>
                <option value="commbank">CommBank</option>
                <option value="nab">NAB</option>
                <option value="westpac">Westpac</option>
                <option value="generic">Generic CSV</option>
              </select>
            </div>
          </div>
          
          <div id="textTab" class="tab-content">
            <div class="form-group">
              <label>Paste Statement Text</label>
              <textarea id="statementText" class="form-control" rows="6" placeholder="Paste your bank statement text here..."></textarea>
            </div>
            <div class="form-group">
              <label>Bank</label>
              <select id="textFormat" class="form-control">
                <option value="anz">ANZ Bank</option>
                <option value="commbank">CommBank</option>
                <option value="nab">NAB</option>
                <option value="westpac">Westpac</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>Default Account</label>
            <select id="importAccount" class="form-control">
              <option value="">Select Account</option>
            </select>
          </div>
          
          <div id="importPreview" style="display: none;">
            <h4>Preview (first 5 rows)</h4>
            <div class="preview-table-container">
              <table class="preview-table">
                <thead id="previewHeaders"></thead>
                <tbody id="previewRows"></tbody>
              </table>
            </div>
            <div class="preview-stats" id="previewStats"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button id="parseData" class="btn btn-primary">Parse Data</button>
          <button id="saveImport" class="btn btn-success" style="display: none;">Save Transactions</button>
          <button id="cancelImport" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  console.log("[MODAL] Modal HTML added to body");
  
  // Setup tab switching
  setupImportTabs();
  
  // Setup close handlers
  const overlay = document.getElementById("importModalOverlay");
  const closeBtn = document.getElementById("closeImportModal");
  const cancelBtn = document.getElementById("cancelImport");
  
  if (overlay) overlay.addEventListener("click", hideImportModal);
  if (closeBtn) closeBtn.addEventListener("click", hideImportModal);
  if (cancelBtn) cancelBtn.addEventListener("click", hideImportModal);
}

function setupImportTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // Remove active class from all tabs
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      
      // Add active class to clicked tab
      btn.classList.add("active");
      const tabId = btn.dataset.tab + "Tab";
      document.getElementById(tabId).classList.add("active");
    });
  });
}

export function showImportModal({ accounts, categories, onImported }) {
  console.log("[MODAL] showImportModal called");
  
  const modal = document.getElementById("importModal");
  if (!modal) {
    console.error("[MODAL] Modal not found!");
    return;
  }
  
  // Populate account dropdown
  const accountSelect = document.getElementById("importAccount");
  if (accountSelect) {
    accountSelect.innerHTML = '<option value="">Select Account</option>' +
      accounts.map(acc => `<option value="${acc.id}">${acc.name}</option>`).join('');
  }
  
  // Clear previous data
  document.getElementById("csvFile").value = "";
  document.getElementById("statementText").value = "";
  document.getElementById("importPreview").style.display = "none";
  document.getElementById("saveImport").style.display = "none";
  document.getElementById("parseData").style.display = "block";
  
  // Store callback
  modal.dataset.onImported = onImported ? 'true' : 'false';
  window.importCallback = onImported;
  window.importAccounts = accounts;
  window.importCategories = categories;
  
  // Setup parse button
  const parseBtn = document.getElementById("parseData");
  if (parseBtn) {
    parseBtn.onclick = handleParseData;
  }
  
  // Setup save button
  const saveBtn = document.getElementById("saveImport");
  if (saveBtn) {
    saveBtn.onclick = handleSaveImport;
  }
  
  // Show modal
  modal.style.display = "block";
  document.body.style.overflow = "hidden";
  
  console.log("[MODAL] Modal displayed");
}

function hideImportModal() {
  const modal = document.getElementById("importModal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }
}

async function handleParseData() {
  console.log("[MODAL] Parsing data...");
  
  const csvTab = document.getElementById("csvTab");
  const textTab = document.getElementById("textTab");
  let data = [];
  
  try {
    if (csvTab.classList.contains("active")) {
      // Parse CSV file
      const fileInput = document.getElementById("csvFile");
      const format = document.getElementById("csvFormat").value;
      
      if (!fileInput.files.length) {
        alert("Please select a file first!");
        return;
      }
      
      data = await parseCSVFile(fileInput.files[0], format);
    } else {
      // Parse text
      const text = document.getElementById("statementText").value;
      const format = document.getElementById("textFormat").value;
      
      if (!text.trim()) {
        alert("Please enter statement text!");
        return;
      }
      
      data = await parseStatementText(text, format);
    }
    
    if (data.length === 0) {
      alert("No transactions found in the data!");
      return;
    }
    
    // Show preview
    showImportPreview(data);
    
  } catch (error) {
    console.error("[MODAL] Parse error:", error);
    alert("Error parsing data: " + error.message);
  }
}

function showImportPreview(transactions) {
  const preview = document.getElementById("importPreview");
  const headers = document.getElementById("previewHeaders");
  const rows = document.getElementById("previewRows");
  const stats = document.getElementById("previewStats");
  
  if (transactions.length === 0) return;
  
  // Show preview section
  preview.style.display = "block";
  
  // Create headers from first transaction keys
  const sample = transactions[0];
  const headerCells = Object.keys(sample).map(key => 
    `<th>${key.charAt(0).toUpperCase() + key.slice(1)}</th>`
  ).join('');
  headers.innerHTML = `<tr>${headerCells}</tr>`;
  
  // Show first 5 rows
  const previewData = transactions.slice(0, 5);
  rows.innerHTML = previewData.map(tx => {
    const cells = Object.values(tx).map(val => 
      `<td>${val}</td>`
    ).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  
  // Show stats
  const total = transactions.length;
  const incomeCount = transactions.filter(t => t.amount > 0).length;
  const expenseCount = transactions.filter(t => t.amount < 0).length;
  const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  
  stats.innerHTML = `
    <p>Found ${total} transactions</p>
    <p>${incomeCount} income, ${expenseCount} expenses</p>
    <p>Net total: $${totalAmount.toFixed(2)}</p>
  `;
  
  // Store transactions for saving
  window.pendingImport = transactions;
  
  // Show save button
  document.getElementById("saveImport").style.display = "inline-block";
  document.getElementById("parseData").style.display = "none";
}

async function handleSaveImport() {
  const saveBtn = document.getElementById("saveImport");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";
  
  try {
    const accountId = document.getElementById("importAccount").value;
    if (!accountId) {
      alert("Please select an account!");
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Transactions";
      return;
    }
    
    const transactions = window.pendingImport || [];
    if (transactions.length === 0) {
      alert("No transactions to save!");
      return;
    }
    
    // Add accountId to all transactions
    const transactionsWithAccount = transactions.map(tx => ({
      ...tx,
      accountId: accountId
    }));
    
    // Save to database
    const savedCount = await saveImportedTransactions(transactionsWithAccount);
    
    alert(`Successfully saved ${savedCount} transactions!`);
    
    // Call callback if provided
    if (window.importCallback) {
      window.importCallback(savedCount);
    }
    
    // Close modal
    hideImportModal();
    
  } catch (error) {
    console.error("[MODAL] Save error:", error);
    alert("Error saving transactions: " + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Transactions";
  }
}