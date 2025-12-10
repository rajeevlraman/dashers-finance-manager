// ============================================================================
// categoryMapper.js
// Smart category engine for imported transactions
// - Uses: merchant rules, bank category mappings, keyword matching
// - Auto-learns merchant rules after repeated consistent matches
// ============================================================================

//To activate logo + category matching in your app, add line 10 to 29 here inside categoryMapper.js:

import { merchantLogos } from "./merchantLogos.js";
import { merchantCategories } from "./merchantCategories.js";

export function resolveMerchantLogo(cleanDesc) {
  for (const key of Object.keys(merchantLogos)) {
    if (cleanDesc.includes(key)) {
      return merchantLogos[key];
    }
  }
  return null;
}

export function resolveMerchantCategory(cleanDesc) {
  for (const key of Object.keys(merchantCategories)) {
    if (cleanDesc.includes(key)) {
      return merchantCategories[key];
    }
  }
  return merchantCategories["default"];
}



// Where we persist auto-learned merchant rules
const LOCAL_STORAGE_KEY = 'dfm_category_rules_v1';

// In-memory rule list
let merchantRules = [];

// Auto-learn threshold (how many consistent matches before we save a rule)
const AUTO_LEARN_THRESHOLD = 3;

// For counting repeated matches during a session
// key = `${field}:${pattern}:${categoryId}`
const pendingStats = {};

// ---------------------------------------------------------------------------
// Normalisation helpers (must be consistent with parser.js behaviour)
// ---------------------------------------------------------------------------
function normaliseKey(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// LocalStorage load/save
// ---------------------------------------------------------------------------
function loadRulesFromStorage() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(r => ({
      pattern: r.pattern || '',
      field: r.field || 'merchant',
      categoryId: r.categoryId,
      confidence: typeof r.confidence === 'number' ? r.confidence : 1,
      hitCount: typeof r.hitCount === 'number' ? r.hitCount : 0,
      lastUsed: r.lastUsed || null
    })).filter(r => r.pattern && r.categoryId);
  } catch (err) {
    console.warn('[CategoryMapper] Failed to load rules from storage', err);
    return [];
  }
}

function saveRulesToStorage() {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merchantRules));
  } catch (err) {
    console.warn('[CategoryMapper] Failed to save rules to storage', err);
  }
}

// ---------------------------------------------------------------------------
// Public: Initialise mapper (call once at app startup)
// ---------------------------------------------------------------------------
export function initCategoryMapper() {
  merchantRules = loadRulesFromStorage();
  console.log(`[CategoryMapper] Loaded ${merchantRules.length} merchant rules`);
}

// Optional: for debugging in your debug console
export function getMerchantRules() {
  return [...merchantRules];
}

// ---------------------------------------------------------------------------
// Rule finders
// ---------------------------------------------------------------------------
function findMerchantRuleForTransaction(tx) {
  if (!tx) return null;

  const merchantKey = normaliseKey(tx.merchant);
  const descKey = normaliseKey(tx.cleanDescription || tx.description);

  // Prioritise merchant-based rules first
  let bestRule = null;

  for (const rule of merchantRules) {
    const rulePattern = rule.pattern;
    if (!rulePattern) continue;

    if (rule.field === 'merchant') {
      if (!merchantKey.includes(rulePattern)) continue;
    } else if (rule.field === 'description') {
      if (!descKey.includes(rulePattern)) continue;
    } else {
      continue;
    }

    if (
      !bestRule ||
      (rule.confidence || 1) > (bestRule.confidence || 1) ||
      (rule.hitCount || 0) > (bestRule.hitCount || 0)
    ) {
      bestRule = rule;
    }
  }

  return bestRule;
}

// ---------------------------------------------------------------------------
// Bank category → categoryId mappings
// (NAB-specific strings + generic fallbacks)
// ---------------------------------------------------------------------------
const GENERIC_BANK_CATEGORY_MAP = {
  // Common high-level concepts
  'groceries': 'exp_groceries',
  'supermarket': 'exp_grocery_supermarket',
  'food': 'exp_groceries',
  'dining': 'exp_dining',
  'restaurants': 'exp_dining',
  'fast food': 'exp_dining',
  'takeaway': 'exp_dining',

  'medical': 'exp_health',
  'health': 'exp_health',

  'fuel': 'exp_fuel',
  'petrol': 'exp_fuel',
  'transport': 'exp_transport',
  'tolls': 'exp_Parking_Fees',
  'parking': 'exp_Parking_Fees',
  'public transport': 'exp_public_transport',
  'transit': 'exp_public_transport',

  'insurance': 'exp_insurance',
  'home insurance': 'exp_home_ins',
  'car insurance': 'exp_car_ins',
  'life insurance': 'exp_life_ins',
  'health insurance': 'exp_health_ins',

  'utilities': 'exp_utilities',
  'electricity': 'exp_electricity',
  'gas': 'exp_gas',
  'water': 'exp_water_usage',
  'internet': 'exp_internet',
  'phone': 'exp_mobile',

  'education': 'exp_education',
  'school fees': 'exp_school_fees',
  'university': 'exp_uni_fees',

  'fees': 'exp_fees',
  'charges': 'exp_fees',

  'rent': 'exp_rent_payment',
  'mortgage': 'exp_Home_mortgage',

  'travel': 'exp_travel',
  'flights': 'exp_flights',
  'accommodation': 'exp_hotel',

  'savings': 'sav_main',
  'investment': 'sav_invest',
  'loan repayment': 'debt_main'
};

const BANK_CATEGORY_MAP_BY_BANK = {
  // You can expand specific bank mappings here
  nab: {
    'groceries': 'exp_groceries',
    'supermarket': 'exp_grocery_supermarket',
    'medical': 'exp_health',
    'health': 'exp_health',
    'fuel': 'exp_fuel',
    'petrol': 'exp_fuel',
    'transport': 'exp_transport',
    'tolls': 'exp_Parking_Fees',
    'parking': 'exp_Parking_Fees',
    'insurance': 'exp_insurance',
    'electricity': 'exp_electricity',
    'gas': 'exp_gas',
    'water': 'exp_water_usage',
    'internet': 'exp_internet',
    'phone': 'exp_mobile',
    'education': 'exp_education',
    'fees': 'exp_fees',
    'rent': 'exp_rent_payment',
    'mortgage': 'exp_Home_mortgage'
    // etc.
  }
};

// Resolve bank category to a categoryId
function resolveBankCategory(bankCategoryRaw, opts = {}) {
  if (!bankCategoryRaw) return null;
  const bankId = (opts.bankId || '').toLowerCase();
  const raw = bankCategoryRaw.toLowerCase().trim();

  const bankMap = BANK_CATEGORY_MAP_BY_BANK[bankId] || {};
  const allKeys = [
    ...Object.keys(bankMap),
    ...Object.keys(GENERIC_BANK_CATEGORY_MAP)
  ];

  for (const key of allKeys) {
    if (!key) continue;
    if (raw.includes(key)) {
      return bankMap[key] || GENERIC_BANK_CATEGORY_MAP[key] || null;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Keyword → categoryId matching
// Uses cleanDescription / merchant keyword matches
// ---------------------------------------------------------------------------
const KEYWORD_CATEGORY_MAP = [
  // Groceries & supermarkets
  { pattern: /safeway|woolworths|woolies|coles|aldi|iga/gi, categoryId: 'exp_groceries' },
  { pattern: /indian\s+grocer|spice\s+house|malvic|dosa\s+hut\s+grocer/gi, categoryId: 'exp_Indian_Groceries' },

  // Fast food / dining
  { pattern: /kfc/gi, categoryId: 'exp_kfc' },
  { pattern: /mcdonald'?s|maccas/gi, categoryId: 'exp_mcd' },
  { pattern: /hungry\s+jacks?/gi, categoryId: 'exp_hj' },
  { pattern: /nando'?s/gi, categoryId: 'exp_nandos' },
  { pattern: /domino'?s/gi, categoryId: 'exp_dominos' },
  { pattern: /pizza\s+hut/gi, categoryId: 'exp_pizzahut' },
  { pattern: /restaurant|diner|bistro|cafe|coffee/gi, categoryId: 'exp_dining' },

  // Fuel / transport
  { pattern: /bp\s+petrol|caltex|shell|7-eleven.*fuel|ampol/gi, categoryId: 'exp_fuel' },
  { pattern: /rego|registration/gi, categoryId: 'exp_rego' },
  { pattern: /myki|opal.*card|ptv/gi, categoryId: 'exp_public_transport' },
  { pattern: /parking|parkmate|wilson\s+parking/gi, categoryId: 'exp_Parking_Fees' },
  { pattern: /citylink|toll/gi, categoryId: 'exp_citylink_toll' },

  // Utilities
  { pattern: /agl|origin\s+energy|simply\s+energy|red\s+energy|powershop/gi, categoryId: 'exp_electricity' },
  { pattern: /nbn|telstra|optus|vocus|tpg|aussie\s+broadband/gi, categoryId: 'exp_internet' },

  // Health & medical
  { pattern: /chemist\s*warehouse|pharmacy|amcal/gi, categoryId: 'exp_pharmacy' },
  { pattern: /gp\s+clinic|medical\s+centre/gi, categoryId: 'exp_gp' },
  { pattern: /dental|dentist/gi, categoryId: 'exp_dental' },

  // Kids / school
  { pattern: /childcare|early\s+learning/gi, categoryId: 'exp_childcare' },
  { pattern: /school\s+fees|school\s+payment/gi, categoryId: 'exp_school_fees' },

  // Subscriptions
  { pattern: /netflix|stan|binge/gi, categoryId: 'exp_netflix' },
  { pattern: /disney\+?/gi, categoryId: 'exp_disney' },
  { pattern: /prime\s+video|amazon\s+prime/gi, categoryId: 'exp_prime' },
  { pattern: /spotify|apple\s+music|youtube\s+music/gi, categoryId: 'exp_music' },

  // Insurance
  { pattern: /allianz|aami|budget\s+direct|nrma|racv|bupa|medibank|nib/gi, categoryId: 'exp_insurance' },

  // Property / rates
  { pattern: /council\s+rates|city\s+of\s+/gi, categoryId: 'exp_council_rates' },
  { pattern: /body\s+corporate|owners\s+corp/gi, categoryId: 'exp_body_corporate' },
  { pattern: /land\s+tax/gi, categoryId: 'exp_Land_Tax' },

  // Tech & home office
  { pattern: /jb\s+hi-fi|harvey\s+norman|good\s+guys/gi, categoryId: 'exp_tech' },
  { pattern: /officeworks/gi, categoryId: 'exp_home_office' }
];

function keywordCategoryMatch(tx) {
  if (!tx) return null;
  const haystack =
    `${tx.description || ''} ${tx.rawDescription || ''} ${tx.merchant || ''}`.toLowerCase();

  for (const rule of KEYWORD_CATEGORY_MAP) {
    if (rule.pattern.test(haystack)) {
      return rule.categoryId;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Auto-learning engine
// ---------------------------------------------------------------------------
function trackAutoLearning(field, patternRaw, categoryId) {
  const pattern = normaliseKey(patternRaw);
  if (!pattern || pattern.length < 3) return; // ignore tiny patterns

  const key = `${field}:${pattern}:${categoryId}`;
  const current = pendingStats[key] || 0;
  const next = current + 1;
  pendingStats[key] = next;

  if (next < AUTO_LEARN_THRESHOLD) return;

  // Already a rule?
  const existing = merchantRules.find(
    r => r.field === field && r.pattern === pattern && r.categoryId === categoryId
  );
  if (existing) {
    existing.hitCount = (existing.hitCount || 0) + 1;
    existing.lastUsed = new Date().toISOString();
  } else {
    merchantRules.push({
      field,
      pattern,
      categoryId,
      confidence: 1,
      hitCount: next,
      lastUsed: new Date().toISOString()
    });
    console.log(
      `[CategoryMapper] Auto-learned rule: ${field} contains "${pattern}" → ${categoryId}`
    );
  }

  saveRulesToStorage();
}

// ---------------------------------------------------------------------------
// Public: Learn from manual category choice
// Call this when user sets/changes a category in the UI
// ---------------------------------------------------------------------------
export function learnFromManualCategory(tx, categoryId, opts = {}) {
  if (!tx || !categoryId) return;

  // Prefer merchant-based learning
  if (tx.merchant) {
    trackAutoLearning('merchant', tx.merchant, categoryId);
  } else if (tx.cleanDescription || tx.description) {
    const keySource = tx.cleanDescription || tx.description;
    trackAutoLearning('description', keySource, categoryId);
  }

  if (opts.log !== false) {
    console.log('[CategoryMapper] Learned from manual choice', {
      merchant: tx.merchant,
      description: tx.description,
      categoryId
    });
  }
}

// ---------------------------------------------------------------------------
// Public: Suggest category for a transaction
// PRIORITY:
// 1) Explicit userCategoryId (if passed in)
// 2) Merchant rule (auto-learned or manual future rules)
// 3) Bank category mapping (if provided)
// 4) Keyword-based mapping from description/merchant
// 5) Fallback: ms_uncategorised (or exp_misc_items)
// ---------------------------------------------------------------------------
export function suggestCategoryForTransaction(tx, bankCategoryRaw = null, options = {}) {
  // 1) User override (if importer already knows a manual choice)
  if (options.userCategoryId) {
    return {
      categoryId: options.userCategoryId,
      source: 'user_override',
      rule: null
    };
  }

  // 2) Merchant rule
  const merchantRule = findMerchantRuleForTransaction(tx);
  if (merchantRule) {
    merchantRule.hitCount = (merchantRule.hitCount || 0) + 1;
    merchantRule.lastUsed = new Date().toISOString();
    saveRulesToStorage();

    return {
      categoryId: merchantRule.categoryId,
      source: 'merchant_rule',
      rule: merchantRule
    };
  }

  // 3) Bank category mapping
  if (bankCategoryRaw) {
    const catIdFromBank = resolveBankCategory(bankCategoryRaw, {
      bankId: options.bankId
    });
    if (catIdFromBank) {
      // Auto-learn based on merchant + this category (your option A)
      if (tx && tx.merchant) {
        trackAutoLearning('merchant', tx.merchant, catIdFromBank);
      }
      return {
        categoryId: catIdFromBank,
        source: 'bank_category',
        rule: {
          bankCategory: bankCategoryRaw
        }
      };
    }
  }

  // 4) Keyword-based mapping from description/merchant
  const catIdFromKeywords = keywordCategoryMatch(tx);
  if (catIdFromKeywords) {
    if (tx && tx.merchant) {
      trackAutoLearning('merchant', tx.merchant, catIdFromKeywords);
    }
    return {
      categoryId: catIdFromKeywords,
      source: 'keyword_match',
      rule: null
    };
  }

  // 5) Fallback
  const fallback = 'ms_uncategorised'; // or 'exp_misc_items'
  return {
    categoryId: fallback,
    source: 'fallback',
    rule: null
  };
}
