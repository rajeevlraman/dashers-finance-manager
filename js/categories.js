import { addItem, getAllItems, deleteItem, updateItem, STORE_NAMES } from './db.js';
import { setupEmojiPicker } from './emojiPicker.js';
import { generateId } from './db.js';
import { addDefaultCategories, shouldAddDefaultCategories } from './defaultCategories.js';

export async function initCategoriesUI() {
  const mainContent = document.getElementById('mainContent');
  mainContent.classList.add('page-transition');
  
  let categories = await getAllItems(STORE_NAMES.categories);

  // Add default categories if this is first time
  if (shouldAddDefaultCategories(categories)) {
    const addedCount = await addDefaultCategories({
      getAllItems,
      addItem, 
      STORE_NAMES
    });
    console.log(`📦 Added ${addedCount} default categories`);
    categories = await getAllItems(STORE_NAMES.categories);
  }

  mainContent.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>📂 Categories</h2>
        <div class="page-actions">
          <button id="btnNewCat" class="btn btn-primary">➕ Add Category</button>
          <button id="btnResetDefaults" class="btn btn-secondary">🔄 Reset to Defaults</button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="card green">
          <h3>Total Categories</h3>
          <p class="summary-count">${categories.length}</p>
        </div>
        <div class="card blue">
          <h3>Income Categories</h3>
          <p class="summary-count">${categories.filter(c => c.type === 'income').length}</p>
        </div>
        <div class="card red">
          <h3>Expense Categories</h3>
          <p class="summary-count">${categories.filter(c => c.type === 'expense').length}</p>
        </div>
        <div class="card teal">
          <h3>Subcategories</h3>
          <p class="summary-count">${categories.filter(c => c.parentId).length}</p>
        </div>
      </div>

      <div class="section-card">
        <div class="categories-controls">
          <div class="search-box">
            <input type="text" id="categorySearch" placeholder="🔍 Search categories..." class="form-input">
          </div>
          <div class="filter-controls">
            <select id="categoryTypeFilter" class="form-select">
              <option value="all">All Types</option>
              <option value="income">💰 Income</option>
              <option value="expense">💸 Expense</option>
              <option value="parent">📁 Main Categories</option>
              <option value="child">↪️ Subcategories</option>
            </select>
          </div>
        </div>
        <div id="catList"></div>
      </div>
    </div>
  `;

  setTimeout(() => mainContent.classList.remove('page-transition'), 400);

  const catList = document.getElementById('catList');
  renderCategoryTable(categories);

  document.getElementById('btnNewCat').addEventListener('click', () => openCatEditor());
  document.getElementById('btnResetDefaults').addEventListener('click', resetToDefaultCategories);
  
  // Add search and filter functionality
  document.getElementById('categorySearch').addEventListener('input', () => renderCategoryTable(categories));
  document.getElementById('categoryTypeFilter').addEventListener('change', () => renderCategoryTable(categories));

  // ========== IMPROVED RENDER CATEGORY TABLE ==========
  function renderCategoryTable(cats) {
    const searchTerm = document.getElementById('categorySearch').value.toLowerCase();
    const typeFilter = document.getElementById('categoryTypeFilter').value;

    if (cats.length === 0) {
      catList.innerHTML = `
        <div class="empty-state">
          <p>No categories yet.</p>
          <button class="btn btn-primary" onclick="openCatEditor()">➕ Add Your First Category</button>
        </div>
      `;
      return;
    }

    // Filter categories
    const filteredCats = cats.filter(cat => {
      const matchesSearch = cat.name.toLowerCase().includes(searchTerm);
      let matchesType = true;
      
      switch (typeFilter) {
        case 'income': matchesType = cat.type === 'income'; break;
        case 'expense': matchesType = cat.type === 'expense'; break;
        case 'parent': matchesType = !cat.parentId; break;
        case 'child': matchesType = !!cat.parentId; break;
      }
      
      return matchesSearch && matchesType;
    });

    if (filteredCats.length === 0) {
      catList.innerHTML = `
        <div class="empty-state">
          <p>No categories match your search criteria.</p>
          <button class="btn btn-secondary" onclick="document.getElementById('categorySearch').value=''; document.getElementById('categoryTypeFilter').value='all'; renderCategoryTable(categories)">Clear Filters</button>
        </div>
      `;
      return;
    }

    const topCats = filteredCats.filter(c => !c.parentId);
    const subCats = filteredCats.filter(c => c.parentId);
    
    const incomeCats = topCats.filter(c => c.type === 'income');
    const expenseCats = topCats.filter(c => c.type === 'expense');

    catList.innerHTML = `
      <div class="categories-grid">
        <!-- Income Section -->
        ${incomeCats.length > 0 ? `
          <div class="category-section">
            <h3 class="section-title income-title">
              <span class="section-count">${incomeCats.length}</span>
              💰 INCOME CATEGORIES
            </h3>
            <div class="categories-list">
              ${incomeCats.map(c => renderCategoryCard(c)).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Expense Section -->
        ${expenseCats.length > 0 ? `
          <div class="category-section">
            <h3 class="section-title expense-title">
              <span class="section-count">${expenseCats.length}</span>
              💸 EXPENSE CATEGORIES
            </h3>
            <div class="categories-list">
              ${expenseCats.map(c => renderCategoryCard(c)).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Subcategories Only Section (when filtered) -->
        ${typeFilter === 'child' && subCats.length > 0 ? `
          <div class="category-section">
            <h3 class="section-title">
              <span class="section-count">${subCats.length}</span>
              ↪️ SUBCATEGORIES
            </h3>
            <div class="categories-list">
              ${subCats.map(sub => renderSubcategoryCard(sub, cats)).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Add event listeners
    attachCategoryEventListeners();
  }

  function renderCategoryCard(category) {
    const children = categories.filter(s => s.parentId === category.id);
    const hasChildren = children.length > 0;

    return `
      <div class="category-card ${category.type}" data-id="${category.id}">
        <div class="category-header">
          <span class="tree-arrow ${hasChildren ? 'closed' : 'empty'}" data-id="${category.id}">
            ${hasChildren ? '▶' : ''}
          </span>

          <div class="category-icon">${category.icon || guessCategoryIcon(category.name)}</div>
          
          <div class="category-info">
            <div class="category-name">${category.name}</div>
            <div class="category-meta">
              <span class="category-type-badge ${category.type}">${category.type === 'income' ? '💰 Income' : '💸 Expense'}</span>
              ${hasChildren ? `<span class="subcount-badge">${children.length} sub</span>` : ''}
            </div>
          </div>

          <div class="category-actions">
            <button class="action-btn add-btn" data-id="${category.id}" data-action="addSub" title="Add Subcategory">➕</button>
            <button class="action-btn edit-btn" data-id="${category.id}" data-action="edit" title="Edit">✏️</button>
            <button class="action-btn delete-btn" data-id="${category.id}" data-action="delete" title="Delete">🗑️</button>
          </div>
        </div>

        ${hasChildren ? `
          <div class="subcategories-list" id="sub-${category.id}" style="display:none;">
            ${children.map(sub => renderSubcategoryCard(sub, categories)).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderSubcategoryCard(subcategory, allCategories) {
    const parent = allCategories.find(c => c.id === subcategory.parentId);
    
    return `
      <div class="subcategory-item" data-id="${subcategory.id}">
        <span class="sub-icon">${subcategory.icon || guessCategoryIcon(subcategory.name)}</span>
        
        <div class="subcategory-info">
          <span class="sub-name">${subcategory.name}</span>
          <small class="sub-parent">Under: ${parent?.name || 'Unknown'}</small>
        </div>
        
        <div class="subcategory-actions">
          <button class="action-btn edit-btn" data-id="${subcategory.id}" data-action="edit" title="Edit">✏️</button>
          <button class="action-btn delete-btn" data-id="${subcategory.id}" data-action="delete" title="Delete">🗑️</button>
        </div>
      </div>
    `;
  }

  function attachCategoryEventListeners() {
    // Handle action buttons
    catList.querySelectorAll('.action-btn').forEach(btn => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;

      btn.addEventListener('click', async (e) => {
        e.stopPropagation();

        if (action === 'edit') {
          openCatEditor(id);
        } else if (action === 'delete') {
          const category = categories.find(c => c.id === id);
          const childCount = categories.filter(c => c.parentId === id).length;
          
          let message = `Delete category "${category?.name}"?`;
          if (childCount > 0) {
            message += ` This will also delete ${childCount} subcategor${childCount === 1 ? 'y' : 'ies'}.`;
          }
          
          if (confirm(message)) {
            await deleteItem(STORE_NAMES.categories, id);
            // Delete subcategories
            const subs = categories.filter(s => s.parentId === id);
            for (const sub of subs) await deleteItem(STORE_NAMES.categories, sub.id);
            initCategoriesUI();
          }
        } else if (action === 'addSub') {
          openCatEditor(null, id);
        }
      });
    });

    // Improved tree collapse/expand
    catList.querySelectorAll('.tree-arrow:not(.empty)').forEach(arrow => {
      arrow.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = arrow.dataset.id;
        const list = document.getElementById(`sub-${id}`);
        if (!list) return;

        const isOpening = list.style.display === 'none';
        
        if (isOpening) {
          list.style.display = 'block';
          arrow.classList.remove('closed');
          arrow.classList.add('open');
          arrow.innerHTML = '▼';
        } else {
          list.style.display = 'none';
          arrow.classList.remove('open');
          arrow.classList.add('closed');
          arrow.innerHTML = '▶';
        }
      });
    });
  }

  // ========== RESET TO DEFAULTS ==========
  async function resetToDefaultCategories() {
    if (confirm('This will delete ALL your current categories and restore the default set. This action cannot be undone. Continue?')) {
      // Delete all existing categories
      const existingCategories = await getAllItems(STORE_NAMES.categories);
      for (const category of existingCategories) {
        await deleteItem(STORE_NAMES.categories, category.id);
      }
      
      // Add default categories
      await addDefaultCategories({
        getAllItems,
        addItem,
        STORE_NAMES
      });
      
      initCategoriesUI();
    }
  }

  // ========== IMPROVED CATEGORY EDITOR ==========
  async function openCatEditor(id = null, parentId = null) {
    const allCats = await getAllItems(STORE_NAMES.categories);
    const cat = id
      ? allCats.find(c => c.id === id)
      : { name: '', type: 'expense', parentId: parentId || null, icon: '' };

    const isSubcategory = parentId || (cat && cat.parentId);
    
    mainContent.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h2>${id ? '✏️ Edit' : isSubcategory ? '➕ Add Subcategory' : '➕ Add Category'}</h2>
        </div>

        <div class="section-card">
          <form id="catForm" class="styled-form">
            <div class="form-group">
              <label class="form-label">Name</label>
              <input type="text" name="name" value="${cat.name}" class="form-input" required placeholder="Enter category name">
            </div>

            <div class="form-group">
              <label class="form-label">Type</label>
              <select name="type" class="form-select" ${isSubcategory ? 'disabled' : ''}>
                <option value="expense" ${cat.type === 'expense' ? 'selected' : ''}>💸 Expense</option>
                <option value="income" ${cat.type === 'income' ? 'selected' : ''}>💰 Income</option>
              </select>
              ${isSubcategory ? '<small class="form-hint">Subcategories inherit type from parent</small>' : ''}
            </div>

            <div class="form-group">
              <label class="form-label">Icon</label>
              <div class="icon-input-group">
                <input type="text" name="icon" value="${cat.icon || ''}" class="form-input icon-input" placeholder="💡" maxlength="2">
                <button type="button" id="emojiBtn" class="btn btn-secondary">😀 Pick Emoji</button>
              </div>
              <small class="form-hint">Leave empty for auto-suggestion</small>
              <div id="emojiPicker" class="emoji-picker" style="display:none;"></div>
            </div>

            ${!isSubcategory ? `
              <div class="form-group">
                <label class="form-label">Parent Category</label>
                <select name="parentId" class="form-select">
                  <option value="">None (Main Category)</option>
                  ${allCats
                    .filter(c => !c.parentId && c.id !== id)
                    .map(c => `<option value="${c.id}" ${c.id === cat.parentId ? 'selected' : ''}>${c.icon || guessCategoryIcon(c.name)} ${c.name}</option>`)
                    .join('')}
                </select>
                <small class="form-hint">Select to make this a subcategory</small>
              </div>
            ` : `<input type="hidden" name="parentId" value="${parentId || cat.parentId}">`}

            <div class="form-actions">
              <button type="submit" class="btn btn-primary">💾 ${id ? 'Update' : 'Add'} Category</button>
              <button type="button" id="cancelBtn" class="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = document.getElementById('catForm');
    const iconInput = form.icon;
    const nameInput = form.name;

    // Auto-suggest icon
    nameInput.addEventListener('input', e => {
      if (!iconInput.value.trim()) {
        iconInput.value = guessCategoryIcon(e.target.value);
      }
    });

    // Emoji picker
    setupEmojiPicker('#emojiBtn', 'input[name="icon"]');

    document.getElementById('cancelBtn').addEventListener('click', initCategoriesUI);

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const formData = new FormData(form);
      
      const newCat = {
        id: cat.id || generateId(),
        name: formData.get('name').trim(),
        type: isSubcategory ? allCats.find(c => c.id === (parentId || cat.parentId))?.type || 'expense' : formData.get('type'),
        icon: formData.get('icon').trim() || guessCategoryIcon(formData.get('name')),
        parentId: isSubcategory ? (parentId || cat.parentId) : (formData.get('parentId') || null),
        createdAt: cat.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        if (id) {
          await updateItem(STORE_NAMES.categories, newCat);
        } else {
          await addItem(STORE_NAMES.categories, newCat);
        }
        initCategoriesUI();
      } catch (error) {
        alert('Error saving category: ' + error.message);
      }
    });
  }
}

// 🎨 Improved emoji guesser
function guessCategoryIcon(name = '') {
  const map = {
    // Income
    salary: '💵', income: '💰', business: '💼', freelance: '👨‍💻',
    investment: '📈', dividend: '📊', rental: '🏠', bonus: '🎁',
    refund: '🔄', gift: '🎁', government: '🏛️',
    
    // Expenses
    food: '🍽️', groceries: '🛒', restaurant: '🍕', coffee: '☕',
    utilities: '💡', electricity: '⚡', water: '💧', gas: '🔥',
    rent: '🏠', mortgage: '🏡', transport: '🚗', fuel: '⛽',
    car: '🚙', insurance: '🛡️', health: '⚕️', medical: '🏥',
    dental: '🦷', pharmacy: '💊', entertainment: '🎬', movies: '🎥',
    sports: '⚽', gym: '💪', shopping: '🛍️', clothes: '👕',
    electronics: '📱', gifts: '🎁', travel: '✈️', hotel: '🏨',
    education: '🎓', books: '📚', pets: '🐾', kids: '🧒',
    baby: '👶', maintenance: '🔧', fees: '💳', tax: '📝',
    charity: '❤️', savings: '💰', investment: '📈', loan: '🏦'
  };
  
  const lowerName = name.toLowerCase();
  const key = Object.keys(map).find(k => lowerName.includes(k));
  return map[key] || (lowerName.includes('sub') ? '↪️' : '📁');
}