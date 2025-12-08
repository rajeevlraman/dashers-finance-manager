// modal.js - Updated to work with your bankFormats.js structure
import { parseCSVFile, parseStatementText } from './parser.js';
import { saveImportedTransactions } from './saver.js';
import { BANK_FORMATS } from './bankFormats.js'; // This is an array in your file

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
                <option value="">-- Auto-detect from file --</option>
                <!-- Bank options will be populated dynamically -->
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
                <option value="">-- Select format --</option>
                <!-- Bank options will be populated dynamically -->
              </select>
            </div>
          </div>
          
          <!-- Account Selection -->
          <div style="margin-bottom: 24px; padding: 20px; background: #f3f4f6; border-radius: 8px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #111827;">Default Account for Import</label>
            <select id="importAccount" style="width: 100%; padding: 12px; border: 2px solid #9ca3af; border-radius: 8px; background: white; font-weight: 500;">
              <option value="">-- Select Account --</option>
              <!-- Accounts will be populated dynamically -->
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
          <button id="cancelImport" style="padding: 12px 24px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; transition: background 0.2s;">Cancel</button>
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
        b.classList.remove('active');
      });
      this.style.background = '#3b82f6';
      this.classList.add('active');
      
      // Show corresponding tab content
      const tabId = this.getAttribute('data-tab') + 'Tab';
      document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active');
      });
      const targetTab = document.getElementById(tabId);
      if (targetTab) {
        targetTab.style.display = 'block';
        targetTab.classList.add('active');
      }
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

// Helper function to get bank options from your BANK_FORMATS array
function getBankOptions() {
  console.log("[MODAL] Getting bank options from BANK_FORMATS");
  
  // Your BANK_FORMATS is an array of format objects
  const bankOptions = BANK_FORMATS.map(format => ({
    value: format.id,
    name: format.label,
    description: `Auto-detects ${format.label} format`
  }));
  
  // Add an auto-detect option
  bankOptions.unshift({
    value: 'auto',
    name: 'Auto-detect',
    description: 'Automatically detect bank format from file headers'
  });
  
  // Add generic fallback options
  bankOptions.push(
    {
      value: 'generic_csv',
      name: 'Generic CSV',
      description: 'Standard CSV with Date,Description,Amount columns'
    },
    {
      value: 'anz',
      name: 'ANZ Bank',
      description: 'ANZ bank statement format'
    },
    {
      value: 'commbank',
      name: 'Commonwealth Bank',
      description: 'CommBank CSV export'
    },
    {
      value: 'nab',
      name: 'NAB',
      description: 'NAB transaction export'
    },
    {
      value: 'westpac',
      name: 'Westpac',
      description: 'Westpac CSV format'
    }
  );
  
  console.log("[MODAL] Bank options:", bankOptions);
  return bankOptions;
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
  
  // Get bank options from your BANK_FORMATS array
  const bankOptions = getBankOptions();
  console.log("[MODAL] Bank options loaded:", bankOptions.length, "formats");
  
  // Populate bank format dropdowns
  const csvFormatSelect = document.getElementById("csvFormat");
  const textFormatSelect = document.getElementById("textFormat");
  
  if (csvFormatSelect && bankOptions.length > 0) {
    csvFormatSelect.innerHTML = bankOptions.map(bank => 
      `<option value="${bank.value}" title="${bank.description}">${bank.name}</option>`
    ).join('');
    console.log("[MODAL] CSV format dropdown populated");
  }
  
  if (textFormatSelect && bankOptions.length > 0) {
    // For text import, show all options except auto-detect
    const textFormats = bankOptions.filter(bank => bank.value !== 'auto');
    textFormatSelect.innerHTML = textFormats.map(bank => 
      `<option value="${bank.value}" title="${bank.description}">${bank.name}</option>`
    ).join('');
    console.log("[MODAL] Text format dropdown populated");
  }
  
  // Populate account dropdown
  const accountSelect = document.getElementById("importAccount");
  console.log("[MODAL] Account select found:", !!accountSelect);
  
  if (accountSelect && accounts && accounts.length > 0) {
    console.log("[MODAL] Populating accounts dropdown with", accounts.length, "accounts");
    accountSelect.innerHTML = '<option value="">-- Select Account --</option>' +
      accounts.map(acc => `<option value="${acc.id}">${acc.name}</option>`).join('');
  } else if (accountSelect) {
    accountSelect.innerHTML = '<option value="">No accounts available</option>';
    console.warn("[MODAL] No accounts available for import");
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
    pendingTransactions: null,
    bankOptions
  };
  
  // Show modal
  modal.style.display = "block";
  document.body.style.overflow = "hidden";
  
  // Focus on first input
  setTimeout(() => {
    const firstInput = document.querySelector('#importModal input, #importModal select, #importModal textarea');
    if (firstInput) {
      firstInput.focus();
      console.log("[MODAL] Focus set on first input");
    }
  }, 100);
  
  console.log("[MODAL] Modal shown successfully");
}

// The rest of the modal.js file remains the same...
// (hideImportModal, handleParseData, showImportPreview, handleSaveImport functions)
// Just make sure they use the updated bank format handling