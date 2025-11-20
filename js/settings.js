import { clearAllData, getAllItems, STORE_NAMES, addItem, updateItem } from './db.js';
import { migrateIndexedDBToDexie } from './db_migration_helper.js';

export function initSettingsUI() {
  const mainContent = document.getElementById('mainContent');
  if (!mainContent) {
    alert('mainContent is missing in DOM!');
    return;
  }

  mainContent.innerHTML = `
    <h2>Settings</h2>

    <section>
      <h3>Preferences</h3>
      <label>
        Default Currency:
        <select id="currencySelect"></select>
      </label>
      <button class="button" id="saveCurrency">Save</button>
    </section>

    <section>
      <h3>Theme</h3>
      <label>
        <select id="themeSelect">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <button class="button" id="applyTheme">Apply Theme</button>
    </section>

    <section>
      <h3>Data Backup</h3>
      <button class="button" id="exportData">Export Data</button>
      <input type="file" id="importFile" style="display:none" accept=".json" />
      <button class="button" id="importData">Import Data</button>
    </section>

    <section>
      <h3>Migration</h3>
      <button class="button" id="btnMigrateToDexie">Migrate to Dexie</button>
    </section>

    <section>
      <h3>Reset</h3>
      <button class="button red" id="clearData">Clear All Data</button>
    </section>
  `;

  // === Preferences ===
  const currencySelect = document.getElementById('currencySelect');
  const currencies = ['AUD', 'USD', 'EUR', 'INR', 'GBP', 'JPY'];
  const savedCurrency = localStorage.getItem('currency') || 'USD';
  currencies.forEach(cur => {
    const option = document.createElement('option');
    option.value = cur;
    option.textContent = cur;
    if (cur === savedCurrency) option.selected = true;
    currencySelect.appendChild(option);
  });

  // === Migration Button ===
  const migrateBtn = document.getElementById('btnMigrateToDexie');
  if (migrateBtn) {
    migrateBtn.addEventListener('click', async () => {
      if (confirm('⚠️ Migrate all data to new Dexie database? This will copy everything safely.')) {
        try {
          await migrateIndexedDBToDexie();
          alert('✅ Migration complete! You can now use Dexie-based db_dexie.js.');
        } catch (err) {
          console.error('❌ Migration failed:', err);
          alert('Migration failed. Check console for details.');
        }
      }
    });
  }

  // === Theme setup ===
  const themeSelect = document.getElementById('themeSelect');
  const currentTheme = getTheme();
  themeSelect.value = currentTheme;
  setTheme(currentTheme);

  document.getElementById('saveCurrency').addEventListener('click', () => {
    const currency = currencySelect.value;
    localStorage.setItem('currency', currency);
    alert(`Currency set to ${currency}`);
  });

  document.getElementById('applyTheme').addEventListener('click', () => {
    const theme = themeSelect.value;
    setTheme(theme);
    alert(`Theme set to ${theme}`);
  });

  // === Export Data ===
  document.getElementById('exportData').addEventListener('click', async () => {
    const allData = {};
    for (const store of Object.values(STORE_NAMES)) {
      allData[store] = await getAllItems(store);
    }
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'budget-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // === Import Data (safe add/update hybrid) ===
  document.getElementById('importData').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });

  document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    try {
      const data = JSON.parse(text);
      console.log('📦 Importing data from JSON...');

      let totalImported = 0;
      for (const store of Object.values(STORE_NAMES)) {
        if (Array.isArray(data[store])) {
          console.group(`📂 Importing store: ${store}`);
          for (const item of data[store]) {
            try {
              await addItem(store, item);
              totalImported++;
            } catch (err) {
              if (err.name === 'ConstraintError') {
                await updateItem(store, item);
              } else {
                console.error(`❌ Failed to import item in ${store}:`, err);
              }
            }
          }
          console.groupEnd();
        }
      }

      console.log(`✅ Import complete. ${totalImported} records added/updated.`);
      alert('✅ Data imported successfully! Reloading app...');
      location.reload();
    } catch (err) {
      alert('❌ Import failed: Invalid JSON or schema mismatch.');
      console.error(err);
    }
  });

  // === Clear All Data ===
  document.getElementById('clearData').addEventListener('click', () => {
    if (confirm('⚠️ This will delete all data and reset the app. Continue?')) {
      clearAllData().then(() => {
        localStorage.clear();
        alert('All data cleared.');
        location.reload();
      });
    }
  });
}

// === Helpers ===
function getTheme() {
  return localStorage.getItem('theme') || 'light';
}

function setTheme(theme) {
  localStorage.setItem('theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}
