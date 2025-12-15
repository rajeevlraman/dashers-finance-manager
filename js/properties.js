// ============================================================================
// 🏠 properties.js — FIXED VERSION
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
    }

        async init() {
            await this.loadData();
            this.renderUI();
            this.attachEventListeners();
        }

    async loadData() {
        [this.properties, this.tenants, this.maintenanceLogs] = await Promise.all([
            getAllItems(STORE_NAMES.properties),
            getAllItems(STORE_NAMES.tenants),
            getAllItems(STORE_NAMES.maintenance)
        ]);
    }

    renderUI() {
        const mainContent = document.getElementById('mainContent');
        
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

                ${this.renderPropertyModal()}
            </div>
        `;

        //this.attachStaticEventListeners();
    }

    renderPortfolioSummary() {
        // Ensure we have actual numbers, not promises
        const investmentProps = this.properties.filter(p => p.propertyType === 'investment');
        const primaryProps = this.properties.filter(p => p.propertyType === 'primary');
        const vacationProps = this.properties.filter(p => p.propertyType === 'vacation');
        const commercialProps = this.properties.filter(p => p.propertyType === 'commercial');
        
        const totalPortfolioValue = this.properties.reduce((sum, p) => sum + (parseFloat(p.currentValue) || 0), 0);
        const investmentValue = investmentProps.reduce((sum, p) => sum + (parseFloat(p.currentValue) || 0), 0);
        const monthlyRent = investmentProps.reduce((sum, p) => sum + (parseFloat(p.rent) || 0), 0);
        const totalMortgage = primaryProps.reduce((sum, p) => sum + (parseFloat(p.mortgage) || 0), 0);

        return `
            <div class="portfolio-summary">
                <div class="stats-cards">
                    <div class="stat-card primary">
                        <div class="stat-icon">🏠</div>
                        <div class="stat-content">
                            <div class="stat-value">${this.properties.length}</div>
                            <div class="stat-label">Total Properties</div>
                            <div class="stat-breakdown">
                                <span>${primaryProps.length} Primary</span>
                                <span>${investmentProps.length} Investment</span>
                            </div>
                        </div>
                    </div>
                    <div class="stat-card investment">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <div class="stat-value">${this.formatCurrency(totalPortfolioValue)}</div>
                            <div class="stat-label">Portfolio Value</div>
                            <div class="stat-breakdown">
                                <span>${this.formatCurrency(investmentValue)} Investments</span>
                            </div>
                        </div>
                    </div>
                    <div class="stat-card success">
                        <div class="stat-icon">📥</div>
                        <div class="stat-content">
                            <div class="stat-value">${this.formatCurrency(monthlyRent)}</div>
                            <div class="stat-label">Monthly Rent</div>
                            <div class="stat-subtext">From ${investmentProps.length} properties</div>
                        </div>
                    </div>
                    <div class="stat-card warning">
                        <div class="stat-icon">🏦</div>
                        <div class="stat-content">
                            <div class="stat-value">${this.formatCurrency(totalMortgage)}</div>
                            <div class="stat-label">Monthly Mortgage</div>
                            <div class="stat-subtext">Primary residence</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderQuickActions() {
        return `
            <div class="horizontal-quick-actions">
                <div class="quick-action-item primary" id="quickAddProperty">
                    <span class="quick-action-icon">➕</span>
                    <span class="quick-action-text">Add Property</span>
                </div>
                <div class="quick-action-item investment" id="quickAddInvestment">
                    <span class="quick-action-icon">💰</span>
                    <span class="quick-action-text">Add Investment</span>
                </div>
                <div class="quick-action-item secondary" id="quickExport">
                    <span class="quick-action-icon">📤</span>
                    <span class="quick-action-text">Export</span>
                </div>
            </div>
        `;
    }

    renderPropertiesGrid() {
        if (this.properties.length === 0) {
            return this.renderEmptyState();
        }

        const filteredProperties = this.getFilteredProperties();
        const sortedProperties = this.getSortedProperties(filteredProperties);
        
        // Render cards synchronously - no async operations in render
        const cardsHtml = sortedProperties.map(property => this.renderPropertyCard(property)).join('');
        
        return `<div class="properties-grid">${cardsHtml}</div>`;
    }

    renderPropertyCard(p) {
        // Use pre-loaded data instead of async calls
        const tenant = this.tenants.find(t => t.propertyId === p.id);
        
        const currentYear = new Date().getFullYear();
        const propertyLogs = this.maintenanceLogs.filter(
            log => log.propertyId === p.id && new Date(log.date).getFullYear() === currentYear
        );
        const totalMaintenanceYTD = propertyLogs.reduce((sum, log) => sum + (parseFloat(log.cost) || 0), 0);

        const typeInfo = this.getPropertyTypeInfo(p.propertyType || 'primary');
        const metrics = this.calculatePropertyMetrics(p, tenant, totalMaintenanceYTD);

        return `
            <div class="property-card ${typeInfo.class}">
                <div class="property-header">
                    <div class="property-type-badge ${typeInfo.class}">
                        <span class="type-icon">${typeInfo.icon}</span>
                        <span class="type-label">${typeInfo.label}</span>
                    </div>
                    <h3 class="property-name">${p.name || 'Unnamed Property'}</h3>
                    <p class="property-address">${p.address || 'No address provided'}</p>
                </div>

                <div class="property-values">
                    <div class="value-item">
                        <span class="value-label">Current Value:</span>
                        <span class="value-amount">${this.formatCurrency(p.currentValue)}</span>
                    </div>
                    ${p.purchasePrice ? `
                        <div class="value-item">
                            <span class="value-label">Purchase Price:</span>
                            <span class="value-amount">${this.formatCurrency(p.purchasePrice)}</span>
                        </div>
                    ` : ''}
                </div>

                ${this.renderPropertyTypeContent(p, tenant, metrics)}

                <div class="property-maintenance">
                    <div class="maintenance-header">
                        <span class="maintenance-icon">🧾</span>
                        <span class="maintenance-label">Maintenance YTD:</span>
                        <span class="maintenance-amount">${this.formatCurrency(totalMaintenanceYTD)}</span>
                    </div>
                </div>

                <div class="property-actions">
                    ${p.propertyType === 'investment' ? `
                        <button class="btn-action tenants" data-action="view-tenants" data-id="${p.id}">
                            👤 Tenants
                        </button>
                    ` : ''}
                    <button class="btn-action maintenance" data-action="view-maintenance" data-id="${p.id}">
                        🧰 Maintenance
                    </button>
                    <button class="btn-action edit" data-action="edit" data-id="${p.id}">
                        ✏️ Edit
                    </button>
                    <button class="btn-action delete" data-action="delete" data-id="${p.id}">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }

    renderPropertyTypeContent(p, tenant, metrics) {
        switch (p.propertyType) {
            case 'investment':
                return this.renderInvestmentContent(p, tenant, metrics);
            case 'primary':
                return this.renderPrimaryContent(p, metrics);
            default:
                return this.renderOtherContent(p, metrics);
        }
    }

    renderInvestmentContent(p, tenant, metrics) {
        return `
            <div class="investment-content">
                <div class="rental-info">
                    <div class="rent-amount">
                        <span class="rent-label">Monthly Rent:</span>
                        <span class="rent-value">${this.formatCurrency(p.rent)}</span>
                    </div>
                    ${tenant ? `
                        <div class="tenant-status occupied">
                            <span class="tenant-icon">👤</span>
                            <span class="tenant-name">${tenant.name}</span>
                            ${tenant.startDate ? `
                                <span class="tenant-since">Since ${new Date(tenant.startDate).toLocaleDateString('en-AU')}</span>
                            ` : ''}
                        </div>
                    ` : `
                        <div class="tenant-status vacant">
                            <span class="vacant-icon">🏠</span>
                            <span class="vacant-text">Vacant - No Tenant</span>
                        </div>
                    `}
                </div>
                <div class="investment-metrics">
                    <div class="metric-item">
                        <span class="metric-label">ROI:</span>
                        <span class="metric-value ${parseFloat(metrics.roi) > 5 ? 'positive' : ''}">${metrics.roi}%</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Value Change:</span>
                        <span class="metric-value ${parseFloat(metrics.valueChange) > 0 ? 'positive' : 'negative'}">${metrics.valueChange}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderPrimaryContent(p, metrics) {
        return `
            <div class="primary-content">
                <div class="residence-info">
                    <div class="owner-occupied-badge">
                        <span class="owner-icon">👨‍👩‍👧‍👦</span>
                        <span class="owner-text">Owner Occupied</span>
                    </div>
                    ${p.mortgage ? `
                        <div class="mortgage-info">
                            <span class="mortgage-label">Monthly Mortgage:</span>
                            <span class="mortgage-amount">${this.formatCurrency(p.mortgage)}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="equity-info">
                    <div class="equity-item">
                        <span class="equity-label">Home Equity:</span>
                        <span class="equity-value">${this.formatCurrency(metrics.equity)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderOtherContent(p, metrics) {
        const typeLabel = p.propertyType === 'vacation' ? '🌴 Vacation & Personal Use' : '🏢 Business & Commercial';
        return `
            <div class="other-content">
                <div class="property-purpose">
                    ${typeLabel}
                </div>
                ${p.rent ? `
                    <div class="rental-potential">
                        <span>Potential Rent: ${this.formatCurrency(p.rent)}/mo</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderPropertyModal() {
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
        return `
            <div class="section-card">
                <div class="empty-state">
                    <div class="empty-icon">🏠</div>
                    <h3>No Properties Yet</h3>
                    <p>Start by adding your first property to track your real estate portfolio.</p>
                    <button class="btn btn-primary" id="emptyAddProperty">Add Your First Property</button>
                </div>
            </div>
        `;
    }

    attachStaticEventListeners() {
        // Quick actions
        document.getElementById('quickAddProperty')?.addEventListener('click', () => this.openPropertyForm());
        document.getElementById('quickAddInvestment')?.addEventListener('click', () => this.openPropertyForm('investment'));
        document.getElementById('quickExport')?.addEventListener('click', () => this.exportPortfolio());
        document.getElementById('emptyAddProperty')?.addEventListener('click', () => this.openPropertyForm());
        document.getElementById('btnNewProperty')?.addEventListener('click', () => this.openPropertyForm());

        // Filters and sorting
        document.getElementById('filterPropertyType')?.addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.renderUI();
        });

        document.getElementById('sortProperties')?.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.renderUI();
        });
    }

    attachEventListeners() {
        this.attachStaticEventListeners();

        // Property actions - use event delegation
        document.addEventListener('click', (e) => {
            const button = e.target.closest('[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const propertyId = button.dataset.id;
            const property = this.properties.find(p => p.id === propertyId);

            if (!property) return;

            switch (action) {
                case 'edit':
                    this.openPropertyForm(null, property);
                    break;
                case 'delete':
                    this.deleteProperty(property);
                    break;
                case 'view-tenants':
                    initTenantsUI(propertyId);
                    break;
                case 'view-maintenance':
                    initMaintenanceUI(propertyId);
                    break;
            }
        });

        // Modal events
        this.setupModalEvents();
    }

    setupModalEvents() {
        const modal = document.getElementById('propertyModal');
        const form = document.getElementById('propertyForm');
        const closeBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelProperty');
        const typeSelect = document.getElementById('propertyType');

        // Toggle rent/mortgage fields based on property type
        typeSelect?.addEventListener('change', (e) => {
            const type = e.target.value;
            const rentField = document.getElementById('rentField');
            const mortgageField = document.getElementById('mortgageField');
            
            if (type === 'primary') {
                rentField.style.display = 'none';
                mortgageField.style.display = 'block';
            } else {
                rentField.style.display = 'block';
                mortgageField.style.display = 'none';
            }
        });

        [closeBtn, cancelBtn].forEach(btn => {
            btn?.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProperty();
            modal.style.display = 'none';
        });

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Core functionality methods
    async openPropertyForm(prefillType = null, property = null) {
        const modal = document.getElementById('propertyModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('propertyForm');
        const typeSelect = document.getElementById('propertyType');

        if (property) {
            title.textContent = 'Edit Property';
            document.getElementById('editPropertyId').value = property.id;
            document.getElementById('propertyName').value = property.name || '';
            document.getElementById('propertyAddress').value = property.address || '';
            document.getElementById('purchasePrice').value = property.purchasePrice || '';
            document.getElementById('currentValue').value = property.currentValue || '';
            document.getElementById('propertyRent').value = property.rent || '0';
            document.getElementById('propertyMortgage').value = property.mortgage || '0';
            typeSelect.value = property.propertyType || 'primary';
        } else {
            title.textContent = 'Add New Property';
            form.reset();
            document.getElementById('editPropertyId').value = '';
            document.getElementById('propertyRent').value = '0';
            document.getElementById('propertyMortgage').value = '0';
            if (prefillType) {
                typeSelect.value = prefillType;
            }
        }

        // Trigger field visibility
        typeSelect.dispatchEvent(new Event('change'));
        modal.style.display = 'flex';
    }

    async saveProperty() {
        const form = document.getElementById('propertyForm');
        const propertyId = document.getElementById('editPropertyId').value;
        const type = document.getElementById('propertyType').value;

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

        try {
            if (propertyId) {
                await updateItem(STORE_NAMES.properties, propertyData);
            } else {
                await addItem(STORE_NAMES.properties, propertyData);
            }
            await this.init(); // Refresh UI
        } catch (error) {
            console.error('Error saving property:', error);
            alert('Error saving property. Please try again.');
        }
    }

    async deleteProperty(property) {
        if (!confirm(`Delete "${property.name}"? This will also remove related tenants and maintenance records.`)) return;

        try {
            await deleteItem(STORE_NAMES.properties, property.id);
            await this.init(); // Refresh UI
        } catch (error) {
            console.error('Error deleting property:', error);
            alert('Error deleting property.');
        }
    }

    // Helper methods
    getFilteredProperties() {
        if (this.currentFilter === 'all') return this.properties;
        return this.properties.filter(p => p.propertyType === this.currentFilter);
    }

    getSortedProperties(properties) {
        return [...properties].sort((a, b) => {
            switch (this.currentSort) {
                case 'name': return (a.name || '').localeCompare(b.name || '');
                case 'value': return (parseFloat(b.currentValue) || 0) - (parseFloat(a.currentValue) || 0);
                case 'rent': return (parseFloat(b.rent) || 0) - (parseFloat(a.rent) || 0);
                case 'type': return (a.propertyType || 'primary').localeCompare(b.propertyType || 'primary');
                default: return (a.name || '').localeCompare(b.name || '');
            }
        });
    }

    getPropertyTypeInfo(propertyType) {
        const types = {
            primary: { icon: '🏠', label: 'Primary Home', class: 'primary' },
            investment: { icon: '💰', label: 'Investment', class: 'investment' },
            vacation: { icon: '🌴', label: 'Vacation', class: 'vacation' },
            commercial: { icon: '🏢', label: 'Commercial', class: 'commercial' }
        };
        return types[propertyType] || types.primary;
    }

    calculatePropertyMetrics(p, tenant, maintenanceYTD) {
        const annualRent = (parseFloat(p.rent) || 0) * 12;
        const netOperatingIncome = annualRent - maintenanceYTD;
        
        const roi = p.purchasePrice && p.rent
            ? ((annualRent) / parseFloat(p.purchasePrice) * 100).toFixed(1)
            : '0.0';

        const valueChange = p.currentValue && p.purchasePrice
            ? (((parseFloat(p.currentValue) - parseFloat(p.purchasePrice)) / parseFloat(p.purchasePrice)) * 100).toFixed(1)
            : '0.0';

        const equity = Math.max(0, (parseFloat(p.currentValue) || 0) - (parseFloat(p.mortgage) || 0) * 12 * 30);

        return {
            roi,
            valueChange,
            equity: equity
        };
    }

    exportPortfolio() {
        const csv = this.convertToCSV(this.properties);
        this.downloadCSV(csv, 'property-portfolio.csv');
    }

    convertToCSV(properties) {
        const headers = ['Name', 'Type', 'Address', 'Purchase Price', 'Current Value', 'Rent', 'Mortgage'];
        const rows = properties.map(p => [
            p.name,
            this.getPropertyTypeInfo(p.propertyType).label,
            p.address,
            p.purchasePrice,
            p.currentValue,
            p.rent || '',
            p.mortgage || ''
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    formatCurrency(amount) {
        if (isNaN(amount) || amount === null || amount === undefined) return '$0.00';
        return new Intl.NumberFormat('en-AU', { 
            style: 'currency', 
            currency: 'AUD' 
        }).format(amount);
    }
}

// Backwards compatibility
export async function initPropertiesUI() {
    const manager = new PropertiesManager();
    await manager.init();
}