// ============================================================================
// 🎯 ENHANCED BUDGETS MODULE
// ============================================================================

import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES, generateId } from './db.js';

// --- ENHANCED HELPER FUNCTIONS ---
function getPeriodStartDate(viewMode) {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (viewMode) {
        case 'weekly':
            date.setDate(now.getDate() - now.getDay());
            break;
        case 'fortnightly':
            date.setDate(now.getDate() - 14);
            break;
        case 'monthly':
            date.setDate(1);
            break;
        case 'quarterly':
            const currentQuarter = Math.floor(now.getMonth() / 3);
            date.setMonth(currentQuarter * 3, 1);
            break;
        case 'yearly':
            date.setMonth(0, 1);
            break;
        default:
            date.setDate(1);
    }
    date.setHours(0, 0, 0, 0);
    return date;
}

function getPeriodEndDate(viewMode) {
    const start = getPeriodStartDate(viewMode);
    const end = new Date(start);
    
    switch (viewMode) {
        case 'weekly':
            end.setDate(start.getDate() + 6);
            break;
        case 'fortnightly':
            end.setDate(start.getDate() + 13);
            break;
        case 'monthly':
            end.setMonth(start.getMonth() + 1);
            end.setDate(0);
            break;
        case 'quarterly':
            end.setMonth(start.getMonth() + 3);
            end.setDate(0);
            break;
        case 'yearly':
            end.setFullYear(start.getFullYear() + 1);
            end.setDate(0);
            break;
    }
    end.setHours(23, 59, 59, 999);
    return end;
}

// --- CONVERSION FACTORS ---
const FREQUENCY_CONVERSION = {
    weekly: {
        weekly: 1,
        fortnightly: 2,
        monthly: 4.33,
        quarterly: 13,
        yearly: 52
    },
    fortnightly: {
        weekly: 0.5,
        fortnightly: 1,
        monthly: 2.17,
        quarterly: 6.5,
        yearly: 26
    },
    monthly: {
        weekly: 1/4.33,
        fortnightly: 1/2.17,
        monthly: 1,
        quarterly: 3,
        yearly: 12
    },
    quarterly: {
        weekly: 1/13,
        fortnightly: 1/6.5,
        monthly: 1/3,
        quarterly: 1,
        yearly: 4
    },
    yearly: {
        weekly: 1/52,
        fortnightly: 1/26,
        monthly: 1/12,
        quarterly: 1/4,
        yearly: 1
    }
};

function convertAmount(amount, fromFreq, toFreq) {
    if (!FREQUENCY_CONVERSION[fromFreq] || !FREQUENCY_CONVERSION[fromFreq][toFreq]) {
        console.warn(`Cannot convert from ${fromFreq} to ${toFreq}`);
        return amount;
    }
    return amount * FREQUENCY_CONVERSION[fromFreq][toFreq];
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function guessCategoryIcon(name = '') {
    const iconMap = {
        food: '🍽️', groceries: '🛒', utilities: '💡', rent: '🏠',
        transport: '🚗', travel: '✈️', entertainment: '🎬',
        savings: '💰', salary: '💵', health: '⚕️', shopping: '🛍️',
        pets: '🐾', kids: '🧒', gifts: '🎁', income: '💰',
        business: '💼', government: '🏛️', investment: '📈',
        rental: '🏠', tax: '📝', mortgage: '🏦', loan: '💰',
        insurance: '🛡️', education: '🎓', clothing: '👕',
        dining: '🍴', coffee: '☕', fitness: '💪', mobile: '📱',
        internet: '🌐', tv: '📺', music: '🎵', streaming: '🎥',
        gas: '⛽', parking: '🅿️', maintenance: '🔧'
    };
    
    const key = Object.keys(iconMap).find(k => name?.toLowerCase().includes(k));
    return iconMap[key] || '💼';
}

// --- MAIN UI INITIALIZATION ---
export async function initBudgetsUI() {
    console.log("🎯 Initializing Budgets UI...");
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        console.error("No #mainContent element found");
        return;
    }

    // Add loading state
    mainContent.classList.add('budget-loading');

    const currentViewMode = document.getElementById('budgetViewMode')?.value || 'monthly';

    mainContent.innerHTML = `
        <div class="budgets-container">
            <div class="budgets-header">
                <h2>🎯 Budgets Dashboard</h2>
                <div class="budgets-controls">
                    <div class="view-mode">
                        <label class="form-label">View Period</label>
                        <select id="budgetViewMode" class="form-select">
                            <option value="weekly"${currentViewMode === 'weekly' ? ' selected' : ''}>📅 Weekly</option>
                            <option value="fortnightly"${currentViewMode === 'fortnightly' ? ' selected' : ''}>📅 Fortnightly</option>
                            <option value="monthly"${currentViewMode === 'monthly' ? ' selected' : ''}>📅 Monthly</option>
                            <option value="quarterly"${currentViewMode === 'quarterly' ? ' selected' : ''}>📅 Quarterly</option>
                            <option value="yearly"${currentViewMode === 'yearly' ? ' selected' : ''}>📅 Yearly</option>
                        </select>
                    </div>
                    <button id="addBudgetBtn" class="btn btn-primary">
                        ➕ Add Budget
                    </button>
                </div>
            </div>

            <!-- Summary Cards -->
            <div class="summary-cards">
                <div class="card green">
                    <h3>Budgeted Income</h3>
                    <p id="totalIncome">${formatCurrency(0)}</p>
                </div>
                <div class="card red">
                    <h3>Budgeted Expenses</h3>
                    <p id="totalExpenses">${formatCurrency(0)}</p>
                </div>
                <div class="card blue">
                    <h3>Budget Surplus</h3>
                    <p id="totalBudget">${formatCurrency(0)}</p>
                </div>
                <div class="card teal">
                    <h3>Actual Balance</h3>
                    <p id="totalBalance">${formatCurrency(0)}</p>
                </div>
            </div>

            <!-- Period Info -->
            <div class="period-info">
                <p>Viewing: <strong id="periodRange">Current Month</strong></p>
            </div>

            <!-- Budgets Container -->
            <div id="budgetContainer" class="budgets-list"></div>

            <!-- Quick Actions -->
            <div class="quick-actions">
                <div class="quick-action-btn" id="quickAddIncome">
                    <span class="icon">💰</span>
                    <span class="label">Add Income</span>
                </div>
                <div class="quick-action-btn" id="quickAddExpense">
                    <span class="icon">💸</span>
                    <span class="label">Add Expense</span>
                </div>
                <div class="quick-action-btn" id="quickDuplicate">
                    <span class="icon">📋</span>
                    <span class="label">Duplicate Budgets</span>
                </div>
            </div>
        </div>
    `;

    // Remove loading state
    mainContent.classList.remove('budget-loading');

    // Setup event listeners
    setupEventListeners(currentViewMode);

    // Load and render budgets
    await loadAndRenderBudgets(currentViewMode);
}

// --- EVENT LISTENERS SETUP ---
function setupEventListeners(viewMode) {
    // View mode change
    const viewModeSelect = document.getElementById('budgetViewMode');
    if (viewModeSelect) {
        viewModeSelect.addEventListener('change', async () => {
            await loadAndRenderBudgets(viewModeSelect.value);
        });
    }

    // Add budget button
    const addBudgetBtn = document.getElementById('addBudgetBtn');
    if (addBudgetBtn) {
        addBudgetBtn.addEventListener('click', () => {
            showBudgetEditor(null, viewMode);
        });
    }

    // Quick actions
    document.getElementById('quickAddIncome')?.addEventListener('click', () => {
        showQuickAddForm('income', viewMode);
    });

    document.getElementById('quickAddExpense')?.addEventListener('click', () => {
        showQuickAddForm('expense', viewMode);
    });

    document.getElementById('quickDuplicate')?.addEventListener('click', () => {
        duplicateBudgets(viewMode);
    });
}

// --- LOAD AND RENDER BUDGETS ---
async function loadAndRenderBudgets(viewMode) {
    try {
        const [budgets, transactions, categories, accounts] = await Promise.all([
            getAllItems(STORE_NAMES.budgets),
            getAllItems(STORE_NAMES.transactions),
            getAllItems(STORE_NAMES.categories),
            getAllItems(STORE_NAMES.accounts)
        ]);

        // Update period range display
        const periodStart = getPeriodStartDate(viewMode);
        const periodEnd = getPeriodEndDate(viewMode);
        const periodRange = document.getElementById('periodRange');
        if (periodRange) {
            periodRange.textContent = `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;
        }

        renderBudgets(budgets, transactions, categories, accounts, viewMode);
    } catch (error) {
        console.error('Error loading budgets:', error);
        showError('Failed to load budgets. Please try again.');
    }
}

// --- RENDER BUDGETS ---
function renderBudgets(budgets, transactions, categories, accounts, viewMode) {
    const container = document.getElementById('budgetContainer');
    if (!container) return;

    // Clear container
    container.innerHTML = '';

    if (budgets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No Budgets Yet</h3>
                <p>Start by creating your first budget to track your finances.</p>
                <button id="createFirstBudget" class="btn btn-primary">
                    Create Your First Budget
                </button>
            </div>
        `;
        
        document.getElementById('createFirstBudget')?.addEventListener('click', () => {
            showBudgetEditor(null, viewMode);
        });
        return;
    }

    // Calculate totals
    const periodStart = getPeriodStartDate(viewMode);
    const periodStartISO = periodStart.toISOString();
    
    let totalIncome = 0;
    let totalExpenses = 0;
    
    budgets.forEach(budget => {
        const cat = categories.find(c => c.id === budget.categoryId);
        if (cat?.type === 'income') {
            totalIncome += convertAmount(budget.amount || 0, budget.frequency || 'monthly', viewMode);
        } else {
            totalExpenses += convertAmount(budget.amount || 0, budget.frequency || 'monthly', viewMode);
        }
    });

    const budgetSurplus = totalIncome - totalExpenses;
    
    // Calculate actuals
    const actualIncome = transactions
        .filter(t => t.type === 'income' && t.date >= periodStartISO)
        .reduce((sum, t) => sum + t.amount, 0);
    
    const actualExpenses = transactions
        .filter(t => t.type === 'expense' && t.date >= periodStartISO)
        .reduce((sum, t) => sum + t.amount, 0);
    
    const actualBalance = actualIncome - actualExpenses;

    // Update summary cards
    updateSummaryCards(totalIncome, totalExpenses, budgetSurplus, actualBalance);

    // Separate income and expense budgets
    const incomeBudgets = budgets.filter(budget => {
        const cat = categories.find(c => c.id === budget.categoryId);
        return cat?.type === 'income';
    });

    const expenseBudgets = budgets.filter(budget => {
        const cat = categories.find(c => c.id === budget.categoryId);
        return cat?.type !== 'income';
    });

    // Render income section
    if (incomeBudgets.length > 0) {
        const incomeHeader = document.createElement('div');
        incomeHeader.className = 'budgets-section-header';
        incomeHeader.innerHTML = `<h3>💰 Income Budgets</h3>`;
        container.appendChild(incomeHeader);

        incomeBudgets.forEach(budget => {
            container.appendChild(createBudgetCard(budget, categories, transactions, periodStartISO, viewMode));
        });
    }

    // Render expense section
    if (expenseBudgets.length > 0) {
        const expenseHeader = document.createElement('div');
        expenseHeader.className = 'budgets-section-header';
        expenseHeader.innerHTML = `<h3>💸 Expense Budgets</h3>`;
        container.appendChild(expenseHeader);

        expenseBudgets.forEach(budget => {
            container.appendChild(createBudgetCard(budget, categories, transactions, periodStartISO, viewMode));
        });
    }
}

// --- CREATE BUDGET CARD ---
function createBudgetCard(budget, categories, transactions, periodStartISO, viewMode) {
    const cat = categories.find(c => c.id === budget.categoryId);
    const icon = budget.icon || guessCategoryIcon(cat?.name);
    const isIncome = cat?.type === 'income';
    
    // Calculate normalized amounts
    const normalizedGoal = convertAmount(budget.amount || 0, budget.frequency || 'monthly', viewMode);
    
    const spentInPeriod = transactions
        .filter(t => {
            const isCorrectType = isIncome ? t.type === 'income' : t.type === 'expense';
            return isCorrectType && 
                   t.categoryId === budget.categoryId &&
                   t.date >= periodStartISO;
        })
        .reduce((sum, t) => sum + t.amount, 0);

    const remaining = Math.max(normalizedGoal - spentInPeriod, 0);
    const percent = normalizedGoal > 0 ? Math.min((spentInPeriod / normalizedGoal) * 100, 100) : 0;
    
    const isOverBudget = isIncome ? 
        spentInPeriod < normalizedGoal : 
        spentInPeriod > normalizedGoal;

    // Create card element
    const card = document.createElement('div');
    card.className = `budget-card ${isOverBudget ? 'over-budget' : ''} ${isIncome ? 'income-budget' : 'expense-budget'}`;
    card.dataset.id = budget.id;

    card.innerHTML = `
        <div class="budget-card-row1">
            <div class="budget-left">
                <span class="category-icon">${icon}</span>
                <div>
                    <div class="category-name">${cat?.name || 'Unknown Category'}</div>
                    <small style="color: var(--text-muted);">${budget.frequency || 'monthly'} budget</small>
                </div>
                <div class="budget-values">
                    ${formatCurrency(spentInPeriod)} / ${formatCurrency(normalizedGoal)}
                    <span style="color: var(--${percent > 100 ? 'danger' : 'success'});">
                        · ${percent.toFixed(0)}%
                    </span>
                </div>
            </div>
            <div class="budget-actions">
                <button class="action-btn edit-btn" data-action="edit" data-id="${budget.id}" title="Edit Budget">
                    ✏️
                </button>
                <button class="action-btn delete-btn" data-action="delete" data-id="${budget.id}" title="Delete Budget">
                    🗑️
                </button>
            </div>
        </div>
        <div class="budget-card-row2">
            <div class="sub-progress-bar-container">
                <div class="sub-progress-bar" style="width: ${percent}%"></div>
            </div>
            <div class="budget-status">
                ${isIncome ? 'Earned' : 'Spent'} ${formatCurrency(spentInPeriod)} of ${formatCurrency(normalizedGoal)}
                · ${formatCurrency(remaining)} ${isIncome ? 'to earn' : 'remaining'}
                · ${isOverBudget ? 
                    `<span class="status-over">⚠️ ${isIncome ? 'Behind target' : 'Over budget'}</span>` : 
                    `<span class="status-good">✅ On track</span>`
                }
            </div>
        </div>
    `;

    // Add event listeners
    card.querySelector('.edit-btn').addEventListener('click', () => {
        showBudgetEditor(budget, viewMode);
    });

    card.querySelector('.delete-btn').addEventListener('click', async () => {
        if (confirm(`Delete budget for "${cat?.name}"?`)) {
            await deleteItem(STORE_NAMES.budgets, budget.id);
            await loadAndRenderBudgets(viewMode);
        }
    });

    return card;
}

// --- UPDATE SUMMARY CARDS ---
function updateSummaryCards(income, expenses, surplus, actual) {
    const elements = {
        totalIncome: document.getElementById('totalIncome'),
        totalExpenses: document.getElementById('totalExpenses'),
        totalBudget: document.getElementById('totalBudget'),
        totalBalance: document.getElementById('totalBalance')
    };

    if (elements.totalIncome) elements.totalIncome.textContent = formatCurrency(income);
    if (elements.totalExpenses) elements.totalExpenses.textContent = formatCurrency(expenses);
    if (elements.totalBudget) {
        elements.totalBudget.textContent = formatCurrency(surplus);
        elements.totalBudget.style.color = surplus >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    if (elements.totalBalance) {
        elements.totalBalance.textContent = formatCurrency(actual);
        elements.totalBalance.style.color = actual >= 0 ? 'var(--success)' : 'var(--danger)';
    }
}

// --- SHOW BUDGET EDITOR ---
async function showBudgetEditor(existingBudget, viewMode) {
    const categories = await getAllItems(STORE_NAMES.categories);
    const container = document.getElementById('budgetContainer');
    
    // Remove any existing editor
    container.querySelectorAll('.budget-editor').forEach(el => el.remove());
    
    const form = document.createElement('div');
    form.className = 'budget-editor';
    form.innerHTML = `
        <div class="budget-form-card">
            <h3>${existingBudget ? '✏️ Edit Budget' : '➕ Add New Budget'}</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Icon</label>
                    <div class="icon-input">
                        <input type="text" id="budgetIcon" 
                               value="${existingBudget?.icon || ''}" 
                               placeholder="💰" maxlength="2">
                    </div>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select id="budgetCategory" class="form-select" required>
                        <option value="">-- Select Category --</option>
                        ${categories.map(cat => `
                            <option value="${cat.id}" 
                                    data-type="${cat.type}"
                                    ${existingBudget?.categoryId === cat.id ? 'selected' : ''}>
                                ${cat.icon || guessCategoryIcon(cat.name)} ${cat.name}
                                <span class="category-badge ${cat.type}">${cat.type}</span>
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Goal Amount</label>
                    <input type="number" id="budgetAmount" 
                           class="form-input" 
                           value="${existingBudget?.amount || ''}" 
                           placeholder="0.00" 
                           min="0" step="0.01" required>
                </div>
                <div class="form-group">
                    <label>Frequency</label>
                    <select id="budgetFrequency" class="form-select" required>
                        <option value="weekly" ${existingBudget?.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                        <option value="fortnightly" ${existingBudget?.frequency === 'fortnightly' ? 'selected' : ''}>Fortnightly</option>
                        <option value="monthly" ${existingBudget?.frequency === 'monthly' || !existingBudget ? 'selected' : ''}>Monthly</option>
                        <option value="quarterly" ${existingBudget?.frequency === 'quarterly' ? 'selected' : ''}>Quarterly</option>
                        <option value="yearly" ${existingBudget?.frequency === 'yearly' ? 'selected' : ''}>Yearly</option>
                    </select>
                </div>
            </div>
            <div class="form-actions">
                <button id="saveBudget" class="btn btn-primary">
                    💾 Save Budget
                </button>
                <button id="cancelBudget" class="btn btn-secondary">
                    Cancel
                </button>
            </div>
        </div>
    `;

    // Insert form
    if (existingBudget) {
        const budgetCard = container.querySelector(`.budget-card[data-id="${existingBudget.id}"]`);
        if (budgetCard) {
            budgetCard.insertAdjacentElement('afterend', form);
        } else {
            container.prepend(form);
        }
    } else {
        container.prepend(form);
    }

    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Add auto-icon selection
    const categorySelect = document.getElementById('budgetCategory');
    const iconInput = document.getElementById('budgetIcon');
    
    categorySelect.addEventListener('change', () => {
        const selectedOption = categorySelect.selectedOptions[0];
        if (selectedOption && !iconInput.value.trim()) {
            const cat = categories.find(c => c.id === categorySelect.value);
            iconInput.value = cat?.icon || guessCategoryIcon(cat?.name);
        }
    });

    // Save button
    document.getElementById('saveBudget').addEventListener('click', async () => {
        await saveBudget(existingBudget, viewMode);
    });

    // Cancel button
    document.getElementById('cancelBudget').addEventListener('click', () => {
        form.remove();
    });
}

// --- SAVE BUDGET ---
async function saveBudget(existingBudget, viewMode) {
    const categoryId = document.getElementById('budgetCategory').value;
    const amount = parseFloat(document.getElementById('budgetAmount').value);
    const icon = document.getElementById('budgetIcon').value.trim() || '💰';
    const frequency = document.getElementById('budgetFrequency').value;

    if (!categoryId || isNaN(amount) || amount <= 0) {
        alert('Please select a category and enter a valid goal amount.');
        return;
    }

    const budgetData = {
        id: existingBudget?.id || generateId(),
        categoryId,
        amount,
        icon,
        frequency,
        createdAt: existingBudget?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        if (existingBudget) {
            await updateItem(STORE_NAMES.budgets, budgetData);
        } else {
            await addItem(STORE_NAMES.budgets, budgetData);
        }
        
        await loadAndRenderBudgets(viewMode);
    } catch (error) {
        console.error('Error saving budget:', error);
        alert('Failed to save budget. Please try again.');
    }
}

// --- QUICK ADD FORM ---
function showQuickAddForm(type, viewMode) {
    alert(`Quick ${type} budget form coming soon!`);
    // You can implement a simplified form here
}

// --- DUPLICATE BUDGETS ---
async function duplicateBudgets(viewMode) {
    if (!confirm('Duplicate all budgets for next period?')) return;
    
    const budgets = await getAllItems(STORE_NAMES.budgets);
    
    for (const budget of budgets) {
        const newBudget = {
            ...budget,
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        await addItem(STORE_NAMES.budgets, newBudget);
    }
    
    alert(`Duplicated ${budgets.length} budgets for next period.`);
    await loadAndRenderBudgets(viewMode);
}

// --- ERROR HANDLING ---
function showError(message) {
    const container = document.getElementById('budgetContainer');
    if (container) {
        container.innerHTML = `
            <div class="empty-state" style="border-color: var(--danger);">
                <h3>⚠️ Error</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn btn-secondary">
                    Retry
                </button>
            </div>
        `;
    }
}