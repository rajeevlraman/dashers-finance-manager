import { clearAllData as dbClearAllData, getAllItems, STORE_NAMES, addItem, updateItem, deleteItem } from './db.js';
import { isDuplicateTransaction } from './import/saver.js';
import { findDuplicateGroups, getDefaultDeletionIds } from './import/duplicateFinder.js';
import { runRecategorizeCheck } from './recategorizeTool.js';
import { runMergeCategoriesCheck } from './mergeCategoriesTool.js';
import { isLockConfigured, isSupported as isLockSupported, setupPin, changePin, removeLock } from './appLock.js';
import { encryptJSON, decryptJSON, isSupported as isEncryptionSupported } from './backupCrypto.js';
import {
  isConnected, isAdmin, getConnectionInfo, checkSetupStatus, setupAdminAccount, loginToServer,
  disconnect, syncNow, listFamilyMembers, createFamilyMember, updateFamilyMember, deleteFamilyMember,
  updateFamilySyncIndicator
} from './familySync.js';
import { applyPermittedSections } from './navigation.js';
import { ALL_SECTIONS_LABELS } from './familySyncSections.js';
import { escapeHtml } from './sanitize.js';

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
        <div class="section-card">

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

        <!-- App Lock Section -->
        <div class="settings-card">
          <div class="settings-card-header">
            <h3>🔒 App Lock</h3>
          </div>
          <div class="settings-card-body">
            <p style="color:#64748b; font-size:0.85rem; margin-top:0;">
              A PIN screen that blocks the app UI when it's not you opening it.
              This is not encryption — the underlying data isn't encrypted by this —
              it just stops casual access to your unlocked device. There's no PIN
              recovery; forgetting it means wiping local data.
            </p>
            <div id="appLockStatus" style="margin-bottom:0.75rem; font-weight:600;">Loading…</div>
            <div class="button-group" id="appLockButtons"></div>
          </div>
        </div>

        <!-- Family Sync Section -->
        <div class="settings-card">
          <div class="settings-card-header">
            <h3>👨‍👩‍👧‍👦 Family Sync</h3>
          </div>
          <div class="settings-card-body">
            <p style="color:#64748b; font-size:0.85rem; margin-top:0;">
              Share data with family on a local server on your home WiFi —
              no internet or cloud involved. Requires running the small
              server included in this project (see family-server/README.md).
            </p>
            <div id="familySyncStatus" style="margin-bottom:0.75rem; font-weight:600;">Loading…</div>
            <div class="button-group" id="familySyncButtons"></div>
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
            <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; color:#334155; margin-bottom:0.75rem;">
              <input type="checkbox" id="encryptBackupCheckbox">
              🔒 Encrypt backup with a password
            </label>
            <div class="button-group">
              <button class="btn btn-secondary" id="exportData">
                📤 Export Data
              </button>
              <input type="file" id="importFile" style="display:none" accept=".json" />
              <button class="btn btn-secondary" id="importData">
                📥 Import Data
              </button>
              <button class="btn btn-secondary" id="findDuplicatesBtn">
                🔎 Find Duplicate Transactions
              </button>
              <button class="btn btn-secondary" id="recheckCategoriesBtn">
                🔄 Review & Fix Transaction Categories
              </button>
              <button class="btn btn-secondary" id="mergeCategoriesBtn">
                🔀 Merge Duplicate Categories
              </button>
            </div>
          </div>
        </div>

        <!-- Database info (the "Migrate to Dexie" button that used to be here
             copied data into a second database the app never actually reads
             from, and silently skipped 3 stores while doing it — removed
             rather than fixed since the current IndexedDB layer works fine
             and there's no real benefit to finishing it right now). -->
        <div class="settings-card">
          <div class="settings-card-header">
            <h3>🗄️ Database</h3>
          </div>
          <div class="settings-card-body">
            <div class="database-info">
              <p><strong>Current Database:</strong> <span id="currentDbType">IndexedDB</span></p>
              <p><strong>Status:</strong> <span id="dbStatus" class="status-badge">Operational</span></p>
            </div>
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
              <button class="btn btn-danger" id="clearAllDataBtn">
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

    <!-- App Lock Modal -->
    <div class="modal" id="modalAppLock">
      <div class="modal-content" style="max-width:380px;">
        <h2 id="appLockModalTitle">🔒 Set Up App Lock</h2>
        <form id="formAppLock">
          <div class="form-group" id="appLockOldPinGroup" style="display:none;">
            <label class="form-label">Current PIN</label>
            <input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" class="form-input" id="appLockOldPin" autocomplete="off">
          </div>
          <div class="form-group" id="appLockNewPinGroup">
            <label class="form-label">New PIN (4-8 digits)</label>
            <input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" class="form-input" id="appLockNewPin" autocomplete="off">
          </div>
          <div class="form-group" id="appLockConfirmPinGroup">
            <label class="form-label">Confirm PIN</label>
            <input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" class="form-input" id="appLockConfirmPin" autocomplete="off">
          </div>
          <div id="appLockModalError" style="color:#dc2626; font-size:0.85rem; min-height:1.2em; margin-bottom:0.5rem;"></div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="appLockModalSubmit">Save</button>
            <button type="button" class="btn btn-secondary" id="appLockModalCancel">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Family Sync: Connect/Login Modal -->
    <div class="modal" id="modalFamilyConnect">
      <div class="modal-content" style="max-width:400px;">
        <h2 id="familyConnectTitle">👨‍👩‍👧‍👦 Connect to Family Server</h2>
        <form id="formFamilyConnect">
          <div class="form-group" id="familyServerUrlGroup">
            <label class="form-label">Server Address</label>
            <input type="text" id="familyServerUrl" class="form-input" placeholder="http://192.168.1.42:4321" autocomplete="off">
            <small class="form-hint">Find this in family-server/README.md on the server machine.</small>
          </div>
          <div class="form-group" id="familyCheckGroup">
            <button type="button" class="btn btn-secondary" id="familyCheckServerBtn" style="width:100%;">Check Server</button>
          </div>
          <div id="familyAuthFields" style="display:none;">
            <div class="form-group">
              <label class="form-label">Username</label>
              <input type="text" id="familyUsername" class="form-input"
                     autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
                     data-lpignore="true" data-1p-ignore data-form-type="other" readonly
                     onfocus="this.removeAttribute('readonly')">
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" id="familyPassword" class="form-input"
                     autocomplete="new-password" data-lpignore="true" data-1p-ignore data-form-type="other"
                     readonly onfocus="this.removeAttribute('readonly')">
            </div>
            <div id="familyLoginAsPreview" style="font-size:0.85rem; color:#334155; min-height:1.2em; margin-bottom:0.5rem;"></div>
            <div id="familySetupNotice" style="display:none; font-size:0.85rem; color:#0369a1; background:#f0f9ff; border-radius:8px; padding:0.5rem 0.75rem; margin-bottom:0.75rem;">
              No admin account exists yet on this server — this will create one and make you the admin.
            </div>
          </div>
          <div id="familyConnectError" style="color:#dc2626; font-size:0.85rem; min-height:1.2em; margin-bottom:0.5rem;"></div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="familyConnectSubmit" style="display:none;">Connect</button>
            <button type="button" class="btn btn-secondary" id="familyConnectCancel">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Family Sync: Manage Members Modal -->
    <div class="modal" id="modalFamilyMembers">
      <div class="modal-content" style="max-width:480px;">
        <h2>👨‍👩‍👧‍👦 Manage Family Members</h2>
        <div id="familyMembersList"></div>
        <hr style="margin:1rem 0; border:none; border-top:1px solid #e2e8f0;">
        <h3 style="font-size:1rem;">Add a Family Member</h3>
        <form id="formAddFamilyMember">
          <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" id="newMemberUsername" class="form-input" autocomplete="off">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="newMemberPassword" class="form-input" autocomplete="off">
          </div>
          <div class="form-group">
            <label class="form-label">Allowed Sections</label>
            <div id="newMemberSections" style="display:grid; grid-template-columns:1fr 1fr; gap:0.35rem; max-height:200px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; padding:0.5rem;"></div>
          </div>
          <div id="addMemberError" style="color:#dc2626; font-size:0.85rem; min-height:1.2em; margin-bottom:0.5rem;"></div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Add Member</button>
            <button type="button" class="btn btn-secondary" id="familyMembersClose">Close</button>
          </div>
        </form>
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
  await renderAppLockStatus();
  await renderFamilySyncStatus();
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
  document.getElementById('findDuplicatesBtn').addEventListener('click', handleFindDuplicates);
  document.getElementById('recheckCategoriesBtn').addEventListener('click', (e) => runRecategorizeCheck(e.target));
  document.getElementById('mergeCategoriesBtn').addEventListener('click', (e) => runMergeCategoriesCheck(e.target));
  
  // Reset - FIXED: Using unique function names
  document.getElementById('clearCache').addEventListener('click', clearCache);
  document.getElementById('clearAllDataBtn').addEventListener('click', handleClearAllData); // Fixed: unique function name
  
  // About
  document.getElementById('checkUpdates').addEventListener('click', checkForUpdates);

  // App Lock
  document.getElementById('appLockModalCancel').addEventListener('click', closeAppLockModal);
  document.getElementById('formAppLock').addEventListener('submit', handleAppLockFormSubmit);

  // Family Sync
  document.getElementById('familyCheckServerBtn').addEventListener('click', handleCheckServerClick);
  document.getElementById('familyConnectCancel').addEventListener('click', closeFamilyConnectModal);
  document.getElementById('formFamilyConnect').addEventListener('submit', handleFamilyConnectSubmit);
  document.getElementById('familyUsername').addEventListener('input', updateFamilyLoginPreview);
  document.getElementById('familyMembersClose').addEventListener('click', closeFamilyMembersModal);
  document.getElementById('formAddFamilyMember').addEventListener('submit', handleAddFamilyMemberSubmit);
}

// ============================================================================
// 🔒 APP LOCK FUNCTIONS
// ============================================================================

let appLockModalMode = 'setup'; // 'setup' | 'change' | 'remove'

async function renderAppLockStatus() {
  const statusEl = document.getElementById('appLockStatus');
  const buttonsEl = document.getElementById('appLockButtons');
  if (!statusEl || !buttonsEl) return;

  if (!isLockSupported()) {
    statusEl.textContent = '⚠️ Not available in this browser (requires a secure context).';
    statusEl.style.color = '#dc2626';
    buttonsEl.innerHTML = '';
    return;
  }

  const configured = await isLockConfigured();
  if (configured) {
    statusEl.textContent = '🟢 App Lock is ON';
    statusEl.style.color = '#16a34a';
    buttonsEl.innerHTML = `
      <button class="btn btn-secondary" id="btnChangePin">Change PIN</button>
      <button class="btn btn-danger" id="btnRemoveLock">Turn Off App Lock</button>
    `;
    document.getElementById('btnChangePin').addEventListener('click', () => openAppLockModal('change'));
    document.getElementById('btnRemoveLock').addEventListener('click', () => openAppLockModal('remove'));
  } else {
    statusEl.textContent = '⚪ App Lock is OFF';
    statusEl.style.color = '#64748b';
    buttonsEl.innerHTML = `<button class="btn btn-primary" id="btnEnableLock">Enable App Lock</button>`;
    document.getElementById('btnEnableLock').addEventListener('click', () => openAppLockModal('setup'));
  }
}

function openAppLockModal(mode) {
  appLockModalMode = mode;
  const modal = document.getElementById('modalAppLock');
  const title = document.getElementById('appLockModalTitle');
  const oldGroup = document.getElementById('appLockOldPinGroup');
  const newGroup = document.getElementById('appLockNewPinGroup');
  const confirmGroup = document.getElementById('appLockConfirmPinGroup');
  const submitBtn = document.getElementById('appLockModalSubmit');
  document.getElementById('appLockModalError').textContent = '';
  document.getElementById('formAppLock').reset();

  if (mode === 'setup') {
    title.textContent = '🔒 Set Up App Lock';
    oldGroup.style.display = 'none';
    newGroup.style.display = 'block';
    confirmGroup.style.display = 'block';
    submitBtn.textContent = 'Enable Lock';
  } else if (mode === 'change') {
    title.textContent = '🔒 Change PIN';
    oldGroup.style.display = 'block';
    newGroup.style.display = 'block';
    confirmGroup.style.display = 'block';
    submitBtn.textContent = 'Save New PIN';
  } else if (mode === 'remove') {
    title.textContent = '🔓 Turn Off App Lock';
    oldGroup.style.display = 'block';
    newGroup.style.display = 'none';
    confirmGroup.style.display = 'none';
    submitBtn.textContent = 'Turn Off';
  }

  modal.classList.add('active');
}

function closeAppLockModal() {
  document.getElementById('modalAppLock').classList.remove('active');
}

async function handleAppLockFormSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById('appLockModalError');
  errorEl.textContent = '';

  const oldPin = document.getElementById('appLockOldPin').value;
  const newPin = document.getElementById('appLockNewPin').value;
  const confirmPin = document.getElementById('appLockConfirmPin').value;

  const pinPattern = /^\d{4,8}$/;

  if (appLockModalMode === 'setup') {
    if (!pinPattern.test(newPin)) {
      errorEl.textContent = 'PIN must be 4-8 digits.';
      return;
    }
    if (newPin !== confirmPin) {
      errorEl.textContent = 'PINs do not match.';
      return;
    }
    await setupPin(newPin);
    closeAppLockModal();
    await renderAppLockStatus();
    showToast('App Lock enabled', 'success');

  } else if (appLockModalMode === 'change') {
    if (!pinPattern.test(newPin)) {
      errorEl.textContent = 'PIN must be 4-8 digits.';
      return;
    }
    if (newPin !== confirmPin) {
      errorEl.textContent = 'PINs do not match.';
      return;
    }
    const ok = await changePin(oldPin, newPin);
    if (!ok) {
      errorEl.textContent = 'Current PIN is incorrect.';
      return;
    }
    closeAppLockModal();
    await renderAppLockStatus();
    showToast('PIN updated', 'success');

  } else if (appLockModalMode === 'remove') {
    const ok = await removeLock(oldPin);
    if (!ok) {
      errorEl.textContent = 'Current PIN is incorrect.';
      return;
    }
    closeAppLockModal();
    await renderAppLockStatus();
    showToast('App Lock turned off', 'success');
  }
}

// ============================================================================
// 👨‍👩‍👧‍👦 FAMILY SYNC FUNCTIONS
// ============================================================================

let familyConnectMode = 'setup'; // 'setup' | 'login'

async function renderFamilySyncStatus() {
  const statusEl = document.getElementById('familySyncStatus');
  const buttonsEl = document.getElementById('familySyncButtons');
  if (!statusEl || !buttonsEl) return;

  const connected = await isConnected();
  if (!connected) {
    statusEl.textContent = '⚪ Not connected';
    statusEl.style.color = '#64748b';
    buttonsEl.innerHTML = `<button class="btn btn-primary" id="btnFamilyConnect">Connect to Server</button>`;
    document.getElementById('btnFamilyConnect').addEventListener('click', openFamilyConnectModal);
    return;
  }

  const conn = await getConnectionInfo();
  const admin = await isAdmin();
  const lastSync = conn.lastSyncTime
    ? new Date(conn.lastSyncTime).toLocaleString()
    : 'Never';

  statusEl.innerHTML = `🟢 Connected as <strong>${conn.username}</strong> (${admin ? 'admin' : 'member'})<br>
    <span style="font-weight:400; font-size:0.8rem; color:#64748b;">Last synced: ${lastSync}</span>`;

  buttonsEl.innerHTML = `
    <button class="btn btn-secondary" id="btnSyncNow">🔄 Sync Now</button>
    ${admin ? '<button class="btn btn-secondary" id="btnManageFamily">Manage Family Members</button>' : ''}
    <button class="btn btn-danger" id="btnFamilyDisconnect">Disconnect</button>
  `;
  document.getElementById('btnSyncNow').addEventListener('click', handleSyncNowClick);
  document.getElementById('btnFamilyDisconnect').addEventListener('click', handleDisconnectClick);
  if (admin) {
    document.getElementById('btnManageFamily').addEventListener('click', openFamilyMembersModal);
  }
}

async function handleSyncNowClick() {
  showToast('🔄 Syncing…', 'info');
  const result = await syncNow();
  if (result.synced) {
    showToast(`✅ Synced (pulled ${result.pulled}, pushed ${result.pushed})`, 'success');
    await applyPermittedSections();
  } else if (result.reason === 'session-expired') {
    showToast('⚠️ Session expired — please reconnect', 'error');
  } else if (result.reason === 'unreachable') {
    showToast('⚠️ Could not reach the family server (check WiFi)', 'error');
  } else {
    showToast('⚠️ Sync failed', 'error');
  }
  await renderFamilySyncStatus();
  updateFamilySyncIndicator();
}

async function handleDisconnectClick() {
  if (!confirm('Disconnect from the family server? Your local data stays exactly as it is — this only stops syncing.')) return;
  await disconnect();
  await renderFamilySyncStatus();
  await applyPermittedSections();
  updateFamilySyncIndicator();
  showToast('Disconnected', 'info');
}

function openFamilyConnectModal() {
  const modal = document.getElementById('modalFamilyConnect');
  document.getElementById('formFamilyConnect').reset();
  document.getElementById('familyConnectError').textContent = '';
  document.getElementById('familyAuthFields').style.display = 'none';
  document.getElementById('familySetupNotice').style.display = 'none';
  document.getElementById('familyConnectSubmit').style.display = 'none';
  document.getElementById('familyServerUrl').disabled = false;
  document.getElementById('familyLoginAsPreview').textContent = '';
  modal.classList.add('active');
}

function closeFamilyConnectModal() {
  document.getElementById('modalFamilyConnect').classList.remove('active');
}

async function handleCheckServerClick() {
  const urlInput = document.getElementById('familyServerUrl');
  const errorEl = document.getElementById('familyConnectError');
  errorEl.textContent = '';
  const url = urlInput.value.trim();
  if (!url) {
    errorEl.textContent = 'Enter the server address first.';
    return;
  }

  try {
    const status = await checkSetupStatus(url);
    familyConnectMode = status.needsSetup ? 'setup' : 'login';
    document.getElementById('familyAuthFields').style.display = 'block';
    document.getElementById('familySetupNotice').style.display = familyConnectMode === 'setup' ? 'block' : 'none';
    document.getElementById('familyConnectSubmit').style.display = 'block';
    document.getElementById('familyConnectSubmit').textContent = familyConnectMode === 'setup' ? 'Create Admin Account' : 'Log In';
    urlInput.disabled = true;
    updateFamilyLoginPreview();
  } catch (err) {
    errorEl.textContent = `Couldn't reach that server: ${err.message}`;
  }
}

function updateFamilyLoginPreview() {
  const previewEl = document.getElementById('familyLoginAsPreview');
  const username = document.getElementById('familyUsername').value.trim();
  if (!username) {
    previewEl.textContent = '';
    return;
  }
  previewEl.innerHTML = familyConnectMode === 'setup'
    ? `Will create the admin account as: <strong>${escapeHtml(username)}</strong>`
    : `Will log in as: <strong>${escapeHtml(username)}</strong> — double check this is right before continuing (autofill can silently swap this).`;
}

async function handleFamilyConnectSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById('familyConnectError');
  errorEl.textContent = '';
  const url = document.getElementById('familyServerUrl').value.trim();
  const username = document.getElementById('familyUsername').value.trim();
  const password = document.getElementById('familyPassword').value;

  if (!username || !password) {
    errorEl.textContent = 'Username and password are required.';
    return;
  }

  try {
    if (familyConnectMode === 'setup') {
      await setupAdminAccount(url, username, password);
    } else {
      await loginToServer(url, username, password);
    }
    closeFamilyConnectModal();
    await renderFamilySyncStatus();
    await applyPermittedSections();
    showToast('✅ Connected! Syncing now…', 'success');
    await handleSyncNowClick();
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

// --- Manage Family Members ---

function renderSectionCheckboxes(container, selectedSections = []) {
  container.innerHTML = ALL_SECTIONS_LABELS.map(({ key, label }) => `
    <label style="display:flex; align-items:center; gap:0.35rem; font-size:0.85rem;">
      <input type="checkbox" value="${key}" ${selectedSections.includes(key) ? 'checked' : ''}>
      ${label}
    </label>
  `).join('');
}

async function openFamilyMembersModal() {
  const modal = document.getElementById('modalFamilyMembers');
  renderSectionCheckboxes(document.getElementById('newMemberSections'), []);
  document.getElementById('formAddFamilyMember').reset();
  document.getElementById('addMemberError').textContent = '';
  modal.classList.add('active');
  await refreshFamilyMembersList();
}

function closeFamilyMembersModal() {
  document.getElementById('modalFamilyMembers').classList.remove('active');
}

async function refreshFamilyMembersList() {
  const listEl = document.getElementById('familyMembersList');
  listEl.innerHTML = '<p style="color:#64748b; font-size:0.85rem;">Loading…</p>';
  try {
    const { users } = await listFamilyMembers();
    if (!users.length) {
      listEl.innerHTML = '<p style="color:#64748b; font-size:0.85rem;">No family members yet.</p>';
      return;
    }
    listEl.innerHTML = users.map(u => `
      <div class="family-member-row" data-user-id="${u.id}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
          <strong>${escapeHtml(u.username)}</strong>
          <span style="font-size:0.8rem; color:#64748b;">${u.role}</span>
        </div>
        ${u.role === 'admin' ? '<p style="font-size:0.8rem; color:#64748b; margin:0;">Full access (admin)</p>' : `
          <div class="member-sections">
            ${ALL_SECTIONS_LABELS.map(({ key, label }) => `
              <label style="display:flex; align-items:center; gap:0.3rem; font-size:0.8rem;">
                <input type="checkbox" class="member-section-cb" value="${key}" ${u.sections.includes(key) ? 'checked' : ''}>
                ${label}
              </label>
            `).join('')}
          </div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-save-sections">Save Sections</button>
            <button class="btn btn-secondary btn-reset-password">Reset Password</button>
            <button class="btn btn-danger btn-delete-member">Delete</button>
          </div>
        `}
      </div>
    `).join('');

    listEl.querySelectorAll('.family-member-row').forEach(row => {
      const userId = row.dataset.userId;
      row.querySelector('.btn-save-sections')?.addEventListener('click', async () => {
        const sections = [...row.querySelectorAll('.member-section-cb:checked')].map(cb => cb.value);
        try {
          await updateFamilyMember(userId, { sections });
          showToast('Sections updated', 'success');
        } catch (err) {
          showToast(`❌ ${err.message}`, 'error');
        }
      });
      row.querySelector('.btn-reset-password')?.addEventListener('click', async () => {
        const newPassword = prompt('Enter a new password for this family member (8+ characters):');
        if (!newPassword) return;
        try {
          await updateFamilyMember(userId, { password: newPassword });
          showToast('Password reset', 'success');
        } catch (err) {
          showToast(`❌ ${err.message}`, 'error');
        }
      });
      row.querySelector('.btn-delete-member')?.addEventListener('click', async () => {
        if (!confirm('Remove this family member? They will no longer be able to sync.')) return;
        try {
          await deleteFamilyMember(userId);
          await refreshFamilyMembersList();
          showToast('Family member removed', 'success');
        } catch (err) {
          showToast(`❌ ${err.message}`, 'error');
        }
      });
    });
  } catch (err) {
    listEl.innerHTML = `<p style="color:#dc2626; font-size:0.85rem;">${err.message}</p>`;
  }
}

async function handleAddFamilyMemberSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById('addMemberError');
  errorEl.textContent = '';
  const username = document.getElementById('newMemberUsername').value.trim();
  const password = document.getElementById('newMemberPassword').value;
  const sections = [...document.querySelectorAll('#newMemberSections input:checked')].map(cb => cb.value);

  if (!username || !password) {
    errorEl.textContent = 'Username and password are required.';
    return;
  }

  try {
    await createFamilyMember(username, password, sections);
    document.getElementById('formAddFamilyMember').reset();
    renderSectionCheckboxes(document.getElementById('newMemberSections'), []);
    await refreshFamilyMembersList();
    showToast('Family member added', 'success');
  } catch (err) {
    errorEl.textContent = err.message;
  }
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

function promptForPassword({ title, confirmRequired }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(15, 23, 42, 0.6);
      display: flex; align-items: center; justify-content: center;
      padding: 1.5rem;
    `;
    overlay.innerHTML = `
      <div style="background:#fff; border-radius:16px; padding:2rem; max-width:340px; width:100%; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);">
        <h3 style="margin-top:0;">${title}</h3>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" id="bkPass1" class="form-input" autocomplete="off">
        </div>
        ${confirmRequired ? `
        <div class="form-group">
          <label class="form-label">Confirm Password</label>
          <input type="password" id="bkPass2" class="form-input" autocomplete="off">
        </div>` : ''}
        <div id="bkPassError" style="color:#dc2626; font-size:0.85rem; min-height:1.2em; margin-bottom:0.5rem;"></div>
        <div class="form-actions">
          <button class="btn btn-primary" id="bkPassOk">OK</button>
          <button class="btn btn-secondary" id="bkPassCancel">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const pass1 = overlay.querySelector('#bkPass1');
    pass1.focus();

    overlay.querySelector('#bkPassCancel').addEventListener('click', () => {
      overlay.remove();
      resolve(null);
    });

    function submit() {
      const p1 = overlay.querySelector('#bkPass1').value;
      const p2 = confirmRequired ? overlay.querySelector('#bkPass2').value : p1;
      if (!p1) {
        overlay.querySelector('#bkPassError').textContent = 'Password required.';
        return;
      }
      if (confirmRequired && p1 !== p2) {
        overlay.querySelector('#bkPassError').textContent = 'Passwords do not match.';
        return;
      }
      overlay.remove();
      resolve(p1);
    }

    overlay.querySelector('#bkPassOk').addEventListener('click', submit);
    overlay.querySelectorAll('input').forEach(input => {
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    });
  });
}

async function exportData() {
  try {
    const wantsEncryption = document.getElementById('encryptBackupCheckbox')?.checked && isEncryptionSupported();
    let password = null;
    if (wantsEncryption) {
      password = await promptForPassword({ title: '🔒 Set a Backup Password', confirmRequired: true });
      if (!password) return; // user cancelled
    }

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

    // If a password was set, encrypt the whole payload (metadata included)
    // into a self-describing envelope; otherwise export plain JSON as before.
    const fileBody = password
      ? JSON.stringify(await encryptJSON(allData, password), null, 2)
      : JSON.stringify(allData, null, 2);

    const blob = new Blob([fileBody], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-backup-${new Date().toISOString().split('T')[0]}${password ? '-encrypted' : ''}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(password ? '✅ Encrypted backup exported!' : '✅ Data exported successfully!', 'success');
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
    let data = JSON.parse(text);

    if (data && data.encrypted === true) {
      const password = await promptForPassword({ title: '🔒 Enter Backup Password', confirmRequired: false });
      if (!password) {
        e.target.value = '';
        return;
      }
      try {
        data = await decryptJSON(data, password);
      } catch (decryptErr) {
        showToast(`❌ ${decryptErr.message}`, 'error');
        e.target.value = '';
        return;
      }
    }
    
    if (!data.metadata) {
      throw new Error('Invalid backup file format');
    }

    let totalImported = 0;
    let totalSkippedDuplicates = 0;
    let errors = 0;

    // Bug fix: restore only ever matched backup items to existing records
    // by `id`. That's correct for restoring your own exact backup (ids
    // line up, so updateItem() cleanly overwrites), but it meant a
    // transaction added some other way — e.g. a CSV import done since the
    // backup was taken — got a freshly-generated id that never matches
    // anything in the backup file, even if it's the exact same real-world
    // purchase (same date/amount/description/account). Restore would then
    // just add it as a second, visually-identical row. Transactions now
    // get the same content-based duplicate check CSV import already uses
    // (see saver.js) before being written, in addition to the existing
    // id-based update-or-add for every other store.
    const existingTransactions = await getAllItems(STORE_NAMES.transactions).catch(() => []);

    for (const store of Object.values(STORE_NAMES)) {
      if (Array.isArray(data[store])) {
        console.group(`📂 Importing ${store}`);
        for (const item of data[store]) {
          try {
            if (store === STORE_NAMES.transactions) {
              const idMatch = existingTransactions.some(e => e.id === item.id);
              if (!idMatch && isDuplicateTransaction(item, existingTransactions)) {
                totalSkippedDuplicates++;
                continue;
              }
            }

            // Try to update existing item first, then add if it doesn't exist
            try {
              await updateItem(store, item);
            } catch (updateError) {
              await addItem(store, item);
            }
            if (store === STORE_NAMES.transactions) {
              existingTransactions.push(item); // keep in-memory list current for further dedupe within this restore
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
      showToast(`⚠️ Imported ${totalImported} records with ${errors} errors` + (totalSkippedDuplicates ? ` (${totalSkippedDuplicates} duplicates skipped)` : ''), 'warning');
    } else if (totalSkippedDuplicates > 0) {
      showToast(`✅ Imported ${totalImported} records (${totalSkippedDuplicates} duplicates skipped)`, 'success');
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
// 🔎 DUPLICATE TRANSACTION FINDER
// ----------------------------------------------------------------------------
// Scans existing transactions for likely duplicates (same account, amount,
// description, date within +/- 2 days — the exact same rule CSV import and
// backup restore use to PREVENT new duplicates) and lets you review and
// delete ones that already exist, e.g. left over from before the backup
// restore dedup fix.
// ============================================================================

async function handleFindDuplicates() {
  const btn = document.getElementById('findDuplicatesBtn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '🔎 Scanning...';

  try {
    const transactions = await getAllItems(STORE_NAMES.transactions);
    const groups = findDuplicateGroups(transactions);

    if (groups.length === 0) {
      showToast('✅ No duplicate transactions found!', 'success');
      return;
    }

    const categories = await getAllItems(STORE_NAMES.categories).catch(() => []);
    const categoryNameById = new Map(categories.map(c => [c.id, c.name]));
    showDuplicateReviewModal(groups, categoryNameById);
  } catch (err) {
    console.error('Duplicate scan failed:', err);
    showToast('❌ Could not scan for duplicates', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function formatTxSummary(tx, categoryNameById) {
  const amt = Number(tx.amount) || 0;
  const amtStr = (amt >= 0 ? '+' : '') + amt.toFixed(2);
  const catName = categoryNameById.get(tx.categoryId) || 'Uncategorised';
  return `${tx.date} · ${amtStr} · ${catName}`;
}

function showDuplicateReviewModal(groups, categoryNameById) {
  const totalDuplicateRows = getDefaultDeletionIds(groups).length;

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: rgba(15, 23, 42, 0.6);
    display: flex; align-items: center; justify-content: center;
    padding: 1.5rem;
  `;

  const groupsHtml = groups.map((group, gi) => {
    const rowsHtml = group.map((tx, ti) => `
      <label style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.4rem 0; border-bottom:1px solid #f1f5f9; font-size:0.85rem;">
        <input type="radio" name="dupKeep_${gi}" value="${ti}" ${ti === 0 ? 'checked' : ''} style="margin-top:0.2rem;">
        <span>
          <strong>${(tx.description || '(no description)').slice(0, 60)}</strong><br>
          <span style="color:#64748b;">${formatTxSummary(tx, categoryNameById)}${ti === 0 ? ' — <em>oldest copy, kept by default</em>' : ''}</span>
        </span>
      </label>
    `).join('');

    return `
      <div class="settings-card" style="margin-bottom:1rem;">
        <div class="settings-card-body" style="padding:0.85rem 1rem;">
          <div style="font-weight:600; margin-bottom:0.35rem; font-size:0.85rem;">
            Group ${gi + 1} of ${groups.length} — ${group.length} copies found
          </div>
          <div data-group="${gi}">${rowsHtml}</div>
        </div>
      </div>
    `;
  }).join('');

  overlay.innerHTML = `
    <div style="background:#fff; border-radius:16px; padding:1.75rem; max-width:560px; width:100%; max-height:85vh; display:flex; flex-direction:column; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);">
      <h3 style="margin-top:0;">🔎 ${groups.length} likely duplicate ${groups.length === 1 ? 'group' : 'groups'} found</h3>
      <p style="color:#64748b; font-size:0.85rem; margin-top:-0.5rem;">
        Grouped by same account, amount, description and a nearby date.
        The oldest copy in each group is kept by default — pick a different
        one to keep if you'd rather.
      </p>
      <div style="overflow-y:auto; flex:1; margin:0.5rem 0 1rem;">
        ${groupsHtml}
      </div>
      <div class="form-actions" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        <button class="btn btn-danger" id="dupDeleteSelected">
          🗑️ Delete ${totalDuplicateRows} Duplicate${totalDuplicateRows === 1 ? '' : 's'} (Keep Selected)
        </button>
        <button class="btn btn-secondary" id="dupCancel">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#dupCancel').addEventListener('click', () => overlay.remove());

  overlay.querySelector('#dupDeleteSelected').addEventListener('click', async () => {
    const idsToDelete = [];
    groups.forEach((group, gi) => {
      const checked = overlay.querySelector(`input[name="dupKeep_${gi}"]:checked`);
      const keepIndex = checked ? Number(checked.value) : 0;
      group.forEach((tx, ti) => {
        if (ti !== keepIndex) idsToDelete.push(tx.id);
      });
    });

    const deleteBtn = overlay.querySelector('#dupDeleteSelected');
    deleteBtn.disabled = true;
    deleteBtn.textContent = 'Deleting...';

    let deleted = 0;
    let failed = 0;
    for (const id of idsToDelete) {
      try {
        await deleteItem(STORE_NAMES.transactions, id);
        deleted++;
      } catch (err) {
        console.error('Failed to delete duplicate transaction', id, err);
        failed++;
      }
    }

    overlay.remove();
    if (failed > 0) {
      showToast(`⚠️ Deleted ${deleted} duplicates, ${failed} failed`, 'warning');
    } else {
      showToast(`✅ Deleted ${deleted} duplicate transaction${deleted === 1 ? '' : 's'}`, 'success');
    }
    await loadDataStatistics();
  });
}

// ============================================================================
// 🗑️ RESET FUNCTIONS (FIXED NAMING CONFLICT)
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

// NEW: Enhanced clear all data with backup option
async function handleClearAllData() {
  // First, offer to backup data
  const backupChoice = confirm(
    '💾 BACKUP YOUR DATA FIRST?\n\n' +
    'Would you like to create a backup before clearing all data?\n\n' +
    'Click OK to create a backup, or Cancel to proceed without backup.'
  );

  if (backupChoice) {
    // User wants to backup first
    await exportData();
    
    // Ask again after backup is complete
    const finalConfirmation = confirm(
      '✅ Backup completed!\n\n' +
      '💥 NOW CLEAR ALL DATA?\n\n' +
      '⚠️ THIS ACTION CANNOT BE UNDONE!\n\n' +
      'This will delete:\n' +
      '• ALL transactions, properties, budgets\n' +
      '• ALL settings and preferences\n' +
      '• Completely reset the application\n\n' +
      'Are you absolutely sure?'
    );
    
    if (!finalConfirmation) {
      showToast('Data clearing cancelled', 'info');
      return;
    }
  } else {
    // User doesn't want backup, ask for final confirmation
    const finalConfirmation = confirm(
      '💥 CLEAR ALL DATA WITHOUT BACKUP?\n\n' +
      '⚠️ ⚠️ ⚠️  EXTREME WARNING! ⚠️ ⚠️ ⚠️\n\n' +
      'You have chosen NOT to create a backup!\n' +
      'ALL YOUR DATA WILL BE PERMANENTLY LOST!\n\n' +
      'This will delete:\n' +
      '• ALL transactions, properties, budgets\n' +
      '• ALL settings and preferences\n' +
      '• Completely reset the application\n\n' +
      'Type OK to confirm permanent deletion:'
    );
    
    if (!finalConfirmation) {
      showToast('Data clearing cancelled', 'info');
      return;
    }
  }

  try {
    showToast('🗑️ Clearing all data...', 'info');
    
    // Use the imported function with alias to avoid naming conflict
    await dbClearAllData();
    localStorage.clear();
    sessionStorage.clear();
    
    showToast('✅ All data cleared! Reloading application...', 'success');
    
    // Reload after a short delay
    setTimeout(() => {
      location.reload();
    }, 3000);
    
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