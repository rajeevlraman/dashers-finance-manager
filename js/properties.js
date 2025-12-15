// ============================================================================
// 🏠 properties.js — DEBUG VERSION
// ============================================================================

import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES, generateId } from './db.js';
import { initTenantsUI } from './tenants.js';
import { initMaintenanceUI } from './maintenance.js';

export class PropertiesManager {
    constructor() {
        this.properties = [];
        this.tenants = [];
        this.maintenanceLogs = [];
        this.currentFilter = 'all';
        this.currentSort = 'name';
        this.debugLog('🔄 PropertiesManager constructor called');
    }

    // Debug utility
    debugLog(message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        if (data !== null) {
            console.log('📊 Data:', data);
        }
        
        // Also log to debug panel if it exists
        if (window.debugPanel) {
            window.debugPanel.addLog(logMessage);
        }
    }

    async init() {
        this.debugLog('🚀 init() called');
        try {
            await this.loadData();
            this.renderUI();
            this.attachEventListeners();
            this.debugLog('✅ init() completed successfully');
        } catch (error) {
            this.debugLog('❌ init() failed', error);
            throw error;
        }
    }

    async loadData() {
        this.debugLog('📥 Loading data...');
        try {
            [this.properties, this.tenants, this.maintenanceLogs] = await Promise.all([
                getAllItems(STORE_NAMES.properties),
                getAllItems(STORE_NAMES.tenants),
                getAllItems(STORE_NAMES.maintenance)
            ]);
            
            this.debugLog(`✅ Data loaded: ${this.properties.length} properties, ${this.tenants.length} tenants, ${this.maintenanceLogs.length} maintenance logs`);
            this.debugLog('📋 Properties:', this.properties);
        } catch (error) {
            this.debugLog('❌ Error loading data', error);
            throw error;
        }
    }

    renderUI() {
        this.debugLog('🎨 Rendering UI...');
        
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) {
            this.debugLog('❌ mainContent element not found!');
            return;
        }
        
        try {
            mainContent.innerHTML = `
                <div class="properties-container">
                    <div class="properties-header">
                        <h2>🏠 Property Portfolio</h2>
                        <div class="header-actions">
                            <button id="btnNewProperty" class="btn btn-primary">➕ Add Property</button>
                        </div>
                    </div>

                    ${this.renderPortfolioSummary()}

                    ${this.renderQuickActions()}

                    <div class="properties-controls">
                        <select id="filterPropertyType" class="form-select">
                            <option value="all">All Properties</option>
                            <option value="primary">🏠 Primary Residence</option>
                            <option value="investment">💰 Investment Properties</option>
                            <option value="vacation">🌴 Vacation Homes</option>
                            <option value="commercial">🏢 Commercial</option>
                        </select>
                        <select id="sortProperties" class="form-select">
                            <option value="name">Name A-Z</option>
                            <option value="value">Highest Value</option>
                            <option value="type">Property Type</option>
                            <option value="rent">Highest Rent</option>
                        </select>
                    </div>

                    <div class="properties-content">
                        ${this.renderPropertiesGrid()}
                    </div>
                </div>
            `;

            // Render modal separately
            this.renderModal();
            
            this.debugLog('✅ UI rendered successfully');
            this.debugLog('🔍 Checking DOM elements...');
            this.checkDOMElements();
            
        } catch (error) {
            this.debugLog('❌ Error rendering UI', error);
        }
    }

    renderModal() {
        this.debugLog('🪟 Rendering modal...');
        
        const modalContainer = document.getElementById('modalContainer');
        if (!modalContainer) {
            // Create modal container if it doesn't exist
            const container = document.createElement('div');
            container.id = 'modalContainer';
            document.body.appendChild(container);
            this.debugLog('➕ Created modal container');
        }
        
        document.getElementById('modalContainer').innerHTML = this.renderPropertyModal();
        this.debugLog('✅ Modal HTML rendered');
    }

    checkDOMElements() {
        const criticalElements = [
            'btnNewProperty',
            'filterPropertyType', 
            'sortProperties',
            'propertyModal',
            'propertyForm',
            'closeModal'
        ];
        
        criticalElements.forEach(id => {
            const element = document.getElementById(id);
            this.debugLog(element ? `✅ Found #${id}` : `❌ Missing #${id}`);
        });
    }

    renderPortfolioSummary() {
        this.debugLog('📊 Rendering portfolio summary...');
        try {
            // ... existing portfolio summary code ...
            return '...'; // Same as before
        } catch (error) {
            this.debugLog('❌ Error in renderPortfolioSummary', error);
            return '<div class="error">Error loading portfolio summary</div>';
        }
    }

    renderQuickActions() {
        return '...'; // Same as before
    }

    renderPropertiesGrid() {
        this.debugLog('🏘️ Rendering properties grid...');
        try {
            if (this.properties.length === 0) {
                this.debugLog('📭 No properties found, rendering empty state');
                return this.renderEmptyState();
            }

            const filteredProperties = this.getFilteredProperties();
            const sortedProperties = this.getSortedProperties(filteredProperties);
            
            this.debugLog(`📈 Showing ${sortedProperties.length} properties (filtered from ${this.properties.length})`);
            
            const cardsHtml = sortedProperties.map(property => this.renderPropertyCard(property)).join('');
            
            return `<div class="properties-grid">${cardsHtml}</div>`;
        } catch (error) {
            this.debugLog('❌ Error rendering properties grid', error);
            return '<div class="error">Error loading properties</div>';
        }
    }

    renderPropertyCard(p) {
        try {
            // ... existing card rendering code ...
            return '...'; // Same as before
        } catch (error) {
            this.debugLog(`❌ Error rendering property card for ${p.id}`, error);
            return '<div class="property-card error">Error loading property</div>';
        }
    }

    renderPropertyModal() {
        this.debugLog('📝 Rendering property modal HTML...');
        return `
            <div id="propertyModal" class="modal-overlay" style="display: none;">
                <div class="modal">
                    <div class="modal-header">
                        <h3 id="modalTitle">Add New Property</h3>
                        <button class="btn-close" id="closeModal">✕</button>
                    </div>
                    <form id="propertyForm" class="modal-form">
                        <input type="hidden" id="editPropertyId" value="">
                        
                        <div class="form-group">
                            <label>Property Type</label>
                            <select id="propertyType" class="form-select" required>
                                <option value="primary">🏠 Primary Residence</option>
                                <option value="investment">💰 Investment Property</option>
                                <option value="vacation">🌴 Vacation Home</option>
                                <option value="commercial">🏢 Commercial Property</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Property Name</label>
                            <input type="text" id="propertyName" class="form-input" 
                                   placeholder="e.g., Family Home, City Apartment" required>
                        </div>

                        <div class="form-group">
                            <label>Address</label>
                            <input type="text" id="propertyAddress" class="form-input" 
                                   placeholder="Full property address" required>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Purchase Price</label>
                                <input type="number" id="purchasePrice" class="form-input" step="0.01" min="0" required>
                            </div>
                            <div class="form-group">
                                <label>Current Market Value</label>
                                <input type="number" id="currentValue" class="form-input" step="0.01" min="0" required>
                            </div>
                        </div>

                        <div class="form-group" id="rentField">
                            <label>Monthly Rent</label>
                            <input type="number" id="propertyRent" class="form-input" step="0.01" min="0" value="0">
                        </div>

                        <div class="form-group" id="mortgageField" style="display: none;">
                            <label>Monthly Mortgage Payment</label>
                            <input type="number" id="propertyMortgage" class="form-input" step="0.01" min="0" value="0">
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">💾 Save Property</button>
                            <button type="button" class="btn btn-secondary" id="cancelProperty">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    renderEmptyState() {
        return '...'; // Same as before
    }

    attachStaticEventListeners() {
        this.debugLog('🎯 Attaching static event listeners...');
        
        const elements = {
            'quickAddProperty': () => this.openPropertyForm(),
            'quickAddInvestment': () => this.openPropertyForm('investment'),
            'quickExport': () => this.exportPortfolio(),
            'emptyAddProperty': () => this.openPropertyForm(),
            'btnNewProperty': () => this.openPropertyForm()
        };

        Object.entries(elements).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', handler);
                this.debugLog(`✅ Attached listener to #${id}`);
            } else {
                this.debugLog(`⚠️  Could not find #${id} for event listener`);
            }
        });

        // Filters and sorting
        const filterSelect = document.getElementById('filterPropertyType');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.debugLog(`🔍 Filter changed to: ${e.target.value}`);
                this.currentFilter = e.target.value;
                this.renderUI();
            });
            this.debugLog('✅ Attached filter listener');
        }

        const sortSelect = document.getElementById('sortProperties');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.debugLog(`📊 Sort changed to: ${e.target.value}`);
                this.currentSort = e.target.value;
                this.renderUI();
            });
            this.debugLog('✅ Attached sort listener');
        }
    }

    attachEventListeners() {
        this.debugLog('🔗 Attaching all event listeners...');
        
        this.attachStaticEventListeners();

        // Property actions - use event delegation
        document.addEventListener('click', (e) => {
            const button = e.target.closest('[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const propertyId = button.dataset.id;
            const property = this.properties.find(p => p.id === propertyId);

            this.debugLog(`🖱️  Clicked action: ${action} for property: ${propertyId}`);
            
            if (!property) {
                this.debugLog(`❌ Property ${propertyId} not found!`);
                return;
            }

            switch (action) {
                case 'edit':
                    this.debugLog(`✏️  Editing property: ${property.name}`);
                    this.openPropertyForm(null, property);
                    break;
                case 'delete':
                    this.debugLog(`🗑️  Deleting property: ${property.name}`);
                    this.deleteProperty(property);
                    break;
                case 'view-tenants':
                    this.debugLog(`👤 Viewing tenants for: ${property.name}`);
                    initTenantsUI(propertyId);
                    break;
                case 'view-maintenance':
                    this.debugLog(`🧰 Viewing maintenance for: ${property.name}`);
                    initMaintenanceUI(propertyId);
                    break;
                default:
                    this.debugLog(`❓ Unknown action: ${action}`);
            }
        });

        this.setupModalEvents();
        this.debugLog('✅ All event listeners attached');
    }

    setupModalEvents() {
        this.debugLog('🪟 Setting up modal events...');
        
        // Check if modal exists
        const modal = document.getElementById('propertyModal');
        const form = document.getElementById('propertyForm');
        const typeSelect = document.getElementById('propertyType');
        
        this.debugLog(`🔍 Modal found: ${!!modal}, Form found: ${!!form}, Type select found: ${!!typeSelect}`);

        if (!modal || !form || !typeSelect) {
            this.debugLog('❌ Critical modal elements missing!');
            return;
        }

        // Toggle rent/mortgage fields based on property type
        typeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            this.debugLog(`🏠 Property type changed to: ${type}`);
            
            const rentField = document.getElementById('rentField');
            const mortgageField = document.getElementById('mortgageField');
            
            if (type === 'primary') {
                rentField.style.display = 'none';
                mortgageField.style.display = 'block';
                this.debugLog('📊 Showing mortgage field, hiding rent field');
            } else {
                rentField.style.display = 'block';
                mortgageField.style.display = 'none';
                this.debugLog('📊 Showing rent field, hiding mortgage field');
            }
        });

        // Close modal when clicking X
        const closeBtn = document.getElementById('closeModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.debugLog('❌ Close button clicked');
                this.closeModal();
            });
        }

        // Close modal when clicking cancel
        const cancelBtn = document.getElementById('cancelProperty');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.debugLog('🚫 Cancel button clicked');
                this.closeModal();
            });
        }

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.debugLog('⬜ Clicked outside modal');
                this.closeModal();
            }
        });

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            this.debugLog('📤 Form submitted');
            await this.saveProperty();
            this.closeModal();
        });

        this.debugLog('✅ Modal events setup complete');
    }

    openPropertyForm(prefillType = null, property = null) {
        this.debugLog('📋 Opening property form...', { prefillType, property });
        
        const modal = document.getElementById('propertyModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('propertyForm');
        const typeSelect = document.getElementById('propertyType');

        if (!modal || !title || !form || !typeSelect) {
            this.debugLog('❌ Modal elements missing!', { modal: !!modal, title: !!title, form: !!form, typeSelect: !!typeSelect });
            return;
        }

        // Reset form
        form.reset();
        this.debugLog('🔄 Form reset');

        if (property) {
            title.textContent = 'Edit Property';
            document.getElementById('editPropertyId').value = property.id;
            document.getElementById('propertyName').value = property.name || '';
            document.getElementById('propertyAddress').value = property.address || '';
            document.getElementById('purchasePrice').value = property.purchasePrice || '';
            document.getElementById('currentValue').value = property.currentValue || '';
            document.getElementById('propertyType').value = property.propertyType || 'primary';
            document.getElementById('propertyRent').value = property.rent || '0';
            document.getElementById('propertyMortgage').value = property.mortgage || '0';
            this.debugLog(`📝 Editing property: ${property.name}`);
        } else {
            title.textContent = 'Add New Property';
            document.getElementById('editPropertyId').value = '';
            document.getElementById('propertyRent').value = '0';
            document.getElementById('propertyMortgage').value = '0';
            
            if (prefillType) {
                document.getElementById('propertyType').value = prefillType;
                this.debugLog(`🎯 Prefilled type: ${prefillType}`);
            }
        }

        // Trigger rent/mortgage visibility
        typeSelect.dispatchEvent(new Event('change'));

        // Show modal
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
        
        this.debugLog('✅ Modal displayed');
        
        // Focus on first input
        setTimeout(() => {
            document.getElementById('propertyName').focus();
            this.debugLog('🎯 Focus set to property name');
        }, 50);
    }

    closeModal() {
        this.debugLog('🔒 Closing modal...');
        
        const modal = document.getElementById('propertyModal');
        if (!modal) {
            this.debugLog('❌ Modal not found for closing');
            return;
        }

        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.getElementById('propertyForm').reset();
            this.debugLog('✅ Modal hidden and form reset');
        }, 300);
    }

    async saveProperty() {
        this.debugLog('💾 Saving property...');
        
        const form = document.getElementById('propertyForm');
        const propertyId = document.getElementById('editPropertyId').value;
        const type = document.getElementById('propertyType').value;

        this.debugLog('📄 Form data:', {
            propertyId,
            type,
            name: document.getElementById('propertyName').value,
            address: document.getElementById('propertyAddress').value
        });

        const propertyData = {
            id: propertyId || generateId(),
            name: document.getElementById('propertyName').value,
            address: document.getElementById('propertyAddress').value,
            purchasePrice: parseFloat(document.getElementById('purchasePrice').value) || 0,
            currentValue: parseFloat(document.getElementById('currentValue').value) || 0,
            propertyType: type,
            rent: type !== 'primary' ? parseFloat(document.getElementById('propertyRent').value) || 0 : 0,
            mortgage: type === 'primary' ? parseFloat(document.getElementById('propertyMortgage').value) || 0 : 0,
            createdAt: propertyId ? this.properties.find(p => p.id === propertyId)?.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.debugLog('📦 Property data to save:', propertyData);

        try {
            if (propertyId) {
                this.debugLog(`🔄 Updating property: ${propertyId}`);
                await updateItem(STORE_NAMES.properties, propertyData);
            } else {
                this.debugLog(`➕ Adding new property`);
                await addItem(STORE_NAMES.properties, propertyData);
            }
            
            this.debugLog('✅ Property saved successfully');
            await this.init(); // Refresh UI
            
        } catch (error) {
            this.debugLog('❌ Error saving property', error);
            alert('Error saving property. Please try again.');
        }
    }

    async deleteProperty(property) {
        this.debugLog(`🗑️  Delete property requested: ${property.name}`);
        
        if (!confirm(`Delete "${property.name}"? This will also remove related tenants and maintenance records.`)) {
            this.debugLog('🚫 Delete cancelled by user');
            return;
        }

        try {
            this.debugLog(`🔥 Deleting property: ${property.id}`);
            await deleteItem(STORE_NAMES.properties, property.id);
            this.debugLog('✅ Property deleted successfully');
            await this.init(); // Refresh UI
        } catch (error) {
            this.debugLog('❌ Error deleting property', error);
            alert('Error deleting property.');
        }
    }

    // Helper methods (same as before but with debug logs)
    getFilteredProperties() {
        const filtered = this.currentFilter === 'all' 
            ? this.properties 
            : this.properties.filter(p => p.propertyType === this.currentFilter);
        
        this.debugLog(`🔍 Filtered properties: ${filtered.length} of ${this.properties.length}`);
        return filtered;
    }

    getSortedProperties(properties) {
        const sorted = [...properties].sort((a, b) => {
            switch (this.currentSort) {
                case 'name': return (a.name || '').localeCompare(b.name || '');
                case 'value': return (parseFloat(b.currentValue) || 0) - (parseFloat(a.currentValue) || 0);
                case 'rent': return (parseFloat(b.rent) || 0) - (parseFloat(a.rent) || 0);
                case 'type': return (a.propertyType || 'primary').localeCompare(b.propertyType || 'primary');
                default: return (a.name || '').localeCompare(b.name || '');
            }
        });
        
        this.debugLog(`📊 Sorted ${sorted.length} properties by ${this.currentSort}`);
        return sorted;
    }

    // ... rest of helper methods remain the same ...

    // Debug panel creation (optional)
    createDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'debugPanel';
        panel.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 400px;
            height: 300px;
            background: rgba(0, 0, 0, 0.9);
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            overflow-y: auto;
            border: 1px solid #0f0;
            z-index: 9999;
            display: none;
        `;
        
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = '🐛 Debug';
        toggleBtn.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            z-index: 10000;
            padding: 5px 10px;
            background: #333;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        `;
        
        toggleBtn.addEventListener('click', () => {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
        
        document.body.appendChild(panel);
        document.body.appendChild(toggleBtn);
        
        window.debugPanel = {
            addLog: (message) => {
                const logEntry = document.createElement('div');
                logEntry.textContent = message;
                panel.appendChild(logEntry);
                panel.scrollTop = panel.scrollHeight;
            }
        };
        
        this.debugLog('🐛 Debug panel created');
    }
}

// Enhanced init with debug
export async function initPropertiesUI() {
    console.log('🚀 === PROPERTIES UI INITIALIZATION ===');
    
    // Create debug panel
    const manager = new PropertiesManager();
    
    // Optional: uncomment to enable debug panel
    // manager.createDebugPanel();
    
    try {
        await manager.init();
        console.log('✅ Properties UI initialized successfully');
    } catch (error) {
        console.error('❌ Properties UI initialization failed:', error);
        throw error;
    }
}