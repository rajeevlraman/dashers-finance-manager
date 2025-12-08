// modal.js - Import Modal functionality
import { parseCSVFile, parseStatementText } from './parser.js';
import { saveImportedTransactions } from './saver.js';

let modalInitialized = false;

export function initImportModal({ accounts, categories, onImported }) {
  console.log("[MODAL] initImportModal called");
  
  const btnImportTx = document.getElementById("btnImportTx");
  console.log("[MODAL] Button element:", btnImportTx);
  
  if (!btnImportTx) {
    console.error("[MODAL] btnImportTx not found!");
    return;
  }
  
  // Remove any existing click handlers first
  const newBtn = btnImportTx.cloneNode(true);
  btnImportTx.parentNode.replaceChild(newBtn, btnImportTx);
  
  // Create modal HTML if it doesn't exist
  if (!document.getElementById("importModal")) {
    createImportModal();
  }
  
  // Add click handler to the new button
  newBtn.addEventListener("click", () => {
    console.log("[MODAL] Button clicked, showing modal");
    showImportModal({ accounts, categories, onImported });
  });
  
  modalInitialized = true;
  console.log("[MODAL] Modal initialized successfully");
}

function createImportModal() {
  console.log("[MODAL] Creating modal HTML structure");
  
  // Remove existing modal if it exists
  const existingModal = document.getElementById("importModal");
  if (existingModal) {
    existingModal.remove();
  }
  
  const modalHTML = `
    <div id="importModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999;">
      <div class="modal-overlay" id="importModalOverlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px);"></div>
      <div class="modal-content" style="position: relative; background: white; border-radius: 12px; max-width: 800px; width: 90%; margin: 5vh auto; padding: 0; z-index: 10000; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;">
        
        <div class="modal-header" style="padding: 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #f9fafb;">
          <h3 style="margin: 0; font-size: 1.5rem; font-weight: 600; color: #111827;">📁 Import Transactions</h3>
          <button id="closeImportModal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280; padding: 4px 8px; border-radius: 6px; line-height: 1;">&times;</button>
        </div>
        
        <div class="modal-body" style="padding: 24px; overflow-y: auto; flex: 1;">
          
          <div class="import-tabs" style="display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
            <button class="tab-btn active" data-tab="csv" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s;">CSV File</button>
            <button class="tab-btn" data-tab="text" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s;">Text Import</button>
          </div>
          
          <!-- CSV Tab -->
          <div id="csvTab" class="tab-content active">
            <div style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Select CSV File</label>
              <input type="file" id="csvFile" accept=".csv,.txt,.xlsx,.xls" style="width: 100%; padding: 10px; border: 2px solid #d1d5db; border-radius: 8px; background: white; cursor: pointer; transition: border-color 0.2s;">
              <small style="display: block; margin-top: 6px; color: #6b7280; font-size: 0.875rem;">Supported: CSV, TXT, Excel files</small>
            </div>
            <div style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Bank Format</label>
              <select id="csvFormat" style="width: 100%; padding: 10px; border: 2px solid #d1d5db; border-radius: 8px; background: white; cursor: pointer;">
                <option value="anz">ANZ Bank</option>
                <option value="commbank">Commonwealth Bank</option>
                <option value="nab">NAB</option>
                <option value="westpac">Westpac</option>
                <option value="generic">Generic CSV</option>
              </select>
            </div>
          </div>
          
          <!-- Text Tab -->
          <div id="textTab" class="tab-content" style="display: none;">
            <div style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Paste Bank Statement Text</label>
              <textarea id="statementText" rows="6" style="width: 100%; padding: 12px; border: 2px solid #d1d5db; border-radius: 8px; font-family: monospace; resize: vertical;" placeholder="Paste your bank statement text here..."></textarea>
            </div>
            <div style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Bank</label>
              <select id="textFormat" style="width: 100%; padding: 10px; border: 2px solid #d1d5db; border-radius: 8px; background: white; cursor: pointer;">
                <option value="anz">ANZ Bank</option>
                <option value="commbank">Commonwealth Bank</option>
                <option value="nab">NAB</option>
                <option value="westpac">Westpac</option>
              </select>
            </div>
          </div>
          
          <!-- Account Selection -->
          <div style="margin-bottom: 24px; padding: 20px; background: #f3f4f6; border-radius: 8px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #111827;">Default Account for Import</label>
            <select id="importAccount" style="width: 100%; padding: 12px; border: 2px solid #9ca3af; border-radius: 8px; background: white; font-weight: 500;">
              <option value="">-- Select Account --</option>
              <!-- Accounts will be populated -->
            </select>
            <small style="display: block; margin-top: 8px; color: #6b7280;">All imported transactions will be assigned to this account</small>
          </div>
          
          <!-- Preview Area -->
          <div id="importPreview" style="display: none; margin-top: 24px; padding: 20px; background: #f0f9ff; border: 2px solid #bae6fd; border-radius: 8px;">
            <h4 style="margin-top: 0; margin-bottom: 16px; color: #0369a1; font-size: 1.125rem;">Preview (First 5 transactions)</h4>
            <div id="previewTable" style="overflow-x: auto; margin-bottom: 16px;">
              <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden;">
                <thead id="previewHeaders" style="background: #e0f2fe;">
                  <!-- Headers will be populated -->
                </thead>
                <tbody id="previewRows" style="font-family: monospace; font-size: 0.875rem;">
                  <!-- Rows will be populated -->
                </tbody>
              </table>
            </div>
            <div id="previewStats" style="display: flex; gap: 24px; font-weight: 500; color: #0c4a6e;">
              <!-- Stats will be populated -->
            </div>
          </div>
          
        </div>
        
        <div class="modal-footer" style="padding: 20px 24px; border-top: 1px solid #e5e7eb; background: #f9fafb; display: flex; gap: 12px; justify-content: flex-end;">
          <button id="parseData" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; transition: background 0.2s;">Parse Data</button>
          <button id="saveImport" style="padding: 12px 24px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; transition: background 0.2s; display: none;">💾 Save Transactions</button>
          <button id="cancelImport" style="padding: 12px 24px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; transition: background 0.2s;">Cancel</button>
        </div>
        
      </div>
    </div>
  `;
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  console.log("[MODAL] Modal HTML created");
  
  // Setup event listeners
  setupModalEvents();
}

function setupModalEvents() {
  console.log("[MODAL] Setting up modal events");
  
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      // Update tab buttons
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.style.background = '#6b7280';
      });
      this.style.background = '#3b82f6';
      
      // Show corresponding tab content
      const tabId = this.getAttribute('data-tab') + 'Tab';
      document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
      });
      document.getElementById(tabId).style.display = 'block';
    });
  });
  
  // Close modal events
  const closeBtn = document.getElementById('closeImportModal');
  const cancelBtn = document.getElementById('cancelImport');
  const overlay = document.getElementById('importModalOverlay');
  
  if (closeBtn) closeBtn.addEventListener('click', hideImportModal);
  if (cancelBtn) cancelBtn.addEventListener('click', hideImportModal);
  if (overlay) overlay.addEventListener('click', hideImportModal);
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideImportModal();
    }
  });
  
  // Parse button
  const parseBtn = document.getElementById('parseData');
  if (parseBtn) {
    parseBtn.addEventListener('click', handleParseData);
  }
  
  // Save button
  const saveBtn = document.getElementById('saveImport');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSaveImport);
  }
  
  // Style file input on change
  const fileInput = document.getElementById('csvFile');
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      if (this.files.length > 0) {
        this.style.borderColor = '#10b981';
        this.style.backgroundColor = '#f0fdf4';
      } else {
        this.style.borderColor = '#d1d5db';
        this.style.backgroundColor = 'white';
      }
    });
  }
  
  console.log("[MODAL] All event listeners set up");
}

export function showImportModal({ accounts, categories, onImported }) {
  console.log("[MODAL] showImportModal called with:", {
    accountsCount: accounts?.length,
    categoriesCount: categories?.length,
    hasCallback: !!onImported
  });
  
  const modal = document.getElementById("importModal");
  console.log("[MODAL] Modal element found:", !!modal);
  
  if (!modal) {
    console.error("[MODAL] Modal not found in DOM!");
    return;
  }
  
  // Populate account dropdown
  const accountSelect = document.getElementById("importAccount");
  console.log("[MODAL] Account select found:", !!accountSelect);
  
  if (accountSelect && accounts) {
    console.log("[MODAL] Populating accounts dropdown with", accounts.length, "accounts");
    accountSelect.innerHTML = '<option value="">-- Select Account --</option>' +
      accounts.map(acc => `<option value="${acc.id}">${acc.name}</option>`).join('');
  }
  
  // Reset form
  document.getElementById("csvFile").value = "";
  document.getElementById("statementText").value = "";
  document.getElementById("importPreview").style.display = "none";
  document.getElementById("saveImport").style.display = "none";
  document.getElementById("parseData").style.display = "block";
  
  // Store data for later use
  window._importData = {
    accounts,
    categories,
    onImported,
    pendingTransactions: null
  };
  
  // Show modal
  modal.style.display = "block";
  document.body.style.overflow = "hidden";
  
  // Focus on first input
  setTimeout(() => {
    const firstInput = document.querySelector('#importModal input, #importModal select, #importModal textarea');
    if (firstInput) firstInput.focus();
  }, 100);
  
  console.log("[MODAL] Modal shown successfully");
}

function hideImportModal() {
  const modal = document.getElementById("importModal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
    console.log("[MODAL] Modal hidden");
  }
}

async function handleParseData() {
  console.log("[MODAL] handleParseData called");
  
  const parseBtn = document.getElementById("parseData");
  parseBtn.disabled = true;
  parseBtn.textContent = "Parsing...";
  
  try {
    let transactions = [];
    const accountId = document.getElementById("importAccount").value;
    
    if (!accountId) {
      alert("Please select an account first!");
      parseBtn.disabled = false;
      parseBtn.textContent = "Parse Data";
      return;
    }
    
    // Check which tab is active
    const isCSVTab = document.getElementById("csvTab").style.display !== "none";
    
    if (isCSVTab) {
      // Parse CSV
      const fileInput = document.getElementById("csvFile");
      const format = document.getElementById("csvFormat").value;
      
      if (!fileInput.files.length) {
        alert("Please select a CSV file first!");
        parseBtn.disabled = false;
        parseBtn.textContent = "Parse Data";
        return;
      }
      
      transactions = await parseCSVFile(fileInput.files[0], format);
    } else {
      // Parse text
      const text = document.getElementById("statementText").value;
      const format = document.getElementById("textFormat").value;
      
      if (!text.trim()) {
        alert("Please enter statement text!");
        parseBtn.disabled = false;
        parseBtn.textContent = "Parse Data";
        return;
      }
      
      transactions = await parseStatementText(text, format);
    }
    
    // Add accountId to transactions
    transactions = transactions.map(tx => ({
      ...tx,
      accountId: accountId
    }));
    
    // Store for saving
    window._importData.pendingTransactions = transactions;
    
    // Show preview
    showImportPreview(transactions);
    
  } catch (error) {
    console.error("[MODAL] Parse error:", error);
    alert("Error parsing data: " + error.message);
  } finally {
    parseBtn.disabled = false;
    parseBtn.textContent = "Parse Data";
  }
}

function showImportPreview(transactions) {
  console.log("[MODAL] Showing preview of", transactions.length, "transactions");
  
  const previewDiv = document.getElementById("importPreview");
  const headersDiv = document.getElementById("previewHeaders");
  const rowsDiv = document.getElementById("previewRows");
  const statsDiv = document.getElementById("previewStats");
  
  if (transactions.length === 0) {
    alert("No transactions found in the data!");
    return;
  }
  
  // Show preview section
  previewDiv.style.display = "block";
  
  // Create table headers from first transaction
  const firstTx = transactions[0];
  const headers = Object.keys(firstTx);
  headersDiv.innerHTML = `
    <tr>
      ${headers.map(h => `<th style="padding: 8px; border: 1px solid #ddd;">${h}</th>`).join('')}
    </tr>
  `;
  
  // Show first 5 transactions
  const previewRows = transactions.slice(0, 5);
  rowsDiv.innerHTML = previewRows.map(tx => {
    return `
      <tr>
        ${headers.map(h => `<td style="padding: 8px; border: 1px solid #ddd;">${tx[h] || ''}</td>`).join('')}
      </tr>
    `;
  }).join('');
  
  // Calculate stats
  const totalCount = transactions.length;
  const incomeCount = transactions.filter(t => t.amount > 0).length;
  const expenseCount = transactions.filter(t => t.amount < 0).length;
  const totalAmount = transactions.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
  
  statsDiv.innerHTML = `
    <div>Total: ${totalCount} transactions</div>
    <div>Income: ${incomeCount}, Expenses: ${expenseCount}</div>
    <div>Net total: $${totalAmount.toFixed(2)}</div>
  `;
  
  // Show save button
  document.getElementById("saveImport").style.display = "inline-block";
  document.getElementById("parseData").style.display = "none";
}

async function handleSaveImport() {
  console.log("[MODAL] handleSaveImport called");
  
  const saveBtn = document.getElementById("saveImport");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";
  
  try {
    const transactions = window._importData?.pendingTransactions;
    
    if (!transactions || transactions.length === 0) {
      alert("No transactions to save!");
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Transactions";
      return;
    }
    
    console.log("[MODAL] Saving", transactions.length, "transactions");
    
    // Save transactions
    const savedCount = await saveImportedTransactions(transactions);
    
    alert(`✅ Successfully saved ${savedCount} transactions!`);
    
    // Call callback if provided
    if (window._importData?.onImported) {
      console.log("[MODAL] Calling import callback");
      await window._importData.onImported(savedCount);
    }
    
    // Close modal
    hideImportModal();
    
  } catch (error) {
    console.error("[MODAL] Save error:", error);
    alert("❌ Error saving transactions: " + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Transactions";
  }
}