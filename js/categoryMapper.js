// categoryMapper.js
// ------------------------------------------------------------
// Smart category assignment for imported transactions.
// - Normalises merchant description
// - Tries merchantRules (brand-based)
// - Falls back to bank category mapping
// - Final fallback: Uncategorised
// - Hybrid auto-create: if the SAME merchant appears >= 3 times,
//   create a dedicated merchant category under a sensible parent.
// ------------------------------------------------------------

import { findMerchantRule } from './merchantRules.js';
import { bankCategoryToCategoryId } from './bankCategoryMap.js';

// Use the same ID as in defaultCategories.js for uncategorised
const FALLBACK_CATEGORY_ID = 'ms_uncategorised';

// Threshold for hybrid auto-create
const MERCHANT_AUTOCREATE_THRESHOLD = 3;

// LocalStorage key for merchant occurrence stats
const MERCHANT_STATS_KEY = 'dfm_merchant_counts_v1';

// ------------------------------------------------------------
// Merchant normalisation
// ------------------------------------------------------------
export function normalizeMerchant(raw) {
  if (!raw) return '';

  let text = String(raw).toUpperCase();

  // Remove obvious date/time fragments like 05/12, 10:33, 2024, etc.
  text = text.replace(/\b\d{1,2}[:/]\d{1,2}([:/]\d{2,4})?\b/g, ' ');

  // Remove standalone years like 2023, 2024
  text = text.replace(/\b20\d{2}\b/g, ' ');

  // Remove booking / reference numbers (# or * or long digit sequences)
  text = text.replace(/[#*][A-Z0-9]+/g, ' ');
  text = text.replace(/\b\d{4,}\b/g, ' ');

  // Collapse PAYPAL *XXXX → PAYPAL
  text = text.replace(/\bPAYPAL[^ ]*/g, 'PAYPAL');

  // Normalise safe variants
  text = text.replace(/\bSAFEWAY\b/g, 'WOOLWORTHS');
  text = text.replace(/\bCOLES EXPRESS\b/g, 'COLES');
  text = text.replace(/\b7[\s-]*ELEVEN\b/g, '7-ELEVEN');

  // Collapse multiple spaces and trim
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

// Nice display version for auto-created categories
function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map(w => (w.length ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

// ------------------------------------------------------------
// Merchant stats in localStorage (for hybrid auto-create)
// ------------------------------------------------------------
function loadMerchantStats() {
  try {
    const raw = localStorage.getItem(MERCHANT_STATS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMerchantStats(stats) {
  try {
    localStorage.setItem(MERCHANT_STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore storage errors
  }
}

function bumpMerchantCount(cleanedMerchant) {
  if (!cleanedMerchant) return 1;
  const stats = loadMerchantStats();
  const key = cleanedMerchant;
  const current = stats[key] || 0;
  const next = current + 1;
  stats[key] = next;
  saveMerchantStats(stats);
  return next;
}

// ------------------------------------------------------------
// Find a reasonable parent category for auto-created categories
// based on the base category we're mapping to.
// ------------------------------------------------------------
function inferParentCategoryId(baseCategoryId, categoriesById) {
  if (!baseCategoryId) return 'ms_general';

  const base = categoriesById.get(baseCategoryId);
  if (!base) return 'ms_general';

  // If base has a parent, use its parent as the parent for merchant category
  if (base.parentId) return base.parentId;

  // Otherwise use the base itself as parent (if it's a 'main' category)
  return baseCategoryId;
}

// ------------------------------------------------------------
// Hybrid auto-create merchant-specific category when frequent
// ------------------------------------------------------------
async function maybeAutoCreateMerchantCategory(
  cleanedMerchant,
  baseCategoryId,
  categories,
  dbFunctions
) {
  const { addItem, STORE_NAMES } = dbFunctions;
  if (!cleanedMerchant || !baseCategoryId) return baseCategoryId;

  const merchantCount = bumpMerchantCount(cleanedMerchant);

  // Only auto-create after the merchant appears multiple times
  if (merchantCount < MERCHANT_AUTOCREATE_THRESHOLD) {
    return baseCategoryId;
  }

  const categoriesById = new Map(categories.map(c => [c.id, c]));
  const categoriesByName = new Map(
    categories.map(c => [c.name.toLowerCase(), c])
  );

  const slug = cleanedMerchant
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const merchantCategoryId = `mch_${slug}`;

  // If already exists (either by id or name), just use it
  if (categoriesById.has(merchantCategoryId)) {
    return merchantCategoryId;
  }
  const existingByName = categoriesByName.get(cleanedMerchant.toLowerCase());
  if (existingByName) {
    return existingByName.id;
  }

  // Create new category under inferred parent
  const parentId = inferParentCategoryId(baseCategoryId, categoriesById);
  const newCategory = {
    id: merchantCategoryId,
    name: toTitleCase(cleanedMerchant),
    type: 'expense',
    icon: '🏷️',
    parentId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await addItem(STORE_NAMES.categories, newCategory);
  return merchantCategoryId;
}

// ------------------------------------------------------------
// MAIN ENTRY:
// mapTransactionCategory({ description, bankCategory, amount }, dbFns)
// ------------------------------------------------------------
export async function mapTransactionCategory(
  { description, bankCategory, amount },
  dbFunctions
) {
  const { getAllItems, STORE_NAMES } = dbFunctions;

  const cleanedMerchant = normalizeMerchant(description);
  const allCategories = await getAllItems(STORE_NAMES.categories);
  const categoriesById = new Map(allCategories.map(c => [c.id, c]));

  // 1) Merchant-based rules first (brand-specific)
  const rule = findMerchantRule(cleanedMerchant);
  if (rule && rule.categoryId && categoriesById.has(rule.categoryId)) {
    return {
      categoryId: rule.categoryId,
      source: 'merchant-rule',
      confidence: rule.confidence ?? 0.9,
      normalizedMerchant: cleanedMerchant
    };
  }

  // 2) Bank category label mapping
  let baseCategoryId = null;
  if (bankCategory) {
    const label = String(bankCategory).trim();
    baseCategoryId = bankCategoryToCategoryId[label] || null;
  }

  // If bank category mapped to a known category, consider hybrid auto-create
  if (baseCategoryId && categoriesById.has(baseCategoryId)) {
    const finalId = await maybeAutoCreateMerchantCategory(
      cleanedMerchant,
      baseCategoryId,
      allCategories,
      dbFunctions
    );

    return {
      categoryId: finalId,
      source: 'bank-category',
      confidence: 0.6,
      normalizedMerchant: cleanedMerchant
    };
  }

  // 3) Heuristic tiny fallback: if merchant name hints at something obvious
  // (This is optional, can be extended later)
  if (cleanedMerchant.includes('KFC')) {
    return {
      categoryId: 'ms_food_fast_food',
      source: 'heuristic',
      confidence: 0.7,
      normalizedMerchant: cleanedMerchant
    };
  }
  if (cleanedMerchant.includes('CHEMIST')) {
    return {
      categoryId: 'ms_health_pharmacies',
      source: 'heuristic',
      confidence: 0.7,
      normalizedMerchant: cleanedMerchant
    };
  }

  // 4) Final fallback: pure uncategorised
  return {
    categoryId: FALLBACK_CATEGORY_ID,
    source: 'fallback',
    confidence: 0.1,
    normalizedMerchant: cleanedMerchant
  };
}
