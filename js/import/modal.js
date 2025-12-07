// ============================================================================
// 📁 import/modal.js — Import UI (CSV + Manual)
// ============================================================================

import { parseCSVFile, parseStatementText } from './parser.js';
import { saveImportedTransactions } from './saver.js';
import { logImportDebug, isImportDebugEnabled } from './debug.js';

// Public entry
export function initImportModal({ accounts, categories, onImported } = {}) {
  logImportDebug('initImportModal: starting…');

  // 1) Wire up existing "Import Statement" button in transactions header
  const importBtn = document.getElementById('btnImportTx');
  if (!importBtn) {
    console.warn('[IMPORT] btnImportTx not found; cannot init import modal');
    return;
  }

  // 2) Ensure modal exists (inject once)
  let modal = document.getElementById('importModal');
  if (!modal) {
    logImportDebug('initImportModal: injecting HTML');
    document.body.insertAdjacentHTML('beforeend', buildImportModalHTML(accounts));
    modal = document.getElementById('importModal');
  }

  // Re-query important elements
  const closeBtn = document.getElementById('closeImportModal');
  const cancelBtn = document.getElementById('cancelImport');
  const processBtn = document.getElementById('processImport');
  const csvFileInput = document.getElementById('csvFile');
  const accountSelect = document.getElementById('importAccount');
  const csvPreview = document.getElementById('csvPreview');
  const previewSection = document.querySelector('.preview-section');
  const statementText = document.getElementById('statementText');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const debugStatusSpan = document.getElementById('importDebugStatus');

  if (debugStatusSpan) {
    debugStatusSpan.textContent = isImportDebugEnabled() ? 'ON' : 'OFF';
  }

  // -------------------- Open / Close --------------------
  importBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    modal.style.display = 'flex';
    logImportDebug('Import modal opened');
  };

  const closeModal = () => {
    modal.style.display = 'none';
    if (csvFileInput) csvFileInput.value = '';
    if (statementText) statementText.value = '';
    csvPreview.innerHTML = '';
    previewSection.style.display = 'none';
  };

  closeBtn.onclick = closeModal;
  cancelBtn.onclick = (e) => {
    e.preventDefault();
    closeModal();
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // -------------------- Tabs --------------------
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = btn.dataset.tab;
      tabButtons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(tab + 'Tab').classList.add('active');
      logImportDebug('Import tab switched to', tab);
    });
  });

  // -------------------- CSV Preview --------------------
  if (csvFileInput) {
    csvFileInput.addEventListener('change', async () => {
      const file = csvFileInput.files[0];
      if (!file) return;

      const accountId = accountSelect.value;
      logImportDebug('CSV file selected', { name: file.name, size: file.size, accountId });

      try {
        const previewRows = await parseCSVFile(file, { previewOnly: true, accountId });
        logImportDebug('CSV preview rows', previewRows);

        if (!previewRows.length) {
          csvPreview.innerHTML = '<p>No valid rows detected. Check format and try again.</p>';
          previewSection.style.display = 'block';
          return;
        }

        const limited = previewRows.slice(0, 5);
        csvPreview.innerHTML = `
          <pre style="font-size:0.85rem; white-space:pre-wrap;">${limited.join('\n')}</pre>
        `;
        previewSection.style.display = 'block';
      } catch (err) {
        console.error('[IMPORT] CSV preview error', err);
        csvPreview.innerHTML = `<p style="color:red;">Error parsing CSV: ${err.message}</p>`;
        previewSection.style.display = 'block';
      }
    });
  }

  // -------------------- Process Import --------------------
  processBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'csv';
    const accountId = accountSelect.value;

    if (!accountId) {
      alert('Please select an account for these transactions.');
      return;
    }

    logImportDebug('processImport: starting', { activeTab, accountId });

    let txs = [];

    try {
      if (activeTab === 'csv') {
        const file = csvFileInput.files[0];
        if (!file) {
          alert('Please select a CSV file');
          return;
        }
        txs = await parseCSVFile(file, { accountId });
      } else {
        const txt = statementText.value;
        if (!txt.trim()) {
          alert('Please paste your statement data');
          return;
        }
        txs = await parseStatementText(txt, { accountId });
      }

      if (!txs.length) {
        alert('No valid transactions found. Check format and try again.');
        logImportDebug('processImport: 0 transactions after parse');
        return;
      }

      logImportDebug('processImport: parsed transactions', txs);

      // Visual feedback
      processBtn.disabled = true;
      processBtn.textContent = 'Processing…';

      const { saved, skipped } = await saveImportedTransactions(txs, { dedupe: true });

      alert(`Import complete!\nSaved: ${saved}\nSkipped (duplicates/errors): ${skipped}`);
      logImportDebug('processImport: finished', { saved, skipped });

      processBtn.disabled = false;
      processBtn.textContent = 'Process Import';

      closeModal();

      if (typeof onImported === 'function') {
        onImported(saved);
      } else {
        // Fallback: reload page
        window.location.reload();
      }
    } catch (err) {
      console.error('[IMPORT] Error during processing', err);
      alert('Error during import: ' + err.message);
      processBtn.disabled = false;
      processBtn.textContent = 'Process Import';
    }
  });
}

// ---------------------------------------------------------------------------
// HTML Builder
// ---------------------------------------------------------------------------
function buildImportModalHTML(accounts) {
  const accountOptions = (accounts || [])
    .map(a => `<option value="${a.id}">${a.name}</option>`)
    .join('');

  return `
    <div id="importModal" class="modal-overlay"
      style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;
             background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center;">
      <div class="modal"
        style="background:#ffffff;border-radius:12px;padding:20px;max-width:640px;
               width:95%;max-height:80vh;overflow-y:auto;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
        <div class="modal-header"
          style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div>
            <h3 style="margin:0;font-size:1.1rem;">📁 Import Transactions</h3>
            <small style="color:#4b5563;">Macquarie / ANZ / NAB / ME CSV & statements</small>
          </div>
          <button id="closeImportModal"
            style="background:none;border:none;font-size:1.3rem;cursor:pointer;">✕</button>
        </div>

        <div style="font-size:0.8rem;color:#6b7280;margin-bottom:8px;">
          Debug: <span id="importDebugStatus">${isImportDebugEnabled() ? 'ON' : 'OFF'}</span>
          (toggle in Settings)
        </div>

        <div class="modal-body">
          <div class="import-tabs" style="display:flex;gap:8px;margin-bottom:16px;">
            <button class="tab-btn active" data-tab="csv"
              style="padding:6px 12px;border-radius:999px;border:1px solid #d1d5db;
                     background:#2563eb;color:#fff;font-size:0.85rem;cursor:pointer;">
              CSV Import
            </button>
            <button class="tab-btn" data-tab="manual"
              style="padding:6px 12px;border-radius:999px;border:1px solid #d1d5db;
                     background:#f3f4f6;font-size:0.85rem;cursor:pointer;">
              Manual Paste
            </button>
          </div>

          <div id="csvTab" class="tab-content active">
            <div class="form-group" style="margin-bottom:12px;">
              <label style="display:block;font-weight:600;margin-bottom:4px;">Select CSV File</label>
              <input type="file" id="csvFile" accept=".csv,.txt"
                style="width:100%;padding:8px;border-radius:8px;border:1px solid #d1d5db;">
              <small style="display:block;margin-top:4px;color:#6b7280;">
                Supported: Macquarie, ANZ, NAB, ME bank exports (AU)
              </small>
            </div>

            <div class="form-group" style="margin-bottom:12px;">
              <label style="display:block;font-weight:600;margin-bottom:4px;">Account</label>
              <select id="importAccount"
                style="width:100%;padding:8px;border-radius:8px;border:1px solid #d1d5db;">
                <option value="">-- Select Account --</option>
                ${accountOptions}
              </select>
            </div>

            <div class="preview-section" style="display:none;margin-top:12px;">
              <h4 style="margin:0 0 4px;font-size:0.95rem;">Preview (first 5 rows)</h4>
              <div id="csvPreview"
                style="background:#f9fafb;border-radius:8px;padding:8px;border:1px solid #e5e7eb;
                       max-height:200px;overflow-y:auto;font-family:monospace;font-size:0.8rem;"></div>
            </div>
          </div>

          <div id="manualTab" class="tab-content" style="display:none;">
            <div class="form-group" style="margin-bottom:12px;">
              <label style="display:block;font-weight:600;margin-bottom:4px;">Paste Statement Data</label>
              <textarea id="statementText"
                style="width:100%;padding:8px;border-radius:8px;border:1px solid #d1d5db;
                       min-height:180px;font-family:monospace;font-size:0.8rem;"
                placeholder="Paste your statement data here...
Date, Description, Amount
01/12/2025, COLES MELBOURNE, -85.50
02 Dec 2025, AMAZON WEB SERVICES SYDNEY, -1.64"></textarea>
            </div>
          </div>

          <div class="import-actions" style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;">
            <button class="btn btn-secondary" id="cancelImport"
              style="padding:8px 14px;border-radius:999px;border:1px solid #d1d5db;
                     background:#f3f4f6;cursor:pointer;">Cancel</button>
            <button class="btn btn-primary" id="processImport"
              style="padding:8px 14px;border-radius:999px;border:none;
                     background:#2563eb;color:#fff;cursor:pointer;">Process Import</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
