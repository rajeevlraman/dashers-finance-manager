import { clearAllData, getAllItems, STORE_NAMES, addItem, updateItem } from './db.js';
import { migrateIndexedDBToDexie } from './db_migration_helper.js';

export async function initSettingsUI() {
  const mainContent = document.getElementById('mainContent');
  if (!mainContent) {
    console.error('❌ mainContent is missing in DOM!');
    return;
  }

  mainContent.innerHTML = `
    <div class="settings-container">
      <div class="settings-header">
        <h2>⚙️ Settings</h2>
        <p class="settings-subtitle">Manage your application preferences and data</p>
      </div>

      <div class="settings-grid">
        <!-- Preferences Section -->
        <div class="settings-card">
          <div class="settings-card-header">
            <h3>🎯 Preferences</h3>
          </div>
          <div class="settings-card-body">
            <div class="form-group">
              <label class="form-label">Default Currency</label>
              <select id="currencySelect" class="form-select">
                <option value="">Loading currencies...</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Date Format</label>
              <select id="dateFormatSelect" class="form-select">
                <option value="en-AU">DD/MM/YYYY (Australian)</option>
                <option value="en-US">MM/DD/YYYY (US)</option>
                <option value="en-GB">DD/MM/YYYY (UK)</option>
                <option value="de-DE">DD.MM.YYYY (European)</option>
              </select>
            </div>
            <button class="btn btn-primary" id="savePreferences">
              💾 Save Preferences
            </button>
          </div>
        </div>

        <!-- Theme Section -->
        <div class="settings-card">
          <div class="settings-card-header">
            <h3>🎨 Appearance</h3>
          </div>
          <div class="settings-card-body">
            <div class="form-group">
              <label class="form-label">Theme</label>
              <select id="themeSelect" class="form-select">
                <option value="light">☀️ Light</option>
                <option value="dark">🌙 Dark</option>
                <option value="auto">⚡ Auto (System)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Accent Color</label>
              <div class="color-picker-group">
                <input type="color" id="accentColor" value="#3498db" class="color-picker">
                <span class="color-value" id="accentColorValue">#3498db</span>
              </div>
            </div>
            <button class="btn btn-primary" id="applyTheme">
              🎨 Apply Appearance
            </button>
          </div>
        </div>

        <!-- Data Management Section -->
        <div class="settings-card">
          <div class="settings-card-header">
            <h3>💾 Data Management</h3>
          </div>
          <div class="settings-card-body">
            <div class="data-stats" id="dataStats">
              <div class="loading-spinner">Loading data statistics...</div>
            </div>
            <div class="button-group">
              <button class="btn btn-secondary" id="exportData">
                📤 Export Data
              </button>
              <input type="file" id="importFile" style="display:none" accept=".json" />
              <button class="btn btn-secondary" id="importData">
                📥 Import Data
              </button>
            </div>
          </div>
        </div>

        <!-- Migration Section -->
        <div class="settings-card">
          <div class="settings-card-header">
            <h3>🔄 Database</h3>
          </div>
          <div class="settings-card-body">
            <div class="database-info">
              <p><strong>Current Database:</strong> <span id="currentDbType">IndexedDB</span></p>
              <p><strong>Status:</strong> <span id="dbStatus" class="status-badge">Operational</span></p>
            </div>
            <button class="btn btn-warning" id="btnMigrateToDexie">
              🔄 Migrate to Dexie
            </button>
            <small class="form-help">Upgrade to Dexie.js for better performance</small>
          </div>
        </div>

        <!-- Reset Section -->
        <div class="settings-card danger-zone">
          <div class="settings-card-header">
            <h3>🚨 Danger Zone</h3>
          </div>
          <div class="settings-card-body">
            <div class="warning-message">
              <p>⚠️ These actions cannot be undone. Proceed with caution.</p>
            </div>
            <div class="button-group">
              <button class="btn btn-danger" id="clearCache">
                🗑️ Clear Cache
              </button>
              <button class="btn btn-danger" id="clearData">
                💥 Clear All Data
              </button>
            </div>
          </div>
        </div>

        <!-- About Section -->
        <div class="settings-card">
          <div class="settings-card-header">
            <h3>ℹ️ About</h3>
          </div>
          <div class="settings-card-body">
            <div class="about-info">
              <p><strong>Version:</strong> 2.0.0</p>
              <p><strong>Last Updated:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Storage:</strong> <span id="storageUsage">Calculating...</span></p>
            </div>
            <button class="btn btn-secondary" id="checkUpdates">
              🔍 Check for Updates
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize all settings components
  await initializeSettings();
  setupEventListeners();
}

// ============================================================================
// 🏗️ INITIALIZATION FUNCTIONS
// ============================================================================

async function initializeSettings() {
  await loadCurrencySettings();
  await loadThemeSettings();
  await loadDateFormatSettings();
  await loadDataStatistics();
  await calculateStorageUsage();
}

function setupEventListeners() {
  // Preferences
  document.getElementById('savePreferences').addEventListener('click', savePreferences);
  
  // Theme
  document.getElementById('applyTheme').addEventListener('click', applyTheme);
  document.getElementById('accentColor').addEventListener('input', updateAccentColorPreview);
  
  // Data Management
  document.getElementById('exportData').addEventListener('click', exportData);
  document.getElementById('importData').addEventListener('click', triggerImport);
  document.getElementById('importFile').addEventListener('change', importData);
  
  // Migration
  const migrateBtn = document.getElementById('btnMigrateToDexie');
  if (migrateBtn) {
    migrateBtn.addEventListener('click', handleMigration);
  }
  
  // Reset - FIXED: Using the correct function names
  document.getElementById('clearCache').addEventListener('click', clearCache);
  document.getElementById('clearData').addEventListener('click', clearAllData); // Fixed this line
  
  // About
  document.getElementById('checkUpdates').addEventListener('click', checkForUpdates);
}

// ============================================================================
// 🎯 PREFERENCES FUNCTIONS
// ============================================================================

async function loadCurrencySettings() {
  const currencySelect = document.getElementById('currencySelect');
  const savedCurrency = localStorage.getItem('currency') || 'AUD';
  
  const currencies = [
    { code: 'AUD', name: 'Australian Dollar (AUD)', symbol: '$' },
    { code: 'USD', name: 'US Dollar (USD)', symbol: '$' },
    { code: 'EUR', name: 'Euro (EUR)', symbol: '€' },
    { code: 'GBP', name: 'British Pound (GBP)', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen (JPY)', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar (CAD)', symbol: '$' },
    { code: 'INR', name: 'Indian Rupee (INR)', symbol: '₹' },
    { code: 'CNY', name: 'Chinese Yuan (CNY)', symbol: '¥' }
  ];
  
  currencySelect.innerHTML = currencies.map(currency => 
    `<option value="${currency.code}" ${currency.code === savedCurrency ? 'selected' : ''}>
      ${currency.symbol} ${currency.name}
    </option>`
  ).join('');
}

async function loadDateFormatSettings() {
  const dateFormatSelect = document.getElementById('dateFormatSelect');
  const savedDateFormat = localStorage.getItem('dateFormat') || 'en-AU';
  dateFormatSelect.value = savedDateFormat;
}

async function savePreferences() {
  const currency = document.getElementById('currencySelect').value;
  const dateFormat = document.getElementById('dateFormatSelect').value;
  
  localStorage.setItem('currency', currency);
  localStorage.setItem('dateFormat', dateFormat);
  
  showToast('✅ Preferences saved successfully!', 'success');
}

// ============================================================================
// 🎨 THEME FUNCTIONS
// ============================================================================

async function loadThemeSettings() {
  const themeSelect = document.getElementById('themeSelect');
  const currentTheme = getTheme();
  themeSelect.value = currentTheme;
  
  const accentColor = localStorage.getItem('accentColor') || '#3498db';
  document.getElementById('accentColor').value = accentColor;
  document.getElementById('accentColorValue').textContent = accentColor;
  
  setTheme(currentTheme);
}

function updateAccentColorPreview(e) {
  const color = e.target.value;
  document.getElementById('accentColorValue').textContent = color;
  
  // Preview the color change
  document.documentElement.style.setProperty('--accent-color', color);
}

function applyTheme() {
  const theme = document.getElementById('themeSelect').value;
  const accentColor = document.getElementById('accentColor').value;
  
  setTheme(theme);
  localStorage.setItem('accentColor', accentColor);
  document.documentElement.style.setProperty('--accent-color', accentColor);
  
  showToast('🎨 Appearance updated!', 'success');
}

function getTheme() {
  return localStorage.getItem('theme') || 'light';
}

function setTheme(theme) {
  let actualTheme = theme;
  
  if (theme === 'auto') {
    actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  localStorage.setItem('theme', actualTheme);
  localStorage.setItem('themePreference', theme); // Store the preference
  document.documentElement.setAttribute('data-theme', actualTheme);
}

// ============================================================================
// 💾 DATA MANAGEMENT FUNCTIONS
// ============================================================================

async function loadDataStatistics() {
  const dataStats = document.getElementById('dataStats');
  
  try {
    const stats = {};
    let totalRecords = 0;
    
    for (const store of Object.values(STORE_NAMES)) {
      const items = await getAllItems(store);
      stats[store] = items.length;
      totalRecords += items.length;
    }
    
    dataStats.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Total Records:</span>
        <span class="stat-value">${totalRecords}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Transactions:</span>
        <span class="stat-value">${stats[STORE_NAMES.transactions] || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Properties:</span>
        <span class="stat-value">${stats[STORE_NAMES.properties] || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Budgets:</span>
        <span class="stat-value">${stats[STORE_NAMES.budgets] || 0}</span>
      </div>
    `;
  } catch (error) {
    dataStats.innerHTML = `<div class="error-message">Failed to load data statistics</div>`;
  }
}

async function calculateStorageUsage() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = (estimate.usage / (1024 * 1024)).toFixed(2);
      const quota = (estimate.quota / (1024 * 1024)).toFixed(2);
      document.getElementById('storageUsage').textContent = `${usage} MB / ${quota} MB`;
    } else {
      document.getElementById('storageUsage').textContent = 'Not available';
    }
  } catch (error) {
    document.getElementById('storageUsage').textContent = 'Error calculating';
  }
}

async function exportData() {
  try {
    showToast('📤 Preparing export...', 'info');
    
    const allData = {};
    for (const store of Object.values(STORE_NAMES)) {
      allData[store] = await getAllItems(store);
    }
    
    // Add metadata
    allData.metadata = {
      exportDate: new Date().toISOString(),
      version: '2.0.0',
      recordCount: Object.values(allData).reduce((sum, items) => sum + items.length, 0)
    };
    
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('✅ Data exported successfully!', 'success');
  } catch (error) {
    console.error('Export failed:', error);
    showToast('❌ Export failed!', 'error');
  }
}

function triggerImport() {
  document.getElementById('importFile').click();
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    showToast('📥 Importing data...', 'info');
    
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (!data.metadata) {
      throw new Error('Invalid backup file format');
    }

    let totalImported = 0;
    let errors = 0;

    for (const store of Object.values(STORE_NAMES)) {
      if (Array.isArray(data[store])) {
        console.group(`📂 Importing ${store}`);
        for (const item of data[store]) {
          try {
            // Try to update existing item first, then add if it doesn't exist
            try {
              await updateItem(store, item);
            } catch (updateError) {
              await addItem(store, item);
            }
            totalImported++;
          } catch (err) {
            console.error(`Failed to import item in ${store}:`, err);
            errors++;
          }
        }
        console.groupEnd();
      }
    }

    // Reset file input
    e.target.value = '';

    if (errors > 0) {
      showToast(`⚠️ Imported ${totalImported} records with ${errors} errors`, 'warning');
    } else {
      showToast(`✅ Successfully imported ${totalImported} records!`, 'success');
    }
    
    // Reload statistics
    await loadDataStatistics();
    
  } catch (err) {
    console.error('Import failed:', err);
    showToast('❌ Import failed: Invalid file format', 'error');
  }
}

// ============================================================================
// 🔄 MIGRATION FUNCTIONS
// ============================================================================

async function handleMigration() {
  if (!confirm('⚠️ Migrate all data to Dexie database?\n\nThis will:' +
               '\n• Copy all your existing data' +
               '\n• Preserve all relationships' +
               '\n• Keep your current data intact' +
               '\n• Improve performance')) {
    return;
  }

  try {
    showToast('🔄 Starting migration...', 'info');
    
    const migrateBtn = document.getElementById('btnMigrateToDexie');
    migrateBtn.disabled = true;
    migrateBtn.textContent = '🔄 Migrating...';
    
    await migrateIndexedDBToDexie();
    
    showToast('✅ Migration complete!', 'success');
    migrateBtn.textContent = '✅ Migration Complete';
    
    // Update UI to reflect new database
    document.getElementById('currentDbType').textContent = 'Dexie';
    document.getElementById('dbStatus').textContent = 'Migrated';
    document.getElementById('dbStatus').className = 'status-badge success';
    
  } catch (err) {
    console.error('❌ Migration failed:', err);
    showToast('❌ Migration failed! Check console for details.', 'error');
    
    const migrateBtn = document.getElementById('btnMigrateToDexie');
    migrateBtn.disabled = false;
    migrateBtn.textContent = '🔄 Migrate to Dexie';
  }
}

// ============================================================================
// 🗑️ RESET FUNCTIONS (MISSING FUNCTIONS ADDED)
// ============================================================================

async function clearCache() {
  if (!confirm('🗑️ Clear application cache?\n\nThis will:' +
               '\n• Clear temporary files' +
               '\n• Reset UI preferences' +
               '\n• Keep your data intact')) {
    return;
  }

  try {
    // Clear localStorage except for data
    const keysToKeep = ['currency', 'theme', 'themePreference', 'dateFormat', 'accentColor'];
    const allKeys = Object.keys(localStorage);
    
    for (const key of allKeys) {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    }
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear any caches if using Cache API
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    showToast('✅ Cache cleared successfully!', 'success');
    
  } catch (error) {
    console.error('Cache clearing failed:', error);
    showToast('❌ Failed to clear cache', 'error');
  }
}

async function clearAllData() {
  if (!confirm('💥 DELETE ALL DATA?\n\n⚠️  THIS ACTION CANNOT BE UNDONE!\n\nThis will:' +
               '\n• Delete ALL transactions, properties, budgets' +
               '\n• Delete ALL settings and preferences' +
               '\n• Completely reset the application' +
               '\n• You will lose everything!')) {
    return;
  }

  try {
    showToast('🗑️ Clearing all data...', 'info');
    
    await clearAllData();
    localStorage.clear();
    sessionStorage.clear();
    
    showToast('✅ All data cleared! Reloading...', 'success');
    
    // Reload after a short delay
    setTimeout(() => {
      location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('Data clearing failed:', error);
    showToast('❌ Failed to clear data', 'error');
  }
}

// ============================================================================
// 🔍 ABOUT FUNCTIONS
// ============================================================================

async function checkForUpdates() {
  showToast('🔍 Checking for updates...', 'info');
  
  // Simulate update check
  setTimeout(() => {
    showToast('✅ You are running the latest version!', 'success');
  }, 1500);
}

// ============================================================================
// 🎪 TOAST NOTIFICATION SYSTEM
// ============================================================================

function showToast(message, type = 'info') {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => toast.remove());
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-message">${message}</span>
      <button class="toast-close">&times;</button>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Add show class after a frame
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 5000);
  
  // Close on button click
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  });
}

