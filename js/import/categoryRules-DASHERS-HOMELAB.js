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
export function buildCategoryResolver(categories) {
  const byId = new Map();
  const byName = new Map();
  const bySlug = new Map();

  for (const cat of categories) {
    byId.set(cat.id, cat);

    if (cat.name) {
      byName.set(cat.name.toLowerCase(), cat);
    }

    // optional slug match
    if (cat.id) {
      bySlug.set(cat.id.toLowerCase(), cat);
    }
  }

  return { byId, byName, bySlug };
}

import { findMerchantRule } from './merchantRules.js';

export function resolveCategoryId(tx, categories, resolver) {
  const text = (tx.merchant || tx.cleanDescription || '').toLowerCase();

  // 1️⃣ Merchant rules
  const rule = findMerchantRule(text);
  if (rule?.categoryId) {
    // PERSONAL category → done
    if (rule.categoryId.startsWith('exp_')) {
      return rule.categoryId;
    }

    // MoneySmart → map to personal
    if (rule.categoryId.startsWith('ms_')) {
      const mapped = mapMoneySmartToPersonal(rule.categoryId);
      if (mapped && resolver.byId.has(mapped)) {
        return mapped;
      }
    }
  }

  // 2️⃣ Bank category → MoneySmart → personal
  if (tx.bankCategory) {
    const bankName = tx.bankCategory.toLowerCase();

    // try MoneySmart-style inference
    if (bankName.includes('grocery')) return 'exp_groceries';
    if (bankName.includes('restaurant')) return 'exp_dining';
    if (bankName.includes('fuel')) return 'exp_fuel';
  }

  // 3️⃣ Keyword fallback (personal only)
  for (const [name, cat] of resolver.byName.entries()) {
    if (cat.id.startsWith('exp_') && text.includes(name)) {
      return cat.id;
    }
  }

  // 4️⃣ Final fallback
  return 'exp_misc_items';
}

// Add this helper function
export function debugCategoryAssignment(tx, categories) {
  const text = (tx.merchant || tx.cleanDescription || '').toLowerCase();
  const upperText = text.toUpperCase();
  
  console.log('🔍 DEBUG Category Assignment:');
  console.log('Transaction:', tx.description);
  console.log('Clean text:', text);
  console.log('Bank Category:', tx.bankCategory);
  
  // Check merchant rules
  for (const rule of merchantRules) {
    for (const keyword of rule.includesAny) {
      if (upperText.includes(keyword)) {
        console.log(`✓ Found merchant rule: ${rule.id} -> ${rule.categoryId}`);
        
        // Check if category exists
        const exists = categories.some(c => c.id === rule.categoryId);
        console.log(`  Category exists: ${exists}`);
        
        if (!exists) {
          console.log(`  ❌ Category ${rule.categoryId} doesn't exist!`);
          
          // Find similar categories
          const similar = categories.filter(c => 
            c.id.toLowerCase().includes(rule.categoryId.toLowerCase().replace('exp_', '').slice(0, 5))
          );
          if (similar.length > 0) {
            console.log('  Similar categories:', similar.map(c => c.id));
          }
        }
      }
    }
  }
  
  // Check bank category mapping
  if (tx.bankCategory) {
    console.log(`Bank category: ${tx.bankCategory}`);
  }
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

