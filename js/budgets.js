import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES, generateId } from './db.js';

// --- NEW HELPER FUNCTION ---
/**
 * Calculates the start date of the current period based on view mode.
 * @param {string} viewMode - 'weekly', 'monthly', 'yearly', etc.
 * @returns {Date} The starting date of the current period.
 */
function getPeriodStartDate(viewMode) {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (viewMode) {
        case 'weekly':
            // Start of the current week (Sunday)
            date.setDate(now.getDate() - now.getDay());
            break;
        case 'fortnightly':
            // Custom fortnight logic: use a fixed anchor date (e.g., the first day of the epoch)
            // For simplicity, let's just go back 14 days from a Monday anchor
            date.setDate(now.getDate() - (now.getDay() + 6) % 7 - 14); 
            // Better to use transaction date or a fixed start point
            break;
        case 'monthly':
            // Start of the current month
            date.setDate(1);
            break;
        case 'quarterly':
            // Start of the current quarter
            const currentQuarter = Math.floor(now.getMonth() / 3);
            date.setMonth(currentQuarter * 3, 1);
            break;
        case 'yearly':
            // Start of the current year
            date.setMonth(0, 1);
            break;
    }
    // Reset time to 00:00:00 for accurate comparison
    date.setHours(0, 0, 0, 0);
    return date;
}
// --- END NEW HELPER FUNCTION ---

export async function initBudgetsUI() {
    console.log("✅ initBudgetsUI running…");
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        console.error("No #mainContent element found");
        return;
    }

    // Preserve the current view mode selection across re-renders
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
        <div id="budgetContainer" class="budgets-container"></div>
    `;

    const viewModeSelect = document.getElementById('budgetViewMode');
    viewModeSelect.addEventListener('change', () => {
        console.log('Global view mode changed to:', viewModeSelect.value);
        initBudgetsUI(); 
    });

    const viewMode = viewModeSelect.value;
    console.log('Rendering budgets in view mode:', viewMode);

    const [budgets, transactions, categories] = await Promise.all([
        getAllItems(STORE_NAMES.budgets),
        getAllItems(STORE_NAMES.transactions),
        getAllItems(STORE_NAMES.categories)
    ]);

    const container = document.getElementById('budgetContainer');
    container.innerHTML = '';

    if (budgets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No budgets yet. Click "Add Budget" to create one.</p>
            </div>
        `;
    } else {
        // Calculate the start of the current period based on the selected viewMode
        const periodStartDate = getPeriodStartDate(viewMode);
        const periodStartISO = periodStartDate.toISOString();

        budgets.forEach(budget => {
            const cat = categories.find(c => c.id === budget.categoryId);
            const icon = budget.icon || guessCategoryIcon(cat?.name);
            const goal = budget.amount || 0;

            // 1. Filter transactions to the current time period AND category
            const spentInPeriod = transactions
                .filter(t => 
                    t.type === 'expense' && 
                    t.categoryId === budget.categoryId &&
                    // CRITICAL FILTER: Only transactions after the period start date
                    t.date >= periodStartISO 
                )
                .reduce((sum, t) => sum + t.amount, 0);

            // 2. Normalize the budget GOAL amount from its stored frequency to the view mode frequency
            const normalizedGoal = convertAmount(goal, budget.frequency || 'monthly', viewMode);
            
            // 3. Normalized Spent is now simply the total spent in the current period
            const normalizedSpent = spentInPeriod; 
            
            const remaining = Math.max(normalizedGoal - normalizedSpent, 0);
            const percent = normalizedGoal > 0 ? Math.min((normalizedSpent / normalizedGoal) * 100, 100) : 0;
            const isOverBudget = normalizedSpent > normalizedGoal;

            const budgetCard = document.createElement('div');
            budgetCard.className = `budget-card ${isOverBudget ? 'over-budget' : ''}`;
            budgetCard.innerHTML = `
                <div class="budget-main">
                    <div class="budget-icon">${icon}</div>
                    <div class="budget-details">
                        <div class="budget-name">${cat?.name || 'Unknown'}</div>
                        <div class="budget-meta">
                            <span class="frequency">${budget.frequency} budget</span>
                            <span class="view-mode">Viewing: ${viewMode}</span>
                        </div>
                        <div class="budget-progress">
                            <div class="progress-bar-container">
                                <div class="progress-bar" style="width:${percent}%"></div>
                            </div>
                            <div class="progress-info">
                                <span class="spent">$${normalizedSpent.toFixed(2)}</span>
                                <span class="goal"> / $${normalizedGoal.toFixed(2)}</span>
                                <span class="percent">(${percent.toFixed(0)}%)</span>
                            </div>
                        </div>
                        <div class="budget-stats">
                            <span class="remaining">💰 $${remaining.toFixed(2)} remaining</span>
                            <span class="status ${isOverBudget ? 'over' : 'under'}">
                                ${isOverBudget ? '⚠️ Over Budget' : '✅ On Track'}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="budget-actions">
                    <button class="budget-btn edit-btn" data-id="${budget.id}">✏️</button>
                    <button class="budget-btn delete-btn" data-id="${budget.id}">🗑️</button>
                </div>
            `;

            budgetCard.querySelector('.delete-btn').addEventListener('click', async () => {
                if (confirm(`Delete budget for "${cat?.name}"?`)) {
                    await deleteItem(STORE_NAMES.budgets, budget.id);
                    initBudgetsUI();
                }
            });

            budgetCard.querySelector('.edit-btn').addEventListener('click', () => {
                showInlineEditor(budget, categories);
            });

            container.appendChild(budgetCard);
        });
    }

    document.getElementById('addBudgetBtn').addEventListener('click', () => {
        showInlineEditor(null, categories);
    });
}

// KEEP THE ORIGINAL WORKING showInlineEditor FUNCTION
function showInlineEditor(existing, categories) {
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
                            return `<option value="${c.id}" ${c.id === existing?.categoryId ? 'selected' : ''}>${icon} ${c.name}</option>`;
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

    container.prepend(form);

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
            console.log('✅ Budget saved successfully', budgetData);
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

// KEEP THE ORIGINAL HELPER FUNCTIONS
function convertAmount(amount, fromFreq, toFreq) {
    const correctMultipliers = {
        weekly:      { weekly: 1,     fortnightly: 2,   monthly: 4.33,     quarterly: 13,    yearly: 52 },
        fortnightly: { weekly: 0.5,   fortnightly: 1,   monthly: 2.17,     quarterly: 6.5,   yearly: 26 },
        monthly:     { weekly: 1/4.33, fortnightly: 1/2.17, monthly: 1,    quarterly: 3,     yearly: 12 },
        quarterly:   { weekly: 1/13,   fortnightly: 1/6.5,  monthly: 1/3,  quarterly: 1,     yearly: 4 }, 
        yearly:      { weekly: 1/52,   fortnightly: 1/26,   monthly: 1/12, quarterly: 1/4,   yearly: 1 } 
    };
    
    const map = correctMultipliers[fromFreq];
    
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
        pets: '🐾', kids: '🧒', gifts: '🎁'
    };
    const key = Object.keys(map).find(k => name?.toLowerCase().includes(k));
    return map[key] || '💼';
}