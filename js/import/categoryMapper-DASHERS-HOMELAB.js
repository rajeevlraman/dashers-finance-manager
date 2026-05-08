// js/import/categoryMapper.js
// ============================================================
// 🧠 Category Mapper (FIXED VERSION - Works with all your systems)
// ============================================================

import { getAllItems, STORE_NAMES } from '../db.js';
import { merchantCategories } from './merchantCategories.js';
import { findMerchantRule } from './merchantRules.js'; // ADD THIS IMPORT
import {
  buildCategoryIndex,
  autoAssignCategory,
  resolveCategoryId // ADD THIS IMPORT
} from './categoryRules.js';

// Optional debug logger
function log(...args) {
  if (window.DEBUG_IMPORTS) {
    console.log('[CategoryMapper]', ...args);
  }
}

// ------------------------------------------------------------
// Internal cache
// ------------------------------------------------------------
let _categories = [];
let _keywordIndex = [];
let _categoryResolver = null;

// ------------------------------------------------------------
// Initialise engines
// ------------------------------------------------------------
export async function initCategoryMapper() {
  try {
    _categories = await getAllItems(STORE_NAMES.categories);

    if (!Array.isArray(_categories) || !_categories.length) {
      console.warn('[CategoryMapper] No categories found');
      _keywordIndex = [];
      _categoryResolver = null;
      return;
    }

    // Build both index and resolver
    _keywordIndex = buildCategoryIndex(_categories);
    _categoryResolver = {
      byId: new Map(_categories.map(c => [c.id, c])),
      byName: new Map(_categories.map(c => [c.name.toLowerCase(), c]))
    };

    log('Initialised', {
      categories: _categories.length,
      keywordRules: _keywordIndex.length
    });
  } catch (err) {
    console.error('❌ Failed to initialise category engines', err);
    _categories = [];
    _keywordIndex = [];
    _categoryResolver = null;
  }
}

// ------------------------------------------------------------
// SIMPLIFIED suggestCategory function (FIXED)
// ------------------------------------------------------------
export function suggestCategory(tx) {
  if (!tx || tx.categoryId) return null;

  const desc = (tx.cleanDescription || tx.description || '').toLowerCase().trim();
  if (!desc) return null;

  log('Processing:', tx.description);

  // ==========================================================
  // 🏆 TIER 1 — MERCHANT RULES (Highest Priority)
  // ==========================================================
  const merchantRule = findMerchantRule(desc);
  if (merchantRule?.categoryId) {
    // Check if category exists
    const categoryExists = _categories.some(c => c.id === merchantRule.categoryId);
    
    if (categoryExists) {
      log('Tier 1: Merchant rule matched', merchantRule);
      return {
        categoryId: merchantRule.categoryId,
        confidence: merchantRule.confidence || 0.9,
        source: 'merchant_rule',
        ruleId: merchantRule.id
      };
    } else {
      log('Tier 1: Category not found', merchantRule.categoryId);
    }
  }

  // ==========================================================
  // 🥈 TIER 2 — MERCHANT CATEGORIES (Direct object lookup)
  // ==========================================================
  for (const [merchantKey, categoryData] of Object.entries(merchantCategories)) {
    if (desc.includes(merchantKey.toLowerCase())) {
      // Check if category exists
      const categoryExists = _categories.some(c => c.id === categoryData.categoryId);
      
      if (categoryExists) {
        log('Tier 2: Merchant category matched', merchantKey, categoryData);
        return {
          categoryId: categoryData.categoryId,
          confidence: categoryData.confidence || 0.85,
          source: 'merchant_category'
        };
      }
    }
  }

  // ==========================================================
  // 🥉 TIER 3 — RESOLVE CATEGORY ID (from categoryRules.js)
  // ==========================================================
  if (_categoryResolver) {
    try {
      const categoryId = resolveCategoryId(tx, _categories, _categoryResolver);
      
      if (categoryId && categoryId !== 'exp_misc_items') {
        log('Tier 3: Resolved category', categoryId);
        return {
          categoryId,
          confidence: 0.7,
          source: 'resolver'
        };
      }
    } catch (err) {
      console.warn('Resolver error:', err);
    }
  }

  // ==========================================================
  // 📝 TIER 4 — KEYWORD MATCH (Fallback)
  // ==========================================================
  if (_keywordIndex.length > 0) {
    const keywordResult = autoAssignCategory(tx, _categories, _keywordIndex);
    
    if (keywordResult?.categoryId) {
      log('Tier 4: Keyword matched', keywordResult);
      return {
        ...keywordResult,
        needsReview: keywordResult.confidence < 0.6
      };
    }
  }

  // ==========================================================
  // 🏦 TIER 5 — BANK CATEGORY HINT
  // ==========================================================
  if (tx.bankCategory) {
    const bankCat = tx.bankCategory.toLowerCase();
    let suggestedId = null;
    
    if (bankCat.includes('grocery') || bankCat.includes('supermarket')) {
      suggestedId = 'exp_groceries';
    } else if (bankCat.includes('restaurant') || bankCat.includes('takeaway') || bankCat.includes('food')) {
      suggestedId = 'exp_dining';
    } else if (bankCat.includes('fuel') || bankCat.includes('petrol')) {
      suggestedId = 'exp_transport';
    } else if (bankCat.includes('utilit') || bankCat.includes('electric') || bankCat.includes('water') || bankCat.includes('gas')) {
      suggestedId = 'exp_utilities';
    } else if (bankCat.includes('shopping') || bankCat.includes('retail')) {
      suggestedId = 'exp_shopping';
    }
    
    if (suggestedId) {
      const exists = _categories.some(c => c.id === suggestedId);
      if (exists) {
        log('Tier 5: Bank category hint', tx.bankCategory, '->', suggestedId);
        return {
          categoryId: suggestedId,
          confidence: 0.5,
          source: 'bank_hint',
          needsReview: true
        };
      }
    }
  }

  // ==========================================================
  // ❓ FINAL FALLBACK
  // ==========================================================
  log('No match found for:', tx.description);
  
  // Return uncategorized but mark for review
  return {
    categoryId: tx.type === 'income' ? 'inc_other' : 'exp_uncategorized',
    confidence: 0.1,
    source: 'default',
    needsReview: true
  };
}

// ------------------------------------------------------------
// BATCH PROCESSING HELPER
// ------------------------------------------------------------
export function suggestCategoriesForBatch(transactions) {
  if (!_categories.length) {
    console.warn('Category mapper not initialised');
    return transactions.map(tx => ({
      ...tx,
      categorisation: {
        source: 'uninitialized',
        confidence: 0,
        needsReview: true
      }
    }));
  }

  const results = [];
  let matched = 0;
  
  for (const tx of transactions) {
    const suggestion = suggestCategory(tx);
    
    if (suggestion) {
      matched++;
      results.push({
        ...tx,
        categoryId: suggestion.categoryId,
        categorisation: {
          source: suggestion.source,
          confidence: suggestion.confidence,
          needsReview: suggestion.needsReview || suggestion.confidence < 0.7
        }
      });
    } else {
      results.push({
        ...tx,
        categorisation: {
          source: 'none',
          confidence: 0,
          needsReview: true
        }
      });
    }
  }
  
  log(`Batch complete: ${matched}/${transactions.length} matched`);
  
  return {
    transactions: results,
    stats: {
      total: transactions.length,
      matched,
      matchRate: Math.round((matched / transactions.length) * 100)
    }
  };
}

// ------------------------------------------------------------
// DEBUG FUNCTION - See what's happening
// ------------------------------------------------------------
export function debugTransaction(tx) {
  console.group('🔍 Category Mapping Debug');
  console.log('Transaction:', tx.description);
  console.log('Clean:', tx.cleanDescription);
  console.log('Bank Category:', tx.bankCategory);
  
  const desc = (tx.cleanDescription || tx.description || '').toLowerCase();
  
  // Check merchant rules
  const rule = findMerchantRule(desc);
  console.log('Merchant Rule Match:', rule);
  
  // Check merchant categories
  const merchantCatMatch = Object.entries(merchantCategories).find(([key]) => 
    desc.includes(key.toLowerCase())
  );
  console.log('Merchant Category Match:', merchantCatMatch);
  
  // Get suggestion
  const suggestion = suggestCategory(tx);
  console.log('Final Suggestion:', suggestion);
  
  console.groupEnd();
  return suggestion;
  
}

// categoryMapper.js - END OF FILE (after all functions)

