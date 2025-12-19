// ============================================================================
// 🧠 categoryRules.js — Auto-category engine (Fixed with Tier 1 Merchant Priority)
// ============================================================================

import { logImportDebug } from './debug.js';
// 1. Import the merchant map with its actual name
import { merchantCategories } from './merchantCategories.js'; 

// Some words are too generic to be useful as category keywords
const GENERIC_WORDS = new Set([
  'expense', 'expenses', 'income', 'other', 'misc', 'miscellaneous',
  'general', 'uncategorised', 'uncategorized', 'bills', 'bill'
]);

// ----------------------------------------------------------------------------
// Build a keyword index from your categories (No Change)
// ----------------------------------------------------------------------------
export function buildCategoryIndex(categories = []) {
  const index = [];

  categories.forEach(cat => {
    if (!cat || !cat.name) return;

    const isSub = !!cat.parentId;
    const baseWeight = isSub ? 3 : 1; // prefer subcategories

    const raw = String(cat.name).toLowerCase();

    const tokens = raw
      .split(/[^a-z0-9]+/i)
      .map(t => t.trim())
      .filter(t => t.length >= 3 && !GENERIC_WORDS.has(t));

    const uniqueTokens = new Set(tokens);

    uniqueTokens.forEach(word => {
      index.push({
        keyword: word,
        categoryId: cat.id,
        weight: baseWeight + (word.length >= 6 ? 1 : 0)
      });
    });
  });

  logImportDebug('buildCategoryIndex()', {
    categoryCount: categories.length,
    ruleCount: index.length
  });

  return index;
}
// Build lookup maps from default categories
/**
 * Build lookup structures from default categories
 */
export function buildCategoryResolver(categories) {
  const byId = new Map();
  const byName = new Map();

  for (const cat of categories) {
    if (!cat?.id) continue;

    byId.set(cat.id, cat);

    if (cat.name) {
      byName.set(cat.name.toLowerCase(), cat);
    }
  }

  return { byId, byName };
}

import { findMerchantRule } from './merchantRules.js';


/**
 * Resolve a transaction to a real categoryId
 */
export function resolveCategoryId(tx, categories, resolver) {
  const text =
    (tx.merchant ||
      tx.cleanDescription ||
      tx.description ||
      '').toLowerCase();

  // 1️⃣ Merchant rules (most accurate)
  const rule = findMerchantRule(text);
  if (rule && resolver.byId.has(rule.categoryId)) {
    return rule.categoryId;
  }

  // 2️⃣ Bank category text → default category name
  if (tx.bankCategory) {
    const bankMatch = resolver.byName.get(
      tx.bankCategory.toLowerCase()
    );
    if (bankMatch) return bankMatch.id;
  }

  // 3️⃣ Keyword fallback against category names
  for (const [name, cat] of resolver.byName.entries()) {
    if (text.includes(name)) {
      return cat.id;
    }
  }

  return null;
}


// ----------------------------------------------------------------------------
// Auto-assign a categoryId based on description & keyword index (Fixed)
// ----------------------------------------------------------------------------
export function autoAssignCategory(tx, categories = [], index = []) {
  if (tx.categoryId) {
    return {
      categoryId: tx.categoryId,
      source: 'manual',
      confidence: 1.0
    };
  }

  const rawDesc = tx.cleanDescription || tx.description || '';
  const desc = rawDesc.toLowerCase().trim();

  if (!desc) {
    return null;
  }

  // ===============================
  // 🏆 TIER 1 — MERCHANT MATCH
  // ===============================
  const merchantMatch = merchantCategories[desc];

  if (merchantMatch?.categoryId) {
    return {
      categoryId: merchantMatch.categoryId,
      source: 'merchant',
      confidence: merchantMatch.confidence ?? 0.95,
      ruleId: desc
    };
  }



  
  // ===============================
  // 💡 TIER 2 — KEYWORD MATCH
  // ===============================
  const scores = new Map();

  index.forEach(rule => {
    if (desc.includes(rule.keyword)) {
      scores.set(
        rule.categoryId,
        (scores.get(rule.categoryId) || 0) + rule.weight
      );
    }
  });

  if (!scores.size) return null;

  let bestCatId = null;
  let bestScore = 0;

  scores.forEach((score, catId) => {
    if (score > bestScore) {
      bestScore = score;
      bestCatId = catId;
    }
  });

  const confidence = Math.min(0.4 + bestScore * 0.15, 0.9);

  return {
    categoryId: bestCatId,
    source: 'keyword',
    confidence
  };

  
}
