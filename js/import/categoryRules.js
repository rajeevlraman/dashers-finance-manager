// ============================================================================
// 🧠 categoryRules.js — Auto-category engine (Option C)
// ----------------------------------------------------------------------------
// Builds a lightweight keyword index from your existing categories and uses
// it to auto-assign categoryId for imported transactions.
// ============================================================================

import { logImportDebug } from './debug.js';

// Some words are too generic to be useful as category keywords
const GENERIC_WORDS = new Set([
  'expense', 'expenses', 'income', 'other', 'misc', 'miscellaneous',
  'general', 'uncategorised', 'uncategorized', 'bills', 'bill'
]);

// ----------------------------------------------------------------------------
// Build a keyword index from your categories
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

// ----------------------------------------------------------------------------
// Auto-assign a categoryId based on description & keyword index
// ----------------------------------------------------------------------------
export function autoAssignCategory(tx, categories = [], index = []) {
  // Do NOT override existing categoryId
  if (tx.categoryId) return tx.categoryId;

  const desc = (tx.description || '').toLowerCase().trim();
  if (!desc || !index.length) return null;

  // Collect scores per category
  const scores = new Map(); // categoryId -> score

  index.forEach(rule => {
    if (desc.includes(rule.keyword)) {
      const prev = scores.get(rule.categoryId) || 0;
      scores.set(rule.categoryId, prev + rule.weight);
    }
  });

  if (scores.size === 0) return null;

  // Pick best scoring category, tie-breaker prefers subcategories
  let bestCatId = null;
  let bestScore = 0;

  scores.forEach((score, catId) => {
    if (score > bestScore) {
      bestScore = score;
      bestCatId = catId;
    } else if (score === bestScore && bestCatId) {
      const existing = categories.find(c => c.id === bestCatId);
      const candidate = categories.find(c => c.id === catId);

      if (candidate && candidate.parentId && !existing?.parentId) {
        bestCatId = catId; // prefer subcategory in tie
      }
    }
  });

  // Require at least a minimal confidence
  if (!bestCatId || bestScore < 2) {
    return null;
  }

  const chosen = categories.find(c => c.id === bestCatId);
  logImportDebug('autoAssignCategory(): chosen category', {
    txDescription: tx.description,
    categoryId: bestCatId,
    categoryName: chosen?.name,
    score: bestScore
  });

  return bestCatId;
}
