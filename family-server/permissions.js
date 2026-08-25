// ============================================================================
// 🔑 permissions.js — Section/store permission model
// ============================================================================
// "Sections" match the app's nav items 1:1 (see js/navigation.js). Each
// section maps to the IndexedDB store name(s) it reads/writes. A family
// member's account lists which sections they're allowed; the server uses
// this to decide which stores to include in sync pull/push for that user.
//
// Dashboard/Reports/Calendar are aggregate views spanning many stores rather
// than owning data themselves — they're always viewable, and what they show
// is naturally limited by whichever other sections' data actually got
// synced to that device.
// ============================================================================

export const ALL_SECTIONS = [
  'dashboard', 'transactions', 'budgets', 'accounts', 'categories', 'reports',
  'bills', 'calendar', 'recurring', 'loans', 'properties', 'tenants',
  'maintenance', 'expenses', 'tax', 'costbase', 'settings'
];

// section -> IndexedDB store name(s) it owns
export const SECTION_STORES = {
  dashboard: [],
  transactions: ['transactions'],
  budgets: ['budgets'],
  accounts: ['accounts'],
  categories: ['categories'],
  reports: [],
  bills: ['bills'],
  calendar: [],
  recurring: ['recurringTransactions'],
  loans: ['loans', 'loanTransactions'],
  properties: ['properties'],
  tenants: ['tenants'],
  maintenance: ['maintenance'],
  expenses: ['expenses', 'propertyExpenseCategories'],
  tax: ['tax_records'],
  costbase: ['costbase'],
  settings: []
};

/** Every store name that exists in the app, synced regardless of section
 * (small shared/reference data, not sensitive on its own). Kept minimal. */
export const ALWAYS_SYNCED_STORES = ['meta'];

/**
 * Given a user's allowed sections, return the full set of store names they
 * should receive in sync.
 */
export function storesForSections(sections) {
  if (sections.includes('*')) {
    // Admin: every store used by any section, plus always-synced ones.
    const all = new Set(ALWAYS_SYNCED_STORES);
    Object.values(SECTION_STORES).forEach(stores => stores.forEach(s => all.add(s)));
    return [...all];
  }
  const set = new Set(ALWAYS_SYNCED_STORES);
  for (const section of sections) {
    (SECTION_STORES[section] || []).forEach(s => set.add(s));
  }
  return [...set];
}

export function isValidSection(section) {
  return ALL_SECTIONS.includes(section);
}
