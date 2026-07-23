import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES, generateId } from './db.js';
import { escapeHtml } from './sanitize.js';

// --- HELPER FUNCTION ---
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
    }
    date.setHours(0, 0, 0, 0);
    return date;
}

export async function initBudgetsUI() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        console.error("No #mainContent element found");
        return;
    }

    const currentViewMode = document.getElementById('budgetViewMode')?.value || 'monthly';

    mainContent.innerHTML = `
        <div class="budgets-header">
            <h2>🎯 Budgets</h2>
            <div class="budgets-controls">
                <div class="view-mode">
                    <label class="form-label">View As:</label>
                    <select id="budgetViewMode" class="form-select">
                        <option value="weekly"${currentViewMode === 'weekly' ? ' selected' : ''}>Weekly</option>
                        <option value="fortnightly"${currentViewMode === 'fortnightly' ? ' selected' : ''}>Fortnightly</option>
                        <option value="monthly"${currentViewMode === 'monthly' ? ' selected' : ''}>Monthly</option>
                        <option value="quarterly"${currentViewMode === 'quarterly' ? ' selected' : ''}>Quarterly</option>
                        <option value="yearly"${currentViewMode === 'yearly' ? ' selected' : ''}>Yearly</option>
                    </select>
                </div>
                <button id="addBudgetBtn" class="btn-primary">➕ Add Budget</button>
            </div>
        </div>

        <div class="summary-cards">
            <div class="card green"><h3>Budget Income</h3><p id="totalIncome">$0.00</p></div>
            <div class="card red"><h3>Budget Expenses</h3><p id="totalExpenses">$0.00</p></div>
            <div class="card blue"><h3>Budget Surplus</h3><p id="totalBudget">$0.00</p></div>
            <div class="card teal"><h3>Actual Balance</h3><p id="totalBalance">$0.00</p></div>
        </div>

        <div id="budgetContainer" class="budgets-container"></div>
    `;

    const viewModeSelect = document.getElementById('budgetViewMode');
    viewModeSelect.addEventListener('change', () => {
        initBudgetsUI(); 
    });

    const viewMode = viewModeSelect.value;

    const [budgets, transactions, categories] = await Promise.all([
        getAllItems(STORE_NAMES.budgets),
        getAllItems(STORE_NAMES.transactions),
        getAllItems(STORE_NAMES.categories)
    ]);

    const container = document.getElementById('budgetContainer');
    container.innerHTML = '';

    // Get income categories dynamically from your categories data
    const incomeCategories = categories.filter(cat => 
        cat.type === 'income' || 
        cat.name?.toLowerCase().includes('salary') || 
        cat.name?.toLowerCase().includes('income')
    ).map(cat => cat.id);

    const expenseCategories = categories.filter(cat => 
        cat.type === 'expense' || 
        !incomeCategories.includes(cat.id)
    ).map(cat => cat.id);

    // Calculate totals with frequency conversion
    let totalIncome = 0;
    let totalExpenses = 0;

    budgets.forEach(budget => {
        const normalizedAmount = convertAmount(
            budget.amount || 0, 
            budget.frequency || 'monthly', 
            viewMode
        );

        if (incomeCategories.includes(budget.categoryId)) {
            totalIncome += normalizedAmount;
        } else if (expenseCategories.includes(budget.categoryId)) {
            totalExpenses += normalizedAmount;
        }
    });

    const budgetSurplus = totalIncome - totalExpenses;
    
    // Calculate actual balance from transactions in current period
    const periodStartDate = getPeriodStartDate(viewMode);
    const periodStartISO = periodStartDate.toISOString();
    
    const actualIncome = transactions
        .filter(t => t.type === 'income' && t.date >= periodStartISO)
        .reduce((sum, t) => sum + t.amount, 0);
        
    const actualExpenses = transactions
        .filter(t => t.type === 'expense' && t.date >= periodStartISO)
        .reduce((sum, t) => sum + t.amount, 0);
        
    // actualExpenses is a sum of real expense transactions, which are stored
    // as negative amounts, so balance is the sum, not income minus expenses.
    const actualBalance = actualIncome + actualExpenses;

    // Update the totals on the UI
    document.getElementById('totalIncome').textContent = `$${totalIncome.toFixed(2)}`;
    document.getElementById('totalExpenses').textContent = `$${totalExpenses.toFixed(2)}`;
    document.getElementById('totalBudget').textContent = `$${budgetSurplus.toFixed(2)}`;
    document.getElementById('totalBudget').className = budgetSurplus >= 0 ? 'positive' : 'negative';
    document.getElementById('totalBalance').textContent = `$${actualBalance.toFixed(2)}`;
    document.getElementById('totalBalance').className = actualBalance >= 0 ? 'positive' : 'negative';

    if (budgets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No budgets yet. Click "Add Budget" to create one.</p>
            </div>
        `;
    } else {
        // Separate income and expense budgets
        const incomeBudgets = budgets.filter(budget => incomeCategories.includes(budget.categoryId));
        const expenseBudgets = budgets.filter(budget => expenseCategories.includes(budget.categoryId));

        // Add income section header if there are income budgets
        if (incomeBudgets.length > 0) {
            const incomeHeader = document.createElement('div');
            incomeHeader.className = 'budgets-section-header';
            incomeHeader.innerHTML = `<h3>💰 Income Budgets</h3>`;
            container.appendChild(incomeHeader);
        }

        // Render income budgets first
        incomeBudgets.forEach(budget => {
            renderBudgetCard(budget, categories, transactions, incomeCategories, periodStartISO, viewMode, container);
        });

        // Add expense section header if there are expense budgets
        if (expenseBudgets.length > 0) {
            const expenseHeader = document.createElement('div');
            expenseHeader.className = 'budgets-section-header';
            expenseHeader.innerHTML = `<h3>💸 Expense Budgets</h3>`;
            container.appendChild(expenseHeader);
        }

        // Render expense budgets after income
        expenseBudgets.forEach(budget => {
            renderBudgetCard(budget, categories, transactions, incomeCategories, periodStartISO, viewMode, container);
        });
    }

    document.getElementById('addBudgetBtn').addEventListener('click', () => {
        showInlineEditor(null, categories);
    });
}

function renderBudgetCard(budget, categories, transactions, incomeCategories, periodStartISO, viewMode, container) {
    const cat = categories.find(c => c.id === budget.categoryId);
    const icon = budget.icon || guessCategoryIcon(cat?.name);
    const goal = budget.amount || 0;

    // Filter transactions to current period AND category
    const spentInPeriod = transactions
        .filter(t => {
            // For income budgets, track income transactions; for expense budgets, track expense transactions
            const isCorrectType = incomeCategories.includes(budget.categoryId) 
                ? t.type === 'income' 
                : t.type === 'expense';
            
            return isCorrectType && 
                   t.categoryId === budget.categoryId &&
                   t.date >= periodStartISO;
        })
        .reduce((sum, t) => sum + t.amount, 0);

    // Normalize both goal and spent to current view mode
    const normalizedGoal = convertAmount(goal, budget.frequency || 'monthly', viewMode);
    const normalizedSpent = spentInPeriod; 
    
    // For income budgets, we want to track how much we've earned vs goal
    // For expense budgets, we track how much we've spent vs goal
    const remaining = incomeCategories.includes(budget.categoryId) 
        ? Math.max(normalizedGoal - normalizedSpent, 0)
        : Math.max(normalizedGoal - normalizedSpent, 0);
    
    const percent = normalizedGoal > 0 ? Math.min((normalizedSpent / normalizedGoal) * 100, 100) : 0;
    const isOverBudget = incomeCategories.includes(budget.categoryId) 
        ? normalizedSpent < normalizedGoal // For income, we're "over" if we earned less than goal
        : normalizedSpent > normalizedGoal; // For expenses, we're over if we spent more than goal

    const budgetCard = document.createElement('div');
    budgetCard.className = `budget-card ${isOverBudget ? 'over-budget' : ''} ${incomeCategories.includes(budget.categoryId) ? 'income-budget' : 'expense-budget'}`;
    budgetCard.setAttribute('data-id', budget.id); // Add data-id for finding the card later
    budgetCard.innerHTML = `
        <div class="budget-card-row1">
            <div class="budget-left">
                <span class="category-icon">${icon}</span>
                <span class="category-name">${escapeHtml(cat?.name) || 'Unknown'}</span>

                <span class="budget-values">
                    $${normalizedSpent.toFixed(2)} / $${normalizedGoal.toFixed(2)} 
                    · ${percent.toFixed(0)}%
                </span>
            </div>

            <div class="budget-actions">
                <button class="action-btn edit-btn" data-id="${budget.id}" title="Edit">✏️</button>
                <button class="action-btn delete-btn" data-id="${budget.id}" title="Delete">🗑️</button>
            </div>
        </div>

        <div class="budget-card-row2">
            <div class="sub-progress-bar-container">
                <div class="sub-progress-bar" style="width:${percent}%"></div>
            </div>

            <div class="budget-status">
                $${remaining.toFixed(2)} ${incomeCategories.includes(budget.categoryId) ? 'to earn' : 'remaining'} — 
                ${isOverBudget 
                    ? '<span class="status-over">⚠️ ' + (incomeCategories.includes(budget.categoryId) ? 'Behind' : 'Over') + '</span>' 
                    : '<span class="status-good">On Track</span>'
                }
            </div>
        </div>
    `;

    budgetCard.querySelector('.delete-btn').addEventListener('click', async () => {
        if (confirm(`Delete budget for "${cat?.name}"?`)) {
            await deleteItem(STORE_NAMES.budgets, budget.id);
            initBudgetsUI();
        }
    });

    budgetCard.querySelector('.edit-btn').addEventListener('click', () => {
        showInlineEditor(budget, categories, true); // Pass true to scroll to form
    });

    container.appendChild(budgetCard);
}

function showInlineEditor(existing, categories, scrollToForm = true) {
    const container = document.getElementById('budgetContainer');
    container.querySelectorAll('.budget-editor').forEach(el => el.remove());

    const form = document.createElement('div');
    form.className = 'budget-editor';
    form.innerHTML = `
        <div class="budget-form-card">
            <h3>${existing ? 'Edit Budget' : 'Add New Budget'}</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Icon:</label>
                    <div class="icon-input">
                        <input type="text" id="iconInput" value="${existing?.icon || ''}" placeholder="💡" maxlength="2">
                    </div>
                </div>
                <div class="form-group">
                    <label>Category:</label>
                    <select id="categoryInput" class="form-select">
                        <option value="">-- Select Category --</option>
                        ${categories.map(c => {
                            const icon = c.icon || guessCategoryIcon(c.name || '');
                            const type = c.type === 'income' ? '💰 Income' : '💸 Expense';
                            return `<option value="${c.id}" ${c.id === existing?.categoryId ? 'selected' : ''}>${icon} ${escapeHtml(c.name)} (${type})</option>`;
                        }).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Goal Amount:</label>
                    <input type="number" id="goalInput" class="form-input" placeholder="0.00" value="${existing?.amount || ''}" min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>Frequency:</label>
                    <select id="frequencyInput" class="form-select">
                        <option value="weekly"${existing?.frequency==='weekly'?' selected':''}>Weekly</option>
                        <option value="fortnightly"${existing?.frequency==='fortnightly'?' selected':''}>Fortnightly</option>
                        <option value="monthly"${existing?.frequency==='monthly'?' selected':''}>Monthly</option>
                        <option value="quarterly"${existing?.frequency==='quarterly'?' selected':''}>Quarterly</option>
                        <option value="yearly"${existing?.frequency==='yearly'?' selected':''}>Yearly</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button id="saveBudgetBtn" class="btn-primary">💾 Save</button>
                    <button id="cancelBudgetBtn" class="btn-secondary">Cancel</button>
                </div>
            </div>
        </div>
    `;

    // Insert form at the right position
    if (existing) {
        // Find the budget card being edited and insert form after it
        const budgetCard = container.querySelector(`.budget-card[data-id="${existing.id}"]`);
        if (budgetCard) {
            budgetCard.insertAdjacentElement('afterend', form);
        } else {
            container.prepend(form);
        }
    } else {
        // For new budgets, insert at the top
        container.prepend(form);
    }

    // Scroll to form if requested
    if (scrollToForm) {
        setTimeout(() => {
            form.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 100);
    }

    const catInput = document.getElementById('categoryInput');
    const iconInput = document.getElementById('iconInput');
    catInput.addEventListener('change', () => {
        if (!iconInput.value.trim()) {
            const selected = categories.find(c => c.id === catInput.value);
            iconInput.value = selected?.icon || guessCategoryIcon(selected?.name);
        }
    });

    document.getElementById('saveBudgetBtn').addEventListener('click', async () => {
        const categoryId = document.getElementById('categoryInput').value;
        const amount = parseFloat(document.getElementById('goalInput').value);
        const icon = document.getElementById('iconInput').value || '💰';
        const frequency = document.getElementById('frequencyInput').value;

        if (!categoryId || isNaN(amount)) {
            alert('Please select a category and enter a goal amount.');
            return;
        }

        const existingBudgets = await getAllItems(STORE_NAMES.budgets);
        const duplicate = existingBudgets.some(budget => 
            budget.categoryId === categoryId && 
            budget.frequency === frequency &&
            budget.id !== existing?.id
        );

        if (duplicate) {
            alert('A budget for this category and frequency already exists!');
            return;
        }

        const safeId = existing?.id || generateId();

        const budgetData = {
            id: safeId,
            categoryId,
            amount,
            icon,
            frequency,
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            if (existing) {
                await updateItem(STORE_NAMES.budgets, budgetData);
            } else {
                await addItem(STORE_NAMES.budgets, budgetData);
            }
            initBudgetsUI();
        } catch (err) {
            console.error('❌ Error saving budget:', err);
            alert('Error saving budget: ' + err.message);
        }
    });

    document.getElementById('cancelBudgetBtn').addEventListener('click', () => {
        form.remove();
    });
}

function convertAmount(amount, fromFreq, toFreq) {
    const multipliers = {
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
    
    const map = multipliers[fromFreq];
    
    if (!map) {
        console.warn('Unknown fromFreq:', fromFreq, '– using no conversion');
        return amount;
    }
    
    const factor = map[toFreq];
    
    if (factor === undefined) {
        console.warn('Cannot convert from', fromFreq, 'to', toFreq, '– using no conversion');
        return amount;
    }
    
    return amount * factor; 
}

function guessCategoryIcon(name = '') {
    const map = {
        food: '🍽️', groceries: '🛒', utilities: '💡', rent: '🏠',
        transport: '🚗', travel: '✈️', entertainment: '🎬',
        savings: '💰', salary: '💵', health: '⚕️', shopping: '🛍️',
        pets: '🐾', kids: '🧒', gifts: '🎁', income: '💰',
        business: '💼', government: '🏛️', investment: '📈',
        rental: '🏠', tax: '📝'
    };
    const key = Object.keys(map).find(k => name?.toLowerCase().includes(k));
    return map[key] || '💼';
}