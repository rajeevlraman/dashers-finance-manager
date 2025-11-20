// ============================================================================
// 🧱 cost_base_tracker.js — Property Cost Base Tracker (ATO Compliance Module)
// ----------------------------------------------------------------------------
// Tracks purchase, improvement, and selling costs for CGT and ATO compliance
// Integrated with IndexedDB and property data
// Text-only (no receipts yet)
// ============================================================================

import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES, generateId } from './db.js';
import { html } from './utils/html.js';
import { initPropertiesUI } from './properties.js';

// ============================================================================
// 🎯 Initialize Cost Base Tracker
// ============================================================================
export async function initCostBaseTrackerUI(propertyId = null) {
  console.log('🧱 Cost Base Tracker initialized');

  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <style>
      body { background:#f9fafb;font-family:'Inter',sans-serif;color:#222;margin:0; }
      .costbase-container { padding:16px;display:flex;flex-direction:column;gap:18px; }
      .header { display:flex;justify-content:space-between;align-items:center; }
      .header h2 { margin:0;font-size:1.4rem;font-weight:600; }
      .form-select, .form-input, textarea {
        width:100%;padding:8px;border-radius:6px;border:1px solid #ccc;font-size:0.95rem;
      }
      .btn { border:none;border-radius:6px;padding:8px 14px;cursor:pointer;font-size:0.9rem; }
      .btn-primary { background:#2563eb;color:#fff; }
      .btn-secondary { background:#e5e7eb;color:#111; }
      .record-list { background:#fff;border-radius:12px;box-shadow:0 2px 5px rgba(0,0,0,0.08);padding:12px; }
      .record-item { display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #eee; }
      .record-item:last-child{border-bottom:none;}
      .fab-container { position:fixed;bottom:20px;right:20px;z-index:50; }
      .fab-main { width:56px;height:56px;border-radius:50%;background:#2563eb;color:#fff;
        display:flex;align-items:center;justify-content:center;font-size:1.8rem;border:none;
        box-shadow:0 4px 10px rgba(0,0,0,0.2);cursor:pointer;
      }
      .modal { position:fixed;inset:0;background:rgba(0,0,0,0.5);display:none;align-items:center;justify-content:center;z-index:100; }
      .modal.active { display:flex; }
      .modal-content { background:#fff;border-radius:12px;padding:18px;width:90%;max-width:400px; }
      .modal-content h3 { margin-top:0;font-size:1.2rem; }
      .form-group { margin-bottom:10px; }
    </style>

    <div class="costbase-container">
      <div class="header">
        <h2>📘 Cost Base Tracker</h2>
        ${propertyId ? `<button id="btnBackToProperties" class="btn btn-secondary">⬅️ Back</button>` : ''}
      </div>

      <div class="form-group">
        <label>Property</label>
        <select id="filterProperty" class="form-select"></select>
      </div>

      <div id="costBaseList" class="record-list">Loading records...</div>
    </div>

    <!-- Modal -->
    <div class="modal" id="costBaseModal">
      <div class="modal-content">
        <h3 id="modalTitle">Add Cost Item</h3>
        <form id="costBaseForm">
          <div class="form-group">
            <label>Date</label>
            <input type="date" name="date" class="form-input" required>
          </div>
          <div class="form-group">
            <label>Description</label>
            <input type="text" name="description" class="form-input" required>
          </div>
          <div class="form-group">
            <label>Type</label>
            <select name="type" class="form-select">
              <option value="Purchase">Purchase</option>
              <option value="Improvement">Improvement</option>
              <option value="Selling">Selling</option>
            </select>
          </div>
          <div class="form-group">
            <label>Amount (AUD)</label>
            <input type="number" name="amount" step="0.01" class="form-input" required>
          </div>
          <div class="form-group">
            <label>Classification</label>
            <select name="classification" class="form-select">
              <option value="Capital">Capital (add to cost base)</option>
              <option value="Expense">Expense (deductible)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea name="notes" rows="2"></textarea>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button type="button" class="btn btn-secondary" id="cancelModal">Cancel</button>
            <button type="submit" class="btn btn-primary">💾 Save</button>
          </div>
        </form>
      </div>
    </div>

    <div class="fab-container"><button class="fab-main">＋</button></div>
  `;

  if (propertyId) document.getElementById('btnBackToProperties').onclick = () => initPropertiesUI();

  // Setup property filter
  const properties = await getAllItems(STORE_NAMES.properties);
  const propertySelect = document.getElementById('filterProperty');
  propertySelect.innerHTML = `<option value="">All Properties</option>` + properties.map(p => `
    <option value="${p.id}" ${p.id === propertyId ? 'selected' : ''}>${p.name}</option>`).join('');

  propertySelect.addEventListener('change', e => refreshCostBaseList(e.target.value));

  // FAB and Modal handlers
  const modal = document.getElementById('costBaseModal');
  const form = document.getElementById('costBaseForm');
  const fab = document.querySelector('.fab-main');

  fab.onclick = () => openModal();
  document.getElementById('cancelModal').onclick = () => closeModal();

  form.onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const record = {
      id: generateId(),
      propertyId: propertySelect.value || '',
      date: f.get('date'),
      description: f.get('description'),
      type: f.get('type'),
      amount: parseFloat(f.get('amount')) || 0,
      classification: f.get('classification'),
      notes: f.get('notes'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await addItem(STORE_NAMES.costbase || 'costbase', record);
    closeModal();
    await refreshCostBaseList(propertySelect.value);
  };

  // Load list
  await refreshCostBaseList(propertySelect.value);
}

// ============================================================================
// 🔁 Refresh List
// ============================================================================
async function refreshCostBaseList(propertyId = null) {
  const all = await getAllItems(STORE_NAMES.costbase || 'costbase');
  const filtered = propertyId ? all.filter(r => r.propertyId === propertyId) : all;
  const list = document.getElementById('costBaseList');

  if (!filtered.length) {
    list.innerHTML = `<p style="opacity:0.6;text-align:center;">No cost base records yet.</p>`;
    return;
  }

  list.innerHTML = filtered.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(r => `
    <div class="record-item">
      <div>
        <strong>${r.description}</strong><br>
        <small>${r.type} • ${r.classification}</small>
      </div>
      <div>
        <span>${formatCurrency(r.amount)}</span><br>
        <small>${new Date(r.date).toLocaleDateString('en-AU')}</small>
      </div>
    </div>
  `).join('');
}

// ============================================================================
// 🧩 Modal Helpers
// ============================================================================
function openModal() {
  document.getElementById('costBaseModal').classList.add('active');
  document.getElementById('costBaseForm').reset();
}
function closeModal() {
  document.getElementById('costBaseModal').classList.remove('active');
}

// ============================================================================
// 💰 Utility
// ============================================================================
function formatCurrency(amount, currency = 'AUD') {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount || 0);
}
