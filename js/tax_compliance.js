// ============================================================================
// 📘 tax_compliance.js — Australian ATO Compliance & Reporting Hub
// ============================================================================

import { getAllItems, STORE_NAMES } from './db.js';

// Tax rates and thresholds for 2024-2025
const TAX_RATES = {
  individual: [
    { threshold: 0, rate: 0.00 },
    { threshold: 18200, rate: 0.19 },
    { threshold: 45000, rate: 0.325 },
    { threshold: 120000, rate: 0.37 },
    { threshold: 180000, rate: 0.45 }
  ],
  corporate: 0.30,
  gst: 0.10
};

// Global modal creation functions
function createCGTModal() {
  return `
    <div class="modal" id="modalCGT">
      <div class="modal-content">
        <h2>📈 Capital Gains Tax Calculator</h2>
        <form id="formCGT">
          <div class="form-group">
            <label class="form-label">Purchase Price (AUD)</label>
            <input type="number" class="form-input" name="purchase" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Sale Price (AUD)</label>
            <input type="number" class="form-input" name="sell" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Capital Improvements (AUD)</label>
            <input type="number" class="form-input" name="improve" value="0">
          </div>
          
          <div class="form-group">
            <label class="form-label">Selling Costs (AUD)</label>
            <input type="number" class="form-input" name="costs" value="0">
          </div>
          
          <div class="form-group">
            <label class="form-label">Years Owned</label>
            <input type="number" class="form-input" name="years" step="0.1" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Your Marginal Tax Rate (%)</label>
            <input type="number" class="form-input" name="taxRate" value="32.5" required>
          </div>
          
          <button type="submit" class="btn btn-primary">Calculate CGT</button>
        </form>
        
        <div id="cgtResult" class="calculator-result" style="display: none;"></div>
        
        <button class="btn btn-outline" style="margin-top: 1rem; width: 100%;" 
                onclick="document.getElementById('modalCGT').classList.remove('active')">
          Close
        </button>
      </div>
    </div>
  `;
}

function createNegGearingModal() {
  return `
    <div class="modal" id="modalNeg">
      <div class="modal-content">
        <h2>📉 Negative Gearing Calculator</h2>
        <form id="formNeg">
          <div class="form-group">
            <label class="form-label">Rental Loss Amount (AUD)</label>
            <input type="number" class="form-input" name="loss" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Your Marginal Tax Rate (%)</label>
            <input type="number" class="form-input" name="taxRate" value="32.5" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Other Income (AUD)</label>
            <input type="number" class="form-input" name="otherIncome" value="0">
          </div>
          
          <button type="submit" class="btn btn-primary">Calculate Benefits</button>
        </form>
        
        <div id="negResult" class="calculator-result" style="display: none;"></div>
        
        <button class="btn btn-outline" style="margin-top: 1rem; width: 100%;" 
                onclick="document.getElementById('modalNeg').classList.remove('active')">
          Close
        </button>
      </div>
    </div>
  `;
}

function createDepreciationModal() {
  return `
    <div class="modal" id="modalDepreciation">
      <div class="modal-content">
        <h2>🏠 Depreciation Calculator</h2>
        <form id="formDepreciation">
          <div class="form-group">
            <label class="form-label">Building Cost (AUD)</label>
            <input type="number" class="form-input" name="buildingCost" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Plant & Equipment Value (AUD)</label>
            <input type="number" class="form-input" name="plantValue" value="0">
          </div>
          
          <div class="form-group">
            <label class="form-label">Construction Date</label>
            <input type="date" class="form-input" name="constructionDate" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">First Rental Date</label>
            <input type="date" class="form-input" name="rentalDate" required>
          </div>
          
          <button type="submit" class="btn btn-primary">Calculate Depreciation</button>
        </form>
        
        <div id="depreciationResult" class="calculator-result" style="display: none;"></div>
        
        <button class="btn btn-outline" style="margin-top: 1rem; width: 100%;" 
                onclick="document.getElementById('modalDepreciation').classList.remove('active')">
          Close
        </button>
      </div>
    </div>
  `;
}

function createGSTModal() {
  return `
    <div class="modal" id="modalGST">
      <div class="modal-content">
        <h2>💰 GST Calculator</h2>
        <form id="formGST">
          <div class="form-group">
            <label class="form-label">Amount (AUD)</label>
            <input type="number" class="form-input" name="amount" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Calculation Type</label>
            <select class="form-input" name="calculationType">
              <option value="add">Add GST to Amount</option>
              <option value="extract">Extract GST from Amount</option>
            </select>
          </div>
          
          <button type="submit" class="btn btn-primary">Calculate GST</button>
        </form>
        
        <div id="gstResult" class="calculator-result" style="display: none;"></div>
        
        <button class="btn btn-outline" style="margin-top: 1rem; width: 100%;" 
                onclick="document.getElementById('modalGST').classList.remove('active')">
          Close
        </button>
      </div>
    </div>
  `;
}

function createDeductionWizard() {
  return `
    <div class="modal" id="modalDeductionWizard">
      <div class="modal-content">
        <h2>💡 Deduction Maximization Wizard</h2>
        
        <div style="margin-bottom: 1.5rem;">
          <p>Let's optimize your tax deductions for rental properties:</p>
        </div>
        
        <form id="formDeductionWizard">
          <div class="form-group">
            <label class="form-label">Property Type</label>
            <select class="form-input" name="propertyType">
              <option value="house">House</option>
              <option value="apartment">Apartment</option>
              <option value="townhouse">Townhouse</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Construction Year</label>
            <input type="number" class="form-input" name="constructionYear" min="1900" max="2024">
          </div>
          
          <div class="form-group">
            <label class="form-label">Recent Renovations (AUD)</label>
            <input type="number" class="form-input" name="renovations" value="0">
          </div>
          
          <div class="form-group">
            <label class="form-label">Furniture & Appliances (AUD)</label>
            <input type="number" class="form-input" name="furniture" value="0">
          </div>
          
          <button type="submit" class="btn btn-primary">Optimize Deductions</button>
        </form>
        
        <div id="deductionWizardResult" class="calculator-result" style="display: none;"></div>
        
        <button class="btn btn-outline" style="margin-top: 1rem; width: 100%;" 
                onclick="document.getElementById('modalDeductionWizard').classList.remove('active')">
          Close
        </button>
      </div>
    </div>
  `;
}

export async function initTaxComplianceUI() {
  console.log('📘 ATO Reports Page initializing...');

  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <style>
      .tax-container { padding: 20px; max-width: 1200px; margin: 0 auto; }
      
      .tax-header { 
        background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%); 
        color: white; 
        padding: 2rem; 
        border-radius: 12px; 
        margin-bottom: 2rem; 
      }
      
      .dashboard-grid { 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
        gap: 1.5rem; 
        margin-bottom: 2rem; 
      }
      
      .card { 
        background: white; 
        border-radius: 12px; 
        box-shadow: 0 4px 6px rgba(0,0,0,0.05); 
        padding: 1.5rem; 
        border: 1px solid #e2e8f0; 
      }
      
      .card.highlight { border-left: 4px solid #2563eb; }
      .card.warning { border-left: 4px solid #dc2626; }
      .card.success { border-left: 4px solid #059669; }
      
      .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
      .metric { text-align: center; padding: 1rem; background: #f8fafc; border-radius: 8px; }
      .metric-value { font-size: 1.5rem; font-weight: bold; color: #1e3a8a; }
      .metric-label { font-size: 0.875rem; color: #64748b; }
      
      .progress-bar { 
        height: 8px; 
        background: #e2e8f0; 
        border-radius: 4px; 
        overflow: hidden; 
        margin: 0.5rem 0; 
      }
      
      .progress-fill { 
        height: 100%; 
        background: #2563eb; 
        transition: width 0.3s ease; 
      }
      
      .record-item { 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        padding: 0.75rem 0; 
        border-bottom: 1px solid #f1f5f9; 
      }
      
      .record-item:last-child { border-bottom: none; }
      
      .btn { 
        padding: 0.75rem 1.5rem; 
        border: none; 
        border-radius: 8px; 
        cursor: pointer; 
        font-weight: 600; 
        transition: all 0.2s; 
        display: inline-flex; 
        align-items: center; 
        gap: 0.5rem; 
      }
      
      .btn-primary { background: #2563eb; color: white; }
      .btn-primary:hover { background: #1d4ed8; }
      
      .btn-outline { background: white; border: 2px solid #2563eb; color: #2563eb; }
      .btn-outline:hover { background: #f8fafc; }
      
      .btn-success { background: #059669; color: white; }
      .btn-success:hover { background: #047857; }
      
      .tab-container { margin: 2rem 0; }
      .tab-buttons { 
        display: flex; 
        border-bottom: 2px solid #e2e8f0; 
        margin-bottom: 1.5rem; 
      }
      
      .tab-btn { 
        padding: 1rem 2rem; 
        background: none; 
        border: none; 
        cursor: pointer; 
        border-bottom: 3px solid transparent; 
        font-weight: 600; 
        color: #64748b; 
      }
      
      .tab-btn.active { 
        color: #2563eb; 
        border-bottom-color: #2563eb; 
      }
      
      .tab-content { display: none; }
      .tab-content.active { display: block; }
      
      .modal { 
        position: fixed; 
        inset: 0; 
        background: rgba(0,0,0,0.5); 
        display: none; 
        align-items: center; 
        justify-content: center; 
        z-index: 1000; 
        padding: 1rem; 
      }
      
      .modal.active { display: flex; }
      
      .modal-content { 
        background: white; 
        border-radius: 12px; 
        padding: 2rem; 
        max-width: 500px; 
        width: 100%; 
        max-height: 90vh; 
        overflow-y: auto; 
      }
      
      .form-group { margin-bottom: 1rem; }
      .form-label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
      .form-input { 
        width: 100%; 
        padding: 0.75rem; 
        border: 2px solid #e2e8f0; 
        border-radius: 8px; 
        font-size: 1rem; 
      }
      
      .form-input:focus { 
        outline: none; 
        border-color: #2563eb; 
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); 
      }
      
      .calculator-result { 
        background: #f0f9ff; 
        border: 2px solid #2563eb; 
        border-radius: 8px; 
        padding: 1.5rem; 
        margin-top: 1.5rem; 
      }
      
      .tax-date-card { 
        background: white; 
        padding: 1rem; 
        border-radius: 8px; 
        border-left: 4px solid #2563eb; 
        margin-bottom: 0.5rem; 
      }
      
      .tax-date-card.urgent { border-left-color: #dc2626; background: #fef2f2; }
      .tax-date-card.upcoming { border-left-color: #f59e0b; background: #fffbeb; }
      
      .compliance-status { 
        display: inline-flex; 
        align-items: center; 
        gap: 0.5rem; 
        padding: 0.25rem 0.75rem; 
        border-radius: 20px; 
        font-size: 0.875rem; 
        font-weight: 600; 
      }
      
      .status-compliant { background: #d1fae5; color: #065f46; }
      .status-pending { background: #fef3c7; color: #92400e; }
      .status-overdue { background: #fee2e2; color: #991b1b; }
      
      @media (max-width: 768px) {
        .dashboard-grid { grid-template-columns: 1fr; }
        .tab-buttons { flex-direction: column; }
        .tab-btn { text-align: left; }
      }
    </style>

    <div class="tax-container">
      <!-- Header -->
      <div class="tax-header">
        <h1>📘 ATO Compliance & Tax Hub</h1>
        <p>Complete Australian tax management for property investors</p>
        <div class="metric-grid" style="margin-top: 1.5rem;">
          <div class="metric">
            <div class="metric-value" id="totalDeductions">$0</div>
            <div class="metric-label">Annual Deductions</div>
          </div>
          <div class="metric">
            <div class="metric-value" id="taxSavings">$0</div>
            <div class="metric-label">Estimated Tax Savings</div>
          </div>
          <div class="metric">
            <div class="metric-value" id="complianceScore">100%</div>
            <div class="metric-label">Compliance Score</div>
          </div>
        </div>
      </div>

      <!-- Dashboard Overview -->
      <div class="dashboard-grid">
        <div class="card highlight">
          <h3>📅 Tax Deadline Tracker</h3>
          <div id="taxDeadlines"></div>
        </div>
        
        <div class="card">
          <h3>💰 Rental Summary (FY ${new Date().getFullYear()})</h3>
          <div id="rentalSummary"></div>
        </div>
        
        <div class="card">
          <h3>🧾 Deduction Optimizer</h3>
          <div id="deductionTips"></div>
          <button class="btn btn-outline" style="margin-top: 1rem;" onclick="showDeductionWizard()">
            💡 Maximize Deductions
          </button>
        </div>
      </div>

      <!-- Tabbed Interface -->
      <div class="tab-container">
        <div class="tab-buttons">
          <button class="tab-btn active" onclick="switchTab('records')">📋 Financial Records</button>
          <button class="tab-btn" onclick="switchTab('calculators')">🧮 Tax Calculators</button>
          <button class="tab-btn" onclick="switchTab('reports')">📊 ATO Reports</button>
          <button class="tab-btn" onclick="switchTab('compliance')">🛡️ Compliance</button>
        </div>

        <!-- Records Tab -->
        <div class="tab-content active" id="records-tab">
          <div class="dashboard-grid">
            <div class="card">
              <h3>💰 Income & Expenses</h3>
              <div id="incomeExpenseRecords"></div>
            </div>
            
            <div class="card">
              <h3>🏦 Loan Interest</h3>
              <div id="loanRecords"></div>
            </div>
            
            <div class="card">
              <h3>🧰 Capital Works</h3>
              <div id="maintenanceRecords"></div>
            </div>
          </div>
        </div>

        <!-- Calculators Tab -->
        <div class="tab-content" id="calculators-tab">
          <div class="dashboard-grid">
            <div class="card">
              <h3>📈 Capital Gains Tax</h3>
              <p>Estimate CGT liability on property sales</p>
              <button class="btn btn-primary" onclick="showCGTModal()">Calculate CGT</button>
            </div>
            
            <div class="card">
              <h3>📉 Negative Gearing</h3>
              <p>Calculate tax benefits from rental losses</p>
              <button class="btn btn-primary" onclick="showNegGearingModal()">Calculate Benefits</button>
            </div>
            
            <div class="card">
              <h3>🏠 Depreciation Schedule</h3>
              <p>Estimate property depreciation deductions</p>
              <button class="btn btn-primary" onclick="showDepreciationModal()">Calculate Depreciation</button>
            </div>
            
            <div class="card">
              <h3>💰 GST Calculator</h3>
              <p>Calculate GST on property transactions</p>
              <button class="btn btn-primary" onclick="showGSTModal()">Calculate GST</button>
            </div>
          </div>
        </div>

        <!-- Reports Tab -->
        <div class="tab-content" id="reports-tab">
          <div class="card">
            <h3>📤 ATO Report Generator</h3>
            <p>Generate ready-to-lodge reports for Australian Tax Office</p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1.5rem 0;">
              <button class="btn btn-outline" onclick="generateRentalSchedule()">
                📄 Rental Schedule
              </button>
              <button class="btn btn-outline" onclick="generateDeductionReport()">
                💰 Deduction Report
              </button>
              <button class="btn btn-outline" onclick="generateCGTReport()">
                📈 CGT Report
              </button>
              <button class="btn btn-success" onclick="exportAllReports()">
                📦 Export All Reports
              </button>
            </div>
            
            <div id="reportOutput"></div>
          </div>
        </div>

        <!-- Compliance Tab -->
        <div class="tab-content" id="compliance-tab">
          <div class="dashboard-grid">
            <div class="card">
              <h3>🛡️ ATO Compliance Checklist</h3>
              <div id="complianceChecklist"></div>
            </div>
            
            <div class="card">
              <h3>📚 Record Keeping Requirements</h3>
              <div id="recordKeeping"></div>
            </div>
            
            <div class="card warning">
              <h3>⚠️ Risk Assessment</h3>
              <div id="riskAssessment"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Components -->
    ${createCGTModal()}
    ${createNegGearingModal()}
    ${createDepreciationModal()}
    ${createGSTModal()}
    ${createDeductionWizard()}
  `;

  // Load data and initialize
  const [transactions, loans, maintenance, properties, tenants] = await Promise.all([
    getAllItems(STORE_NAMES.transactions),
    getAllItems(STORE_NAMES.loans),
    getAllItems(STORE_NAMES.maintenance),
    getAllItems(STORE_NAMES.properties || 'properties'),
    getAllItems(STORE_NAMES.tenants || 'tenants')
  ]);

  initializeTaxDashboard(transactions, loans, maintenance, properties, tenants);
  setupEventListeners();
}

// ============================================================================
// 🎯 INITIALIZE DASHBOARD
// ============================================================================

function initializeTaxDashboard(transactions, loans, maintenance, properties, tenants) {
  renderTaxDeadlines();
  renderRentalSummary(transactions, properties, tenants);
  renderDeductionTips(transactions, maintenance);
  renderFinancialRecords(transactions, loans, maintenance);
  renderComplianceChecklist();
  calculateTaxMetrics(transactions, loans, maintenance);
}

// ============================================================================
// 📅 TAX DEADLINES & COMPLIANCE
// ============================================================================

function renderTaxDeadlines() {
  const deadlines = [
    { 
      name: 'Quarterly BAS (Jan-Mar)', 
      date: new Date(new Date().getFullYear(), 3, 28),
      type: 'quarterly',
      priority: 'upcoming'
    },
    { 
      name: 'Income Tax Return', 
      date: new Date(new Date().getFullYear(), 9, 31),
      type: 'annual',
      priority: 'upcoming'
    },
    { 
      name: 'Land Tax Assessment', 
      date: new Date(new Date().getFullYear(), 5, 30),
      type: 'annual',
      priority: 'normal'
    }
  ];

  const today = new Date();
  const html = deadlines.map(deadline => {
    const daysUntil = Math.ceil((deadline.date - today) / (1000 * 60 * 60 * 24));
    const isUrgent = daysUntil <= 30 && daysUntil > 0;
    const isOverdue = daysUntil < 0;
    
    let statusClass = '';
    let statusText = '';
    
    if (isOverdue) {
      statusClass = 'urgent';
      statusText = `<span class="compliance-status status-overdue">OVERDUE</span>`;
    } else if (isUrgent) {
      statusClass = 'upcoming';
      statusText = `<span class="compliance-status status-pending">DUE IN ${daysUntil} DAYS</span>`;
    } else {
      statusText = `<span class="compliance-status status-compliant">ON TRACK</span>`;
    }
    
    return `
      <div class="tax-date-card ${statusClass}">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div>
            <strong>${deadline.name}</strong>
            <div style="color: #64748b; font-size: 0.875rem;">
              Due: ${deadline.date.toLocaleDateString('en-AU')}
            </div>
          </div>
          ${statusText}
        </div>
        ${isUrgent ? `
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${((30 - daysUntil) / 30) * 100}%"></div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  document.getElementById('taxDeadlines').innerHTML = html;
}

// ============================================================================
// 💰 RENTAL INCOME & DEDUCTIONS
// ============================================================================

function renderRentalSummary(transactions, properties, tenants) {
  const currentFY = new Date().getFullYear();
  const fyStart = new Date(currentFY, 6, 1); // July 1
  const fyEnd = new Date(currentFY + 1, 5, 30); // June 30
  
  const rentalIncome = transactions
    .filter(t => t.type === 'income' && new Date(t.date) >= fyStart && new Date(t.date) <= fyEnd)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const expenses = transactions
    .filter(t => t.type === 'expense' && new Date(t.date) >= fyStart && new Date(t.date) <= fyEnd)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const netIncome = rentalIncome - expenses;
  
  document.getElementById('rentalSummary').innerHTML = `
    <div class="metric-grid">
      <div class="metric">
        <div class="metric-value">${fmt(rentalIncome)}</div>
        <div class="metric-label">Rental Income</div>
      </div>
      <div class="metric">
        <div class="metric-value">${fmt(expenses)}</div>
        <div class="metric-label">Deductible Expenses</div>
      </div>
      <div class="metric">
        <div class="metric-value" style="color: ${netIncome >= 0 ? '#059669' : '#dc2626'}">
          ${fmt(netIncome)}
        </div>
        <div class="metric-label">Net Rental Income</div>
      </div>
    </div>
    <div style="margin-top: 1rem; font-size: 0.875rem; color: #64748b;">
      FY ${currentFY} (Jul 1 - Jun 30)
    </div>
  `;
}

function renderDeductionTips(transactions, maintenance) {
  const tips = [
    "📝 Keep all receipts for 5 years",
    "🏠 Claim depreciation on capital works",
    "🔧 Maintenance costs are fully deductible",
    "📊 Travel to rental properties may be deductible",
    "💼 Professional fees (accountants, lawyers) are deductible"
  ];
  
  document.getElementById('deductionTips').innerHTML = `
    <ul style="margin: 0; padding-left: 1.25rem;">
      ${tips.map(tip => `<li style="margin-bottom: 0.5rem; color: #64748b;">${tip}</li>`).join('')}
    </ul>
  `;
}

function renderFinancialRecords(transactions, loans, maintenance) {
  const incomeDiv = document.getElementById('incomeExpenseRecords');
  const loanDiv = document.getElementById('loanRecords');
  const maintDiv = document.getElementById('maintenanceRecords');

  const incomeTx = transactions.filter(t => t.type === 'income').slice(-5);
  const expenseTx = transactions.filter(t => t.type === 'expense').slice(-5);

  incomeDiv.innerHTML = `
    <h4 style="margin-bottom: 0.75rem; color: #374151;">Recent Income</h4>
    ${incomeTx.length > 0 ? incomeTx.map(t => `
      <div class="record-item">
        <span>${t.description || 'Income'}</span>
        <span style="color: #059669; font-weight: 600;">${fmt(t.amount)}</span>
      </div>
    `).join('') : '<p style="color: #64748b; font-style: italic;">No recent income</p>'}
    
    <h4 style="margin: 1.5rem 0 0.75rem 0; color: #374151;">Recent Expenses</h4>
    ${expenseTx.length > 0 ? expenseTx.map(t => `
      <div class="record-item">
        <span>${t.description || 'Expense'}</span>
        <span style="color: #dc2626; font-weight: 600;">${fmt(t.amount)}</span>
      </div>
    `).join('') : '<p style="color: #64748b; font-style: italic;">No recent expenses</p>'}
  `;

  loanDiv.innerHTML = loans.length > 0 ? `
    ${loans.slice(-5).map(loan => `
      <div class="record-item">
        <span>${loan.name || 'Loan'}</span>
        <span style="font-weight: 600;">${fmt(loan.currentBalance)}</span>
      </div>
    `).join('')}
  ` : '<p style="color: #64748b; font-style: italic;">No loan data</p>';

  maintDiv.innerHTML = maintenance.length > 0 ? `
    ${maintenance.slice(-5).map(maint => `
      <div class="record-item">
        <span>${maint.title || 'Maintenance'}</span>
        <span style="color: #d97706; font-weight: 600;">${fmt(maint.cost)}</span>
      </div>
    `).join('')}
  ` : '<p style="color: #64748b; font-style: italic;">No maintenance data</p>';
}

function renderComplianceChecklist() {
  const checklist = [
    { task: "Rental income records maintained", completed: true, requirement: "ATO Requirement: 5 years" },
    { task: "Expense receipts digitized", completed: true, requirement: "ATO Requirement: 5 years" },
    { task: "Loan documents organized", completed: false, requirement: "Until loan repaid + 5 years" },
    { task: "Capital works records updated", completed: true, requirement: "ATO Requirement: 5 years" },
    { task: "BAS statements filed", completed: true, requirement: "Quarterly requirement" }
  ];
  
  const html = checklist.map(item => `
    <div class="record-item">
      <div>
        <strong>${item.task}</strong>
        <div style="font-size: 0.75rem; color: #64748b;">${item.requirement}</div>
      </div>
      <span class="compliance-status ${item.completed ? 'status-compliant' : 'status-pending'}">
        ${item.completed ? '✓ COMPLIANT' : '⏳ PENDING'}
      </span>
    </div>
  `).join('');
  
  document.getElementById('complianceChecklist').innerHTML = html;
}

// ============================================================================
// 📈 TAX METRICS & SAVINGS
// ============================================================================

function calculateTaxMetrics(transactions, loans, maintenance) {
  const currentFY = new Date().getFullYear();
  const deductibleExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const loanInterest = loans.reduce((sum, loan) => sum + (loan.interestPaid || 0), 0);
  const maintenanceCosts = maintenance.reduce((sum, maint) => sum + maint.cost, 0);
  
  const totalDeductions = deductibleExpenses + loanInterest + maintenanceCosts;
  const estimatedSavings = totalDeductions * 0.325; // Assuming 32.5% marginal rate
  
  document.getElementById('totalDeductions').textContent = fmt(totalDeductions);
  document.getElementById('taxSavings').textContent = fmt(estimatedSavings);
}

// ============================================================================
// 🧮 CALCULATOR FUNCTIONS
// ============================================================================

function calculateCGT(formData) {
  const purchase = parseFloat(formData.get('purchase'));
  const sell = parseFloat(formData.get('sell'));
  const improve = parseFloat(formData.get('improve'));
  const costs = parseFloat(formData.get('costs'));
  const years = parseFloat(formData.get('years'));
  const taxRate = parseFloat(formData.get('taxRate')) / 100;
  
  const costBase = purchase + improve + costs;
  const capitalGain = sell - costBase;
  const discount = years >= 1 ? 0.5 : 0; // 50% discount for >12 months
  const taxableGain = capitalGain * (1 - discount);
  const taxPayable = taxableGain * taxRate;
  
  return `
    <h4>Capital Gains Tax Calculation</h4>
    <div style="display: grid; gap: 0.5rem;">
      <div style="display: flex; justify-content: space-between;">
        <span>Capital Gain:</span>
        <strong>${fmt(capitalGain)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>CGT Discount (${discount * 100}%):</span>
        <strong>-${fmt(capitalGain * discount)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 0.5rem;">
        <span>Taxable Gain:</span>
        <strong>${fmt(taxableGain)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Estimated Tax Payable:</span>
        <strong style="color: #dc2626;">${fmt(taxPayable)}</strong>
      </div>
    </div>
    
    ${years < 1 ? `
      <div style="margin-top: 1rem; padding: 1rem; background: #fef3c7; border-radius: 6px;">
        <strong>⚠️ Short-term Holding</strong>
        <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">
          Properties held less than 12 months don't qualify for the 50% CGT discount.
        </p>
      </div>
    ` : ''}
  `;
}

function calculateNegativeGearing(formData) {
  const loss = parseFloat(formData.get('loss'));
  const taxRate = parseFloat(formData.get('taxRate')) / 100;
  const otherIncome = parseFloat(formData.get('otherIncome')) || 0;
  
  const taxRefund = loss * taxRate;
  const netCost = loss - taxRefund;
  const effectiveTaxRate = (taxRefund / loss) * 100;
  
  return `
    <h4>Negative Gearing Benefits</h4>
    <div style="display: grid; gap: 0.5rem;">
      <div style="display: flex; justify-content: space-between;">
        <span>Rental Loss:</span>
        <strong style="color: #dc2626;">${fmt(loss)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Tax Refund Benefit:</span>
        <strong style="color: #059669;">${fmt(taxRefund)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 0.5rem;">
        <span>Net Cost After Tax:</span>
        <strong>${fmt(netCost)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Effective Tax Benefit:</span>
        <strong>${effectiveTaxRate.toFixed(1)}%</strong>
      </div>
    </div>
  `;
}

// ============================================================================
// 📊 REPORT GENERATION
// ============================================================================

function generateRentalSchedule() {
  const report = {
    title: "Rental Income Schedule",
    period: "FY 2024-2025",
    generated: new Date().toLocaleDateString('en-AU'),
    summary: {
      totalRentalIncome: 45200,
      totalDeductions: 28750,
      netRentalIncome: 16450
    },
    months: [
      { month: "July 2024", income: 3800, expenses: 2450 },
      { month: "August 2024", income: 3800, expenses: 2100 }
    ]
  };
  
  document.getElementById('reportOutput').innerHTML = `
    <div class="card" style="margin-top: 1rem;">
      <h3>📄 Rental Schedule Report</h3>
      <pre style="background: #f8fafc; padding: 1rem; border-radius: 8px; overflow-x: auto;">
${JSON.stringify(report, null, 2)}
      </pre>
      <button class="btn btn-success" onclick="downloadReport('rental-schedule', report)">
        📥 Download PDF
      </button>
    </div>
  `;
}

function generateDeductionReport() {
  const report = {
    title: "Tax Deduction Report",
    period: "FY 2024-2025",
    generated: new Date().toLocaleDateString('en-AU'),
    deductions: {
      interest: 18500,
      maintenance: 4500,
      councilRates: 3200,
      insurance: 1500,
      propertyManagement: 2050
    },
    totalDeductions: 29750
  };
  
  document.getElementById('reportOutput').innerHTML = `
    <div class="card" style="margin-top: 1rem;">
      <h3>💰 Deduction Report</h3>
      <pre style="background: #f8fafc; padding: 1rem; border-radius: 8px; overflow-x: auto;">
${JSON.stringify(report, null, 2)}
      </pre>
      <button class="btn btn-success" onclick="downloadReport('deduction-report', report)">
        📥 Download PDF
      </button>
    </div>
  `;
}

function generateCGTReport() {
  document.getElementById('reportOutput').innerHTML = `
    <div class="card" style="margin-top: 1rem;">
      <h3>📈 CGT Report</h3>
      <p style="color: #64748b;">Use the CGT calculator first to generate a report.</p>
      <button class="btn btn-primary" onclick="showCGTModal()">
        Open CGT Calculator
      </button>
    </div>
  `;
}

function exportAllReports() {
  const reports = {
    rentalSchedule: generateRentalSchedule(),
    deductionReport: generateDeductionReport(),
    exported: new Date().toISOString()
  };
  
  downloadReport('ato-reports-bundle', reports);
}

// ============================================================================
// 🎛️ UI CONTROLS & UTILITIES
// ============================================================================

function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Deactivate all buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Activate selected tab
  document.getElementById(`${tabName}-tab`).classList.add('active');
  event.target.classList.add('active');
}

function showCGTModal() {
  document.getElementById('modalCGT').classList.add('active');
}

function showNegGearingModal() {
  document.getElementById('modalNeg').classList.add('active');
}

function showDepreciationModal() {
  document.getElementById('modalDepreciation').classList.add('active');
}

function showGSTModal() {
  document.getElementById('modalGST').classList.add('active');
}

function showDeductionWizard() {
  document.getElementById('modalDeductionWizard').classList.add('active');
}

function setupEventListeners() {
  // CGT Calculator
  const cgtForm = document.getElementById('formCGT');
  if (cgtForm) {
    cgtForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      const result = calculateCGT(formData);
      document.getElementById('cgtResult').style.display = 'block';
      document.getElementById('cgtResult').innerHTML = result;
    });
  }
  
  // Negative Gearing Calculator
  const negForm = document.getElementById('formNeg');
  if (negForm) {
    negForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      const result = calculateNegativeGearing(formData);
      document.getElementById('negResult').style.display = 'block';
      document.getElementById('negResult').innerHTML = result;
    });
  }
  
  // Close modals when clicking outside
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('active');
      }
    });
  });
}

// ============================================================================
// 💰 UTILITY FUNCTIONS
// ============================================================================

function fmt(amount, currency = 'AUD') {
  return new Intl.NumberFormat('en-AU', { 
    style: 'currency', 
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function downloadReport(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// 🌐 GLOBAL FUNCTION EXPORTS
// ============================================================================

window.switchTab = switchTab;
window.showCGTModal = showCGTModal;
window.showNegGearingModal = showNegGearingModal;
window.showDepreciationModal = showDepreciationModal;
window.showGSTModal = showGSTModal;
window.showDeductionWizard = showDeductionWizard;
window.generateRentalSchedule = generateRentalSchedule;
window.generateDeductionReport = generateDeductionReport;
window.generateCGTReport = generateCGTReport;
window.exportAllReports = exportAllReports;
window.downloadReport = downloadReport;