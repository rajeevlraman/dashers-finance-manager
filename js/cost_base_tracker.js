// ============================================================================
// 🧱 cost_base_tracker.js — ENHANCED VERSION
// ============================================================================

import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES, generateId } from './db.js';
import { html } from './utils/html.js';
import { initPropertiesUI } from './properties.js';
export class CostBaseTracker {
    constructor() {
        this.records = [];
        this.properties = [];
        this.selectedProperty = null;
        this.editingRecord = null;
    }

    async init(propertyId = null) {
        await this.loadData();
        this.selectedProperty = propertyId;
        this.renderUI();
        this.attachEventListeners();
    }

  async loadData() {
    try {
        const [records, properties] = await Promise.all([
            getAllItems(STORE_NAMES.costbase || 'costbase'),
            getAllItems(STORE_NAMES.properties)
        ]);
        
        // Ensure we always have arrays
        this.records = Array.isArray(records) ? records : [];
        this.properties = Array.isArray(properties) ? properties : [];
        
        console.log('Loaded data:', {
            recordsCount: this.records.length,
            propertiesCount: this.properties.length
        });
        
    } catch (error) {
        console.error('Error loading cost base data:', error);
        // Set defaults to prevent errors
        this.records = [];
        this.properties = [];
    }
}
    renderUI() {
        const mainContent = document.getElementById('mainContent');
        
        mainContent.innerHTML = `
            <div class="costbase-container">
                <div class="costbase-header">
                    <h2>📘 Cost Base Tracker <small>ATO Compliance</small></h2>
                    ${this.selectedProperty ? `
                        <button class="btn btn-secondary" id="btnBackToProperties">
                            ⬅️ Back to Properties
                        </button>
                    ` : ''}
                </div>

                ${this.renderStatsSummary()}

                <div class="costbase-controls">
                    <div class="property-selector">
                        <label>Property</label>
                        <select id="filterProperty" class="form-select">
                            <option value="">All Properties</option>
                            ${this.properties.map(p => `
                                <option value="${p.id}" ${p.id === this.selectedProperty ? 'selected' : ''}>
                                    ${p.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="costbase-actions">
                        <button class="btn btn-primary" id="btnAddRecord">➕ Add Record</button>
                        <button class="btn btn-secondary" id="btnExportReport">📊 Export Report</button>
                    </div>
                </div>

                ${this.renderTaxSummary()}

                <div class="costbase-content">
                    <div class="records-section">
                        <h3>📋 Cost Records</h3>
                        <div id="costBaseList" class="records-list">
                            Loading records...
                        </div>
                    </div>

                    <div class="sidebar">
                        <h3>ℹ️ ATO Guidelines</h3>
                        <div class="guidelines">
                            <div class="guideline-item">
                                <h4>✅ Capital Costs</h4>
                                <p>Add to cost base: purchase price, legal fees, stamp duty, 
                                improvements, borrowing costs.</p>
                            </div>
                            <div class="guideline-item">
                                <h4>❌ Non-Capital</h4>
                                <p>Not added to cost base: repairs, maintenance, insurance, 
                                rates, interest on loans.</p>
                            </div>
                            <div class="guideline-item">
                                <h4>📅 CGT Discount</h4>
                                <p>Hold property for 12+ months to qualify for 50% CGT discount.</p>
                            </div>
                        </div>
                        
                        <div class="calculation-example">
                            <h4>🧮 Cost Base Calculation</h4>
                            <div class="calculation">
                                <div>Purchase Price: <span>$500,000</span></div>
                                <div>+ Capital Improvements: <span>$50,000</span></div>
                                <div>+ Selling Costs: <span>$25,000</span></div>
                                <div class="total">= Cost Base: <span>$575,000</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal -->
            ${this.renderModal()}
        `;

        this.refreshRecordsList();
    }

    renderStatsSummary() {
        const filteredRecords = this.getFilteredRecords();
        
        const totalCapital = filteredRecords
            .filter(r => r.classification === 'Capital')
            .reduce((sum, r) => sum + (r.amount || 0), 0);
        
        const totalExpense = filteredRecords
            .filter(r => r.classification === 'Expense')
            .reduce((sum, r) => sum + (r.amount || 0), 0);
        
        const purchaseCosts = filteredRecords
            .filter(r => r.type === 'Purchase')
            .reduce((sum, r) => sum + (r.amount || 0), 0);
        
        const improvementCosts = filteredRecords
            .filter(r => r.type === 'Improvement')
            .reduce((sum, r) => sum + (r.amount || 0), 0);

        return `
            <div class="stats-summary">
                <div class="stat-card primary">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.formatCurrency(totalCapital)}</div>
                        <div class="stat-label">Capital Costs</div>
                    </div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-icon">💸</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.formatCurrency(totalExpense)}</div>
                        <div class="stat-label">Deductible Expenses</div>
                    </div>
                </div>
                <div class="stat-card info">
                    <div class="stat-icon">🏠</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.formatCurrency(purchaseCosts)}</div>
                        <div class="stat-label">Purchase Costs</div>
                    </div>
                </div>
                <div class="stat-card success">
                    <div class="stat-icon">🔨</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.formatCurrency(improvementCosts)}</div>
                        <div class="stat-label">Improvements</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTaxSummary() {
        const filteredRecords = this.getFilteredRecords();
        const property = this.properties.find(p => p.id === this.selectedProperty);
        
        if (!property || !property.purchasePrice) return '';

        const capitalCosts = filteredRecords
            .filter(r => r.classification === 'Capital')
            .reduce((sum, r) => sum + (r.amount || 0), 0);
        
        const totalCostBase = property.purchasePrice + capitalCosts;
        const estimatedGain = property.currentValue 
            ? property.currentValue - totalCostBase 
            : 0;
        const cgtDiscount = estimatedGain * 0.5; // Assuming held >12 months

        return `
            <div class="tax-summary">
                <h3>📊 Tax Summary</h3>
                <div class="tax-calculation">
                    <div class="tax-row">
                        <span>Purchase Price</span>
                        <span>${this.formatCurrency(property.purchasePrice)}</span>
                    </div>
                    <div class="tax-row">
                        <span>+ Capital Costs</span>
                        <span>${this.formatCurrency(capitalCosts)}</span>
                    </div>
                    <div class="tax-row total">
                        <span>Cost Base</span>
                        <span>${this.formatCurrency(totalCostBase)}</span>
                    </div>
                    <div class="tax-row">
                        <span>Current Value</span>
                        <span>${this.formatCurrency(property.currentValue || 0)}</span>
                    </div>
                    <div class="tax-row gain">
                        <span>Estimated Capital Gain</span>
                        <span>${this.formatCurrency(estimatedGain)}</span>
                    </div>
                    <div class="tax-row discount">
                        <span>CGT Discount (50%)</span>
                        <span>${this.formatCurrency(cgtDiscount)}</span>
                    </div>
                    <div class="tax-row taxable">
                        <span>Taxable Gain</span>
                        <span>${this.formatCurrency(estimatedGain - cgtDiscount)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderModal() {
        return `
            <div class="modal-overlay" id="costBaseModal" style="display: none;">
                <div class="modal">
                    <div class="modal-header">
                        <h3 id="modalTitle">${this.editingRecord ? '✏️ Edit' : '➕ Add'} Cost Record</h3>
                        <button class="btn-close" id="closeModal">✕</button>
                    </div>
                    
                    <form id="costBaseForm" class="modal-form">
                        <input type="hidden" id="recordId" value="${this.editingRecord?.id || ''}">
                        
                        <div class="form-group">
                            <label>Property</label>
                            <select name="propertyId" class="form-select" ${this.selectedProperty ? 'disabled' : ''}>
                                <option value="">Select Property</option>
                                ${this.properties.map(p => `
                                    <option value="${p.id}" 
                                        ${(this.editingRecord?.propertyId === p.id || this.selectedProperty === p.id) ? 'selected' : ''}>
                                        ${p.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Date</label>
                                <input type="date" name="date" class="form-input" 
                                       value="${this.editingRecord?.date || new Date().toISOString().slice(0, 10)}" required>
                            </div>
                            <div class="form-group">
                                <label>Amount (AUD)</label>
                                <input type="number" name="amount" step="0.01" class="form-input" 
                                       value="${this.editingRecord?.amount || ''}" required>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Type</label>
                                <select name="type" class="form-select">
                                    <option value="Purchase" ${this.editingRecord?.type === 'Purchase' ? 'selected' : ''}>
                                        Purchase Cost
                                    </option>
                                    <option value="Improvement" ${this.editingRecord?.type === 'Improvement' ? 'selected' : ''}>
                                        Improvement
                                    </option>
                                    <option value="Selling" ${this.editingRecord?.type === 'Selling' ? 'selected' : ''}>
                                        Selling Cost
                                    </option>
                                    <option value="Legal">Legal Fees</option>
                                    <option value="StampDuty">Stamp Duty</option>
                                    <option value="Borrowing">Borrowing Costs</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Classification</label>
                                <select name="classification" class="form-select">
                                    <option value="Capital" ${this.editingRecord?.classification === 'Capital' ? 'selected' : ''}>
                                        Capital (adds to cost base)
                                    </option>
                                    <option value="Expense" ${this.editingRecord?.classification === 'Expense' ? 'selected' : ''}>
                                        Expense (deductible)
                                    </option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Description</label>
                            <input type="text" name="description" class="form-input" 
                                   value="${this.editingRecord?.description || ''}" 
                                   placeholder="e.g., Stamp duty, Renovation, Legal fees" required>
                        </div>
                        
                        <div class="form-group">
                            <label>ATO Category</label>
                            <select name="atoCategory" class="form-select">
                                <option value="">-- Select ATO Category --</option>
                                <option value="Stamp Duty" ${this.editingRecord?.atoCategory === 'Stamp Duty' ? 'selected' : ''}>
                                    Stamp Duty
                                </option>
                                <option value="Legal Fees" ${this.editingRecord?.atoCategory === 'Legal Fees' ? 'selected' : ''}>
                                    Legal & Conveyancing
                                </option>
                                <option value="Renovation" ${this.editingRecord?.atoCategory === 'Renovation' ? 'selected' : ''}>
                                    Capital Improvements
                                </option>
                                <option value="Borrowing Costs" ${this.editingRecord?.atoCategory === 'Borrowing Costs' ? 'selected' : ''}>
                                    Borrowing Costs
                                </option>
                                <option value="Agent Commission" ${this.editingRecord?.atoCategory === 'Agent Commission' ? 'selected' : ''}>
                                    Agent Commission
                                </option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea name="notes" rows="3" class="form-input" 
                                      placeholder="Additional details, reference numbers...">${this.editingRecord?.notes || ''}</textarea>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                ${this.editingRecord ? '💾 Update Record' : '💾 Save Record'}
                            </button>
                            <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
                            ${this.editingRecord ? `
                                <button type="button" class="btn btn-danger" id="deleteBtn">🗑️ Delete</button>
                            ` : ''}
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Property filter
        document.getElementById('filterProperty')?.addEventListener('change', (e) => {
            this.selectedProperty = e.target.value || null;
            this.refreshRecordsList();
        });

        // Add record button
        document.getElementById('btnAddRecord')?.addEventListener('click', () => {
            this.editingRecord = null;
            this.openModal();
        });

        // Export report
        document.getElementById('btnExportReport')?.addEventListener('click', () => {
            this.exportReport();
        });

        // Back to properties
        document.getElementById('btnBackToProperties')?.addEventListener('click', () => {
            // You'll need to import and call initPropertiesUI
        });

        // Modal handlers will be attached when modal opens
    }

async refreshRecordsList() {
    const filteredRecords = this.getFilteredRecords();
    const list = document.getElementById('costBaseList');

    if (!list) return; // Safety check
    
    if (!filteredRecords || filteredRecords.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <h4>No Cost Records</h4>
                <p>Start tracking your property's cost base for ATO compliance.</p>
                <button class="btn btn-primary" id="btnAddFirstRecord">➕ Add First Record</button>
            </div>
        `;
        document.getElementById('btnAddFirstRecord')?.addEventListener('click', () => {
            this.editingRecord = null;
            this.openModal();
        });
        return;
    }

    // Use safe rendering with null check
    list.innerHTML = filteredRecords
        .filter(record => record && record.id) // Filter out invalid records
        .map(record => this.renderRecordItem(record))
        .join('');
    
    // Attach edit/delete handlers
    list.querySelectorAll('.record-action').forEach(btn => {
        const action = btn.dataset.action;
        const recordId = btn.dataset.id;
        const record = filteredRecords.find(r => r && r.id === recordId);
        
        if (!record) return; // Skip if record not found
        
        btn.addEventListener('click', () => {
            if (action === 'edit') {
                this.editingRecord = record;
                this.openModal();
            } else if (action === 'delete') {
                this.deleteRecord(record);
            }
        });
    });
}

    renderRecordItem(record) {
          // Add null checks for record and its properties
        if (!record) return '';
        const property = this.properties.find(p => p.id === record.propertyId);
        const typeIcons = {
            'Purchase': '🏠',
            'Improvement': '🔨', 
            'Selling': '💰',
            'Legal': '⚖️',
            'StampDuty': '📄',
            'Borrowing': '🏦',
            'Other': '📝'
        };

        // Safely get classification with default
        const classification = record.classification || 'Other';
        const type = record.type || 'Other';
        const description = record.description || 'No description';
        const amount = parseFloat(record.amount) || 0;
        const date = record.date ? new Date(record.date) : new Date();

        return `
            <div class="record-item ${record.classification.toLowerCase()}">
                <div class="record-main">
                    <div class="record-icon">${typeIcons[record.type] || '📝'}</div>
                    <div class="record-details">
                        <div class="record-header">
                            <h4 class="record-title">${record.description}</h4>
                            <span class="record-amount ${record.classification.toLowerCase()}">
                                ${record.classification === 'Capital' ? '+' : '-'}${this.formatCurrency(record.amount)}
                            </span>
                        </div>
                        <div class="record-meta">
                            <span class="record-type">${typeIcons[record.type] || '📝'} ${record.type}</span>
                            <span class="record-classification ${record.classification.toLowerCase()}">
                                ${record.classification}
                            </span>
                            ${property ? `<span class="record-property">🏠 ${property.name}</span>` : ''}
                            <span class="record-date">📅 ${new Date(record.date).toLocaleDateString('en-AU')}</span>
                        </div>
                        ${record.notes ? `<p class="record-notes">${record.notes}</p>` : ''}
                        ${record.atoCategory ? `<span class="record-ato">ATO: ${record.atoCategory}</span>` : ''}
                    </div>
                </div>
                <div class="record-actions">
                    <button class="record-action" data-action="edit" data-id="${record.id}" title="Edit">
                        ✏️
                    </button>
                    <button class="record-action" data-action="delete" data-id="${record.id}" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }

    openModal() {
        const modal = document.getElementById('costBaseModal');
        modal.style.display = 'flex';
        
        // Re-render modal with editing data
        const modalContainer = modal.querySelector('.modal');
        modalContainer.innerHTML = this.renderModal().match(/<div class="modal">([\s\S]*?)<\/div>/)[0];
        
        this.attachModalHandlers();
    }

    attachModalHandlers() {
        const modal = document.getElementById('costBaseModal');
        const form = document.getElementById('costBaseForm');
        const closeBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        const deleteBtn = document.getElementById('deleteBtn');

        // Close modal
        [closeBtn, cancelBtn].forEach(btn => {
            btn?.addEventListener('click', () => {
                modal.style.display = 'none';
                this.editingRecord = null;
            });
        });

        // Delete record
        deleteBtn?.addEventListener('click', async () => {
            if (confirm('Delete this cost record?')) {
                await deleteItem(STORE_NAMES.costbase || 'costbase', this.editingRecord.id);
                modal.style.display = 'none';
                this.editingRecord = null;
                await this.loadData();
                this.refreshRecordsList();
            }
        });

        // Form submission
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            const recordData = {
                id: document.getElementById('recordId').value || generateId(),
                propertyId: formData.get('propertyId'),
                date: formData.get('date'),
                description: formData.get('description'),
                type: formData.get('type'),
                amount: parseFloat(formData.get('amount')),
                classification: formData.get('classification'),
                atoCategory: formData.get('atoCategory'),
                notes: formData.get('notes'),
                updatedAt: new Date().toISOString()
            };

            if (this.editingRecord) {
                // Update existing
                recordData.createdAt = this.editingRecord.createdAt;
                await updateItem(STORE_NAMES.costbase || 'costbase', recordData);
            } else {
                // Add new
                recordData.createdAt = new Date().toISOString();
                await addItem(STORE_NAMES.costbase || 'costbase', recordData);
            }

            modal.style.display = 'none';
            this.editingRecord = null;
            await this.loadData();
            this.refreshRecordsList();
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                this.editingRecord = null;
            }
        });
    }

    async deleteRecord(record) {
        if (!confirm(`Delete "${record.description}"?`)) return;
        
        await deleteItem(STORE_NAMES.costbase || 'costbase', record.id);
        await this.loadData();
        this.refreshRecordsList();
    }

    exportReport() {
        const filteredRecords = this.getFilteredRecords();
        const property = this.selectedProperty 
            ? this.properties.find(p => p.id === this.selectedProperty)
            : null;
        
        // Create CSV content
        let csv = 'ATO Cost Base Report\n\n';
        
        if (property) {
            csv += `Property: ${property.name}\n`;
            csv += `Address: ${property.address || 'N/A'}\n`;
            csv += `Date: ${new Date().toLocaleDateString('en-AU')}\n\n`;
        }
        
        csv += 'Date,Description,Type,Classification,ATO Category,Amount,Notes\n';
        
        filteredRecords.forEach(record => {
            csv += `"${record.date}","${record.description}","${record.type}",`;
            csv += `"${record.classification}","${record.atoCategory || ''}",`;
            csv += `"${record.amount}","${record.notes || ''}"\n`;
        });
        
        // Summary
        csv += '\n\nSUMMARY\n';
        csv += 'Capital Costs,Expenses,Purchase Costs,Improvements\n';
        
        const capital = filteredRecords.filter(r => r.classification === 'Capital').reduce((sum, r) => sum + r.amount, 0);
        const expenses = filteredRecords.filter(r => r.classification === 'Expense').reduce((sum, r) => sum + r.amount, 0);
        const purchase = filteredRecords.filter(r => r.type === 'Purchase').reduce((sum, r) => sum + r.amount, 0);
        const improvements = filteredRecords.filter(r => r.type === 'Improvement').reduce((sum, r) => sum + r.amount, 0);
        
        csv += `${capital},${expenses},${purchase},${improvements}\n`;
        
        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cost-base-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

getFilteredRecords() {
    // Ensure we have valid records array
    if (!Array.isArray(this.records)) {
        console.warn('Records array is not valid, returning empty array');
        return [];
    }
    
    // If no records or empty array, return empty
    if (!this.records.length) {
        return [];
    }
    
    // Filter by property if selected
    return this.selectedProperty
        ? this.records.filter(r => r && r.propertyId === this.selectedProperty)
        : this.records.filter(r => r); // Filter out any null/undefined records
}
formatCurrency(amount) {
    const numAmount = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD'
    }).format(numAmount);
}
}

// Backwards compatibility
export async function initCostBaseTrackerUI(propertyId = null) {
    const tracker = new CostBaseTracker();
    await tracker.init(propertyId);
}