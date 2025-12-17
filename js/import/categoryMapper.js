// js/import/categoryMapper.js
// ============================================================
// 🧠 Category Mapper (Orchestrator Only)
// Offline-safe, immutable, deterministic
// ============================================================

import { getAllItems, STORE_NAMES } from '../db.js';
import { merchantCategories } from './merchantCategories.js';
import {
  buildCategoryIndex,
  autoAssignCategory
} from './categoryRules.js';

// Optional debug logger (safe fallback)
function log(...args) {
  if (window.DEBUG_IMPORTS) {
    console.log('[CategoryMapper]', ...args);
  }
}

// ------------------------------------------------------------
// Internal cache (read-only, rebuilt on init)
// ------------------------------------------------------------
let _categories = [];
let _keywordIndex = [];

// ------------------------------------------------------------
// Initialise engines (CALL ONCE AT APP START)
// ------------------------------------------------------------
export async function initCategoryMapper() {
  try {
    _categories = await getAllItems(STORE_NAMES.categories);

    if (!Array.isArray(_categories) || !_categories.length) {
      console.warn('[CategoryMapper] No categories found');
      _keywordIndex = [];
      return;
    }

    _keywordIndex = buildCategoryIndex(_categories);

    log('Initialised', {
      categories: _categories.length,
      keywordRules: _keywordIndex.length
    });
  } catch (err) {
    console.error('❌ Failed to initialise category engines', err);
    _categories = [];
    _keywordIndex = [];
  }
}

// ------------------------------------------------------------
// Main API — suggest category (NEVER mutates)
// ------------------------------------------------------------
export function suggestCategory(tx) {
  if (!tx || tx.categoryId) return null;

  const desc =
    (tx.cleanDescription || tx.description || '')
      .toLowerCase()
      .trim();

  if (!desc) return null;

  // ==========================================================
  // 🏆 TIER 1 — STATIC MERCHANT MATCH (Highest Confidence)
  // ==========================================================
  for (const key in merchantCategories) {
    if (desc.includes(key)) {
      const match = merchantCategories[key];
      const exists = _categories.find(c => c.id === match.categoryId);

      if (exists) {
        log('Tier 1 match', key, match);
        return {
          categoryId: match.categoryId,
          confidence: match.confidence ?? 0.9,
          source: 'merchant'
        };
      }
    }
  }

  // ==========================================================
  // 💡 TIER 2 — KEYWORD ENGINE (Fallback)
  // ==========================================================
  const keywordMatch = autoAssignCategory(
    tx,
    _categories,
    _keywordIndex
  );

  if (keywordMatch) {
    return {
      categoryId: keywordMatch,
      confidence: 0.6,
      source: 'keyword'
    };
  }

  return null;
}
