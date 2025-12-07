// ============================================================================
// 🪲 import/debug.js — Import Debug Toggle & Logger
// ============================================================================

const IMPORT_DEBUG_KEY = 'dfm_import_debug'; // localStorage key

export function isImportDebugEnabled() {
  try {
    // URL override for quick dev use: ?importDebug=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('importDebug') === '1') return true;

    const raw = localStorage.getItem(IMPORT_DEBUG_KEY);
    return raw === '1';
  } catch (e) {
    console.warn('[IMPORT-DEBUG] Failed to read debug flag', e);
    return false;
  }
}

export function setImportDebugEnabled(enabled) {
  try {
    localStorage.setItem(IMPORT_DEBUG_KEY, enabled ? '1' : '0');
    console.log(`[IMPORT-DEBUG] Debug ${enabled ? 'ENABLED' : 'DISABLED'}`);
  } catch (e) {
    console.warn('[IMPORT-DEBUG] Failed to persist debug flag', e);
  }
}

export function logImportDebug(...args) {
  if (!isImportDebugEnabled()) return;
  console.debug('[IMPORT-DEBUG]', ...args);
}
