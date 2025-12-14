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

// ----------------------------------------------------------------------------
// Auto-assign a categoryId based on description & keyword index (Fixed)
// ----------------------------------------------------------------------------
export function autoAssignCategory(tx, categories = [], index = []) {
  // Do NOT override existing categoryId
  if (tx.categoryId) return tx.categoryId;

  // Use 'cleanDescription' for higher accuracy, fallback to 'description'
  const rawDesc = tx.cleanDescription || tx.description || '';
  const desc = rawDesc.toLowerCase().trim();
  
  if (!desc || !index.length) return null;

// ===================================================================
// 🏆 TIER 1: STATIC MERCHANT MATCH (Highest Priority)
// ===================================================================

  // Check against the exact match merchant map
  const merchantMatch = merchantCategories[desc]; 

  if (merchantMatch && merchantMatch.categoryId) {
    const merchantCatId = merchantMatch.categoryId;
    const chosen = categories.find(c => c.id === merchantCatId);
    
    logImportDebug('autoAssignCategory(): 🏆 MERCHANT MATCH (Tier 1)', {
      description: tx.description,
      cleanDescription: desc,
      categoryId: merchantCatId,
      categoryName: chosen?.name
    });
    return merchantCatId; // 🛑 IMMEDIATE RETURN: High confidence match
  }


// ===================================================================
// 💡 TIER 2: KEYWORD SCORING (Fallback Logic)
// ===================================================================

  // Collect scores per category
  const scores = new Map(); // categoryId -> score

  index.forEach(rule => {
    // Use the lowercased description for keyword matching
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
  logImportDebug('autoAssignCategory(): 💡 KEYWORD MATCH (Tier 2)', {
    description: tx.description,
    categoryId: bestCatId,
    categoryName: chosen?.name,
    score: bestScore
  });

  return bestCatId;
}