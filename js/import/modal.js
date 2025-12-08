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
  
  const modalHTML = `
    <div id="importModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000;">
      <div class="modal-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5);"></div>
      <div class="modal-content" style="position: relative; background: white; border-radius: 8px; max-width: 700px; margin: 50px auto; padding: 0; z-index: 1001;">
        
        <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0;">📁 Import Transactions</h3>
          <button id="closeImportModal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
        </div>
        
        <div class="modal-body" style="padding: 20px;">
          
          <div class="tab-buttons" style="display: flex; gap: 10px; margin-bottom: 20px;">
            <button class="tab-btn active" data-tab="csv" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">CSV File</button>
            <button class="tab-btn" data-tab="text" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Text</button>
          </div>
          
          <!-- CSV Tab -->
          <div id="csvTab" class="tab-content active" style="display: block;">
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px; font-weight: bold;">Select CSV File</label>
              <input type="file" id="csvFile" accept=".csv,.txt" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              <small style="color: #666;">Supported: CSV, TSV, Excel export</small>
            </div>
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px; font-weight: bold;">Bank Format</label>
              <select id="csvFormat" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <option value="anz">ANZ Bank</option>
                <option value="commbank">CommBank</option>
                <option value="nab">NAB</option>
                <option value="westpac">Westpac</option>
                <option value="generic">Generic CSV</option>
              </select>
            </div>
          </div>
          
          <!-- Text Tab -->
          <div id="textTab" class="tab-content" style="display: none;">
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px; font-weight: bold;">Paste Statement Text</label>
              <textarea id="statementText" rows="6" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Paste your bank statement here..."></textarea>
            </div>
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px; font-weight: bold;">Bank</label>
              <select id="textFormat" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <option value="anz">ANZ Bank</option>
                <option value="commbank">CommBank</option>
                <option value="nab">NAB</option>
                <option value="westpac">Westpac</option>
              </select>
            </div>
          </div>
          
          <!-- Account Selection -->
          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Default Account</label>
            <select id="importAccount" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              <option value="">Select Account</option>
              <!-- Accounts will be populated -->
            </select>
          </div>
          
          <!-- Preview Area -->
          <div id="importPreview" style="display: none; margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 4px;">
            <h4 style="margin-top: 0;">Preview</h4>
            <div id="previewTable" style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead id="previewHeaders" style="background: #e9ecef;">
                  <!-- Headers will be populated -->
                </thead>
                <tbody id="previewRows">
                  <!-- Rows will be populated -->
                </tbody>
              </table>
            </div>
            <div id="previewStats" style="margin-top: 10px; font-weight: bold;"></div>
          </div>
          
        </div>
        
        <div class="modal-footer" style="padding: 20px; border-top: 1px solid #eee; display: flex; gap: 10px; justify-content: flex-end;">
          <button id="parseData" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Parse Data</button>
          <button id="saveImport" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; display: none;">Save Transactions</button>
          <button id="cancelImport" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
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
        b.style.background = '#6c757d';
        b.classList.remove('active');
      });
      this.style.background = '#007bff';
      this.classList.add('active');
      
      // Show corresponding tab content
      const tabId = this.getAttribute('data-tab') + 'Tab';
      document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
      });
      document.getElementById(tabId).style.display = 'block';
    });
  });
  
  // Close modal events
  document.getElementById('closeImportModal').addEventListener('click', hideImportModal);
  document.getElementById('cancelImport').addEventListener('click', hideImportModal);
  document.querySelector('.modal-overlay').addEventListener('click', hideImportModal);
  
  // Parse button
  document.getElementById('parseData').addEventListener('click', handleParseData);
  
  // Save button
  document.getElementById('saveImport').addEventListener('click', handleSaveImport);
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
  if (accountSelect && accounts) {
    accountSelect.innerHTML = '<option value="">Select Account</option>' +
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
  
  console.log("[MODAL] Modal shown");
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