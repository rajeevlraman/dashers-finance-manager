// ============================================================================
// 💰 Budget Tracker - IndexedDB Manager (Stable Production Build)
// ----------------------------------------------------------------------------
// Handles safe initialization, schema upgrades, and CRUD operations
// without version-change race conditions or retry loops.
// ============================================================================



// 🔹 Database configuration
const DB_NAME = 'budgetTrackerDB';
const DB_VERSION = 11; // 🆙 incremented from 9 → 10 to ensure upgrade triggers

// 🔹 Centralized object store definitions
export const STORE_NAMES = {
  accounts: 'accounts',
  categories: 'categories',
  transactions: 'transactions',
  budgets: 'budgets',
  bills: 'bills',
  recurringTransactions: 'recurringTransactions',
  meta: 'meta',
  loans: 'loans',
  loanTransactions: 'loanTransactions',
  properties: 'properties',      // 🏠 NEW
  tenants: 'tenants',            // 👤 NEW
  expenses: 'expenses',
  maintenance: 'maintenance',
  costbase: 'costbase'     // 🧰 NEW
};

// ----------------------------------------------------------------------------
// 🧠 Utility: Generate unique UUIDs (v4)
// ----------------------------------------------------------------------------
export function generateId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ----------------------------------------------------------------------------
// 🧩 Internal singletons
// ----------------------------------------------------------------------------
let dbInstance = null;
let dbPromise = null; // ensures multiple calls wait for same result

// ----------------------------------------------------------------------------
// 📦 Open Database – handles version upgrades, safe initialization
// ----------------------------------------------------------------------------
export function openDb() {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    console.log(`📂 Opening IndexedDB: ${DB_NAME} (v${DB_VERSION})`);
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // ------------------------------------------------------------------------
    // 🧱 Handle schema creation & upgrade
    // ------------------------------------------------------------------------
    request.onupgradeneeded = event => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;
      const tx = event.target.transaction;

      console.log(`🛠️ Upgrading DB from v${oldVersion} → v${DB_VERSION}`);
      upgradeSchema(db, oldVersion, tx);

      // 🌱 Seed data for first-time DBs
      if (oldVersion === 0) {
        console.log("🌱 Seeding demo data...");
        seedDemoData(tx);
      }
    };

    // ------------------------------------------------------------------------
    // ✅ Successfully opened database
    // ------------------------------------------------------------------------
    request.onsuccess = event => {
      dbInstance = event.target.result;
      dbPromise = null;
      console.log("✅ DB opened successfully");
      resolve(dbInstance);
    };

    // ------------------------------------------------------------------------
    // ❌ Opening failed (permissions, blocked tab, etc.)
    // ------------------------------------------------------------------------
    request.onerror = event => {
      dbPromise = null;
      console.error("❌ DB open failed:", event.target.error);
      reject(event.target.error);
    };

    // ------------------------------------------------------------------------
    // ⚠️ Another tab still using old version
    // ------------------------------------------------------------------------
    request.onblocked = () => {
      console.warn("⚠️ DB upgrade blocked by another open session");
      reject(new Error('Database upgrade blocked'));
    };
  });

  return dbPromise;
}

// ----------------------------------------------------------------------------
// 🧱 Upgrade Schema – Create or migrate object stores
// ----------------------------------------------------------------------------
function upgradeSchema(db, oldVersion, tx) {
  const existingStores = Array.from(db.objectStoreNames);

  // Create any missing stores dynamically (safe on re-upgrade)
  for (const storeName of Object.values(STORE_NAMES)) {
    if (!existingStores.includes(storeName)) {
      const store = db.createObjectStore(storeName, { keyPath: 'id' });
      store.createIndex('updatedAt', 'updatedAt', { unique: false });

      // Add any relevant extra indexes
      switch (storeName) {
        case STORE_NAMES.loans:
          store.createIndex('type', 'type', { unique: false });
          console.log(`✅ Created store: ${storeName} (type index)`);
          break;
        case STORE_NAMES.loanTransactions:
          store.createIndex('loanId', 'loanId', { unique: false });
          store.createIndex('date', 'date', { unique: false });
          console.log(`✅ Created store: ${storeName} (loanId/date indexes)`);
          break;
        case STORE_NAMES.properties:
          store.createIndex('name', 'name', { unique: false });
          console.log(`🏠 Created store: ${storeName} (name index)`);
          break;
        case STORE_NAMES.tenants:
          store.createIndex('propertyId', 'propertyId', { unique: false });
          console.log(`👤 Created store: ${storeName} (propertyId index)`);
          break;
        case STORE_NAMES.maintenance:
          store.createIndex('propertyId', 'propertyId', { unique: false });
          store.createIndex('date', 'date', { unique: false });
          console.log(`🧰 Created store: ${storeName} (propertyId/date indexes)`);
          break;
        case STORE_NAMES.costbase:
          store.createIndex('propertyId', 'propertyId', { unique: false });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          console.log(`🧱 Created store: ${storeName} (propertyId, date, type indexes)`);
          break;

        default:
          console.log(`✅ Created store: ${storeName}`);
      }
    }
  }

  // Placeholder for future migrations
  if (oldVersion < 10) {
    console.log("🔁 Schema migrations for v10 applied (Property Manager support)");
  }
}

// ----------------------------------------------------------------------------
// 🌱 Seed Demo Data (runs only once on new DB creation)
// ----------------------------------------------------------------------------
function seedDemoData(tx) {
  try {
    const accountsStore = tx.objectStore(STORE_NAMES.accounts);
    const categoriesStore = tx.objectStore(STORE_NAMES.categories);
    const now = new Date().toISOString();

    const accounts = [
      { id: generateId(), name: 'Bank Account', type: 'bank', balance: 1000, currency: 'USD', createdAt: now, updatedAt: now },
      { id: generateId(), name: 'Wallet', type: 'cash', balance: 200, currency: 'USD', createdAt: now, updatedAt: now }
    ];

    const categories = [
      { id: generateId(), name: 'Salary', type: 'income', createdAt: now, updatedAt: now },
      { id: generateId(), name: 'Freelance', type: 'income', createdAt: now, updatedAt: now },
      { id: generateId(), name: 'Groceries', type: 'expense', createdAt: now, updatedAt: now },
      { id: generateId(), name: 'Rent', type: 'expense', createdAt: now, updatedAt: now },
      { id: generateId(), name: 'Utilities', type: 'expense', createdAt: now, updatedAt: now }
    ];

    accounts.forEach(acc => accountsStore.add(acc));
    categories.forEach(cat => categoriesStore.add(cat));

    console.log("✅ Demo data seeded successfully");
  } catch (err) {
    console.error("❌ Error seeding demo data:", err);
  }
}

// ----------------------------------------------------------------------------
// 📖 getStore() – Retrieve a store in a new transaction
// ----------------------------------------------------------------------------
function getStore(storeName, mode = 'readonly') {
  return openDb().then(db => {
    if (!db.objectStoreNames.contains(storeName)) {
      throw new Error(`❌ Store "${storeName}" not found in DB.`);
    }
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  });
}

// ----------------------------------------------------------------------------
// ✏️ CRUD Operations – Add / Update / Delete / Fetch
// ----------------------------------------------------------------------------
export async function addItem(storeName, item) {
  const store = await getStore(storeName, 'readwrite');
  if (!item.id) item.id = generateId();
  const now = new Date().toISOString();
  item.createdAt = item.createdAt || now;
  item.updatedAt = now;

  return new Promise((resolve, reject) => {
    const req = store.add(item);
    req.onsuccess = () => resolve(item);
    req.onerror = e => reject(e.target.error);
  });
}

export async function updateItem(storeName, item) {
  const store = await getStore(storeName, 'readwrite');
  item.updatedAt = new Date().toISOString();

  return new Promise((resolve, reject) => {
    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = e => reject(e.target.error);
  });
}

export async function deleteItem(storeName, id) {
  const store = await getStore(storeName, 'readwrite');

  return new Promise(async (resolve, reject) => {
    const req = store.delete(id);

    req.onsuccess = async () => {
      console.log(`🗑️ Deleted item from ${storeName}: ${id}`);

      // 🔁 Cascade cleanup if deleting a property
      if (storeName === STORE_NAMES.properties) {
        const db = await openDb();

        // Delete all tenants linked to this property
        const tenantTx = db.transaction(STORE_NAMES.tenants, 'readwrite');
        const tenantStore = tenantTx.objectStore(STORE_NAMES.tenants);
        const tenantIndex = tenantStore.index('propertyId');
        const tenantReq = tenantIndex.getAll(id);

        tenantReq.onsuccess = () => {
          tenantReq.result.forEach(t => tenantStore.delete(t.id));
          console.log(`👤 Removed ${tenantReq.result.length} tenants linked to property ${id}`);
        };

        // Delete all maintenance linked to this property
        const maintTx = db.transaction(STORE_NAMES.maintenance, 'readwrite');
        const maintStore = maintTx.objectStore(STORE_NAMES.maintenance);
        const maintIndex = maintStore.index('propertyId');
        const maintReq = maintIndex.getAll(id);

        maintReq.onsuccess = () => {
          maintReq.result.forEach(m => maintStore.delete(m.id));
          console.log(`🧰 Removed ${maintReq.result.length} maintenance logs linked to property ${id}`);
        };
      }

      resolve();
    };

    req.onerror = e => reject(e.target.error);
  });
}


export async function getAllItems(storeName) {
  const store = await getStore(storeName, 'readonly');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  });
}

// ----------------------------------------------------------------------------
// 🧹 clearAllData() – Wipe every store (use for "Reset" or import restore)
// ----------------------------------------------------------------------------
export async function clearAllData() {
  const db = await openDb();
  const promises = Object.values(STORE_NAMES).map(storeName => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).clear();
      req.onsuccess = () => resolve();
      req.onerror = e => reject(e.target.error);
    });
  });
  return Promise.all(promises);
}

// ----------------------------------------------------------------------------
// 📤 exportAllData() – Backup to JSON (for manual sync/export)
// ----------------------------------------------------------------------------
export async function exportAllData() {
  const db = await openDb();
  const exportData = {};

  for (const storeName of Object.values(STORE_NAMES)) {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    exportData[storeName] = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  console.log("📦 Export complete:", exportData);
  return exportData;
}

// ----------------------------------------------------------------------------
// 📥 importAllData() – Restore from backup JSON
// ----------------------------------------------------------------------------
export async function importAllData(data) {
  const db = await openDb();

  for (const [storeName, items] of Object.entries(data)) {
    if (!STORE_NAMES[storeName]) continue; // skip unknown stores
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    items.forEach(item => store.put(item));
  }

  console.log("✅ Import complete");
}
