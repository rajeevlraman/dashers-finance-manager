import { addItem, getAllItems, deleteItem, updateItem, STORE_NAMES } from './db.js';
import { setupEmojiPicker } from './emojiPicker.js';
import { generateId } from './db.js';
import { addDefaultCategories, shouldAddDefaultCategories } from './defaultCategories.js';

export async function initCategoriesUI() {
  const mainContent = document.getElementById('mainContent');
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
    <div class="categories-header">
      <h2>Categories</h2>
      <div class="categories-actions">
        <button id="btnNewCat" class="button">➕ Add Category</button>
        <button id="btnResetDefaults" class="button secondary">🔄 Reset to Defaults</button>
      </div>
    </div>
    <div id="catList"></div>
  `;

  const catList = document.getElementById('catList');
  renderCategoryTable(categories);

  document.getElementById('btnNewCat').addEventListener('click', () => openCatEditor());
  document.getElementById('btnResetDefaults').addEventListener('click', resetToDefaultCategories);

  // ========== RENDER CATEGORY TABLE ==========
  function renderCategoryTable(cats) {
    if (cats.length === 0) {
      catList.innerHTML = '<p>No categories defined.</p>';
      return;
    }

    const topCats = cats.filter(c => !c.parentId);
    const subCats = cats.filter(c => c.parentId);
    
    const incomeCats = topCats.filter(c => c.type === 'income');
    const expenseCats = topCats.filter(c => c.type === 'expense');

    catList.innerHTML = `
      <div class="categories-grid">
        <!-- Income Section -->
        <div class="category-section">
          <h3 class="section-title income-title">
            <span class="section-count">${incomeCats.length}</span>
            INCOME
          </h3>
          <div class="categories-list">
            ${incomeCats.map(c => renderCategoryCard(c)).join('')}
          </div>
        </div>

        <!-- Expense Section -->
        <div class="category-section">
          <h3 class="section-title expense-title">
            <span class="section-count">${expenseCats.length}</span>
            EXPENSE
          </h3>
          <div class="categories-list">
            ${expenseCats.map(c => renderCategoryCard(c)).join('')}
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    attachCategoryEventListeners();
    
    function renderCategoryCard(category) {
      const children = subCats.filter(s => s.parentId === category.id);
      
      return `
        <div class="category-card compact" data-id="${category.id}">
          <div class="category-header compact">
            <div class="category-icon compact">${category.icon || guessCategoryIcon(category.name)}</div>
            <div class="category-name compact">${category.name}</div>
            <div class="category-actions">
              <button class="action-btn edit-btn" data-id="${category.id}" data-action="edit" title="Edit">✏️</button>
              <button class="action-btn add-btn" data-id="${category.id}" data-action="addSub" title="Add Subcategory">➕</button>
              <button class="action-btn delete-btn" data-id="${category.id}" data-action="delete" title="Delete">🗑️</button>
            </div>
          </div>
          
          ${children.length > 0 ? `
            <div class="subcategories-list compact">
              ${children.map(sub => `
                <div class="subcategory-item compact">
                  <span class="sub-icon">${sub.icon || guessCategoryIcon(sub.name)}</span>
                  <span class="sub-name">${sub.name}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }

    function attachCategoryEventListeners() {
      catList.querySelectorAll('.action-btn').forEach(btn => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (action === 'edit') {
            openCatEditor(id);
          } else if (action === 'delete') {
            if (confirm('Delete this category and its subcategories?')) {
              await deleteItem(STORE_NAMES.categories, id);
              const subs = subCats.filter(s => s.parentId === id);
              for (const sub of subs) await deleteItem(STORE_NAMES.categories, sub.id);
              initCategoriesUI();
            }
          } else if (action === 'addSub') {
            openCatEditor(null, id);
          }
        });
      });
    }
  } // <-- This was missing

  // ========== RESET TO DEFAULTS ==========
  async function resetToDefaultCategories() {
    if (confirm('This will delete ALL your current categories and restore the default set. Continue?')) {
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

  // ========== CATEGORY EDITOR ==========
  async function openCatEditor(id = null, parentId = null) {
    const allCats = await getAllItems(STORE_NAMES.categories);
    const cat = id
      ? allCats.find(c => c.id === id)
      : { name: '', type: 'expense', parentId, icon: '' };

    mainContent.innerHTML = `
      <h2>${id ? 'Edit' : parentId ? 'Add Subcategory' : 'Add Category'}</h2>
      <form id="catForm" style="max-width:400px;">
        <label>Name: <input name="name" value="${cat.name}" required></label><br>

        <label>Type:
          <select name="type">
            <option value="expense" ${cat.type === 'expense' ? 'selected' : ''}>Expense</option>
            <option value="income" ${cat.type === 'income' ? 'selected' : ''}>Income</option>
          </select>
        </label><br>

        <label>Icon:
          <div style="display:flex;align-items:center;gap:0.5em;">
            <input name="icon" value="${cat.icon || ''}" placeholder="💡" maxlength="2" style="font-size:1.5em;width:3em;text-align:center;">
            <button type="button" id="emojiBtn" class="button small">😀</button>
          </div>
          <div id="emojiPicker" class="emoji-picker" style="display:none;"></div>
        </label><br>

        <label>Parent Category:
          <select name="parentId">
            <option value="">None (Main Category)</option>
            ${allCats
              .filter(c => !c.parentId)
              .map(c => `<option value="${c.id}" ${c.id === cat.parentId ? 'selected' : ''}>${c.icon || guessCategoryIcon(c.name)} ${c.name}</option>`)
              .join('')}
          </select>
        </label><br>

        <button type="submit" class="button">💾 Save</button>
        <button type="button" id="cancelBtn" class="button red">Cancel</button>
      </form>
    `;

    const form = document.getElementById('catForm');
    const iconInput = form.icon;
    const nameInput = form.name;

    // Auto-suggest icon
    nameInput.addEventListener('input', e => {
      if (!iconInput.value.trim()) iconInput.value = guessCategoryIcon(e.target.value);
    });

    // Emoji picker
    setupEmojiPicker('#emojiBtn', 'input[name="icon"]');

    document.getElementById('cancelBtn').addEventListener('click', initCategoriesUI);

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target;
      const newCat = {
        id: cat.id || generateId(),
        name: f.name.value.trim(),
        type: f.type.value,
        icon: f.icon.value.trim() || guessCategoryIcon(f.name.value),
        parentId: f.parentId.value || null,
        createdAt: cat.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const fn = id ? updateItem : addItem;
      await fn(STORE_NAMES.categories, newCat);
      initCategoriesUI();
    });
  }
}

// 🎨 Smart emoji guesser
function guessCategoryIcon(name = '') {
  const map = {
    food: '🍽️', groceries: '🛒', utilities: '💡', rent: '🏠',
    transport: '🚗', travel: '✈️', entertainment: '🎬',
    savings: '💰', salary: '💵', health: '⚕️', shopping: '🛍️',
    pets: '🐾', kids: '🧒', gifts: '🎁'
  };
  const key = Object.keys(map).find(k => name.toLowerCase().includes(k));
  return map[key] || '💼';
}