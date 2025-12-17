// ============================================================================
// categoryMapper.js
// Smart category engine for imported transactions
// - Uses: merchant rules, bank category mappings, keyword matching
// - Auto-learns merchant rules after repeated consistent matches
// ============================================================================

import { merchantLogos } from "./merchantLogos.js";
import { merchantCategories } from "./merchantCategories.js";
import { merchantRules, findMerchantRule } from './merchantRules.js';


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
 /*
  // ========== NAB BANK CATEGORIES ==========
  'attractions & events': 'exp_entertainment',
  'attractions': 'exp_entertainment',
  'events': 'exp_entertainment',
  'restaurants & takeaway': 'exp_dining',
  'restaurants': 'exp_dining',
  'takeaway': 'exp_dining',
  'groceries': 'exp_groceries',
  'supermarket': 'exp_grocery_supermarket',
  'utilities': 'exp_utilities',
  'fuel': 'exp_fuel',
  'medical': 'exp_health',
  'transfers in': 'inc_transfer',
  'transfers out': 'exp_transfer_out',
  'internal transfers': 'exp_transfer_out',
  'uncategorised': 'ms_uncategorised',

  // ========== MACQUARIE BANK CATEGORIES ==========
  'technology': 'exp_software',
  'financial': 'ms_financial',
  'shopping': 'exp_online_shopping',
  'transport': 'exp_transport',
  'entertainment': 'exp_entertainment',
  'household': 'exp_groceries',
  'personal': 'exp_personal',
  'travel': 'exp_travel',
  'insurance': 'exp_insurance',
  'education': 'exp_education',

  // ========== GOOGLE/SUBSCRIPTION MAPPINGS ==========
  'google': 'exp_software',
  'software': 'exp_software',
  'subscription': 'exp_subs',
  'microsoft': 'exp_software',
  'apple': 'exp_software',
  'aws': 'exp_software',
  'cloud': 'exp_software',

  // ========== FINANCIAL/TRANSFER MAPPINGS ==========
  'payment': 'ms_financial',
  'bpay': 'ms_financial_bpay',
  'transfer': 'ms_financial_transfers',
  'credit': 'ms_financial',
  'debit': 'ms_financial',

  // ========== YOUR EXISTING MAPPINGS ==========
  'food': 'exp_groceries',
  'dining': 'exp_dining',
  'fast food': 'exp_dining',
  'takeaway': 'exp_dining',

  'health': 'exp_health',

  'petrol': 'exp_fuel',
  'tolls': 'exp_Parking_Fees',
  'parking': 'exp_Parking_Fees',
  'public transport': 'exp_public_transport',
  'transit': 'exp_public_transport',

  'home insurance': 'exp_home_ins',
  'car insurance': 'exp_car_ins',
  'life insurance': 'exp_life_ins',
  'health insurance': 'exp_health_ins',

  'electricity': 'exp_electricity',
  'gas': 'exp_gas',
  'water': 'exp_water_usage',
  'internet': 'exp_internet',
  'phone': 'exp_mobile',

  'school fees': 'exp_school_fees',
  'university': 'exp_uni_fees',

  'charges': 'exp_fees',

  'rent': 'exp_rent_payment',
  'mortgage': 'exp_Home_mortgage',

  'flights': 'exp_flights',
  'accommodation': 'exp_hotel',

  'savings': 'sav_main',
  'investment': 'sav_invest',
  'loan repayment': 'debt_main'
  */
};

const BANK_CATEGORY_MAP_BY_BANK = {
  nab: {
   /*
    'attractions & events': 'exp_entertainment',
    'restaurants & takeaway': 'exp_dining',
    'groceries': 'exp_groceries',
    'supermarket': 'exp_grocery_supermarket',
    'utilities': 'exp_utilities',
    'fuel': 'exp_fuel',
    'medical': 'exp_health',
    'transfers in': 'inc_transfer',
    'transfers out': 'exp_transfer_out',
    'internal transfers': 'exp_transfer_out',
    'uncategorised': 'ms_uncategorised',
    'personal care': 'exp_personal',
    'cafe & coffee': 'exp_dining',
    'other income': 'inc_other',
    'investment income': 'sav_invest',
    'refund': 'inc_refund',
    'gambling': 'exp_misc'
  },
  
  macquarie: {
    'technology': 'exp_software',
    'financial': 'ms_financial',
    'shopping': 'exp_online_shopping',
    'transport': 'exp_transport',
    'entertainment': 'exp_entertainment',
    'household': 'exp_groceries',
    'personal': 'exp_personal',
    'travel': 'exp_travel',
    'insurance': 'exp_insurance',
    'education': 'exp_education',
    'food & drink': 'exp_groceries'
    */
  }
};

// Add this function to improve matching logic
function findBestCategoryMatch(bankCategory, map) {
  if (!bankCategory) return null;
  
  const lowerCategory = bankCategory.toLowerCase().trim();
  
  // Try exact match first
  if (map[lowerCategory]) {
    return map[lowerCategory];
  }
  
  // Try partial match (e.g., "Technology" matches "technology")
  for (const [key, value] of Object.entries(map)) {
    if (lowerCategory.includes(key) || key.includes(lowerCategory)) {
      return value;
    }
  }
  
  return null;
}

// Resolve bank category to a categoryId
function resolveBankCategory(bankCategoryRaw, opts = {}) {
  if (!bankCategoryRaw) return null;
  const bankId = (opts.bankId || '').toLowerCase();
  const raw = bankCategoryRaw.toLowerCase().trim();

  // Try bank-specific mapping first
  if (BANK_CATEGORY_MAP_BY_BANK[bankId]) {
    const bankMatch = findBestCategoryMatch(raw, BANK_CATEGORY_MAP_BY_BANK[bankId]);
    if (bankMatch) return bankMatch;
  }

  // Try generic mapping
  const genericMatch = findBestCategoryMatch(raw, GENERIC_BANK_CATEGORY_MAP);
  if (genericMatch) return genericMatch;

  return null;
}

// ---------------------------------------------------------------------------
// Keyword → SUB-CATEGORY mapping (UPDATED!)
// Now maps to specific subcategories instead of main categories
// ---------------------------------------------------------------------------
const KEYWORD_CATEGORY_MAP = [
  // Groceries & supermarkets → SUB-CATEGORIES
  { pattern: /woolworths|Woolworths|woolies/gi, categoryId: 'exp_Woolworths' },
  //{ pattern: /coles/gi, categoryId: 'exp_Coles' },
  { pattern: /safeway/gi, categoryId: 'exp_Safeway' },
  { pattern: /aldi/gi, categoryId: 'exp_Aldi' },
  { pattern: /IGA|marketplace\s+fresh/gi, categoryId: 'exp_grocery_supermarket' },
  { pattern: /indian\s+grocer|spice\s+house|malvic|dosa\s+hut\s+grocer/gi, categoryId: 'exp_Indian_Groceries' },

  // Fast food / dining → SUB-CATEGORIES under exp_dining
  { pattern: /kfc/gi, categoryId: 'exp_kfc' },
  { pattern: /mcdonald'?s|maccas/gi, categoryId: 'exp_mcd' },
  { pattern: /hungry\s+jacks?/gi, categoryId: 'exp_hj' },
  { pattern: /nando'?s/gi, categoryId: 'exp_nandos' },
  { pattern: /domino'?s/gi, categoryId: 'exp_dominos' },
  { pattern: /pizza\s+hut/gi, categoryId: 'exp_pizzahut' },
  { pattern: /aangan|casey\s+kebab|indian\s+restaurant/gi, categoryId: 'exp_restaurants' },
  { pattern: /restaurant|diner|bistro|cafe|coffee/gi, categoryId: 'exp_dining' },

  // Fuel / transport → SUB-CATEGORIES
  { pattern: /bp\s+petrol|caltex|shell|7-eleven.*fuel|ampol|united\s+petroleum/gi, categoryId: 'exp_fuel' },
  { pattern: /rego|registration/gi, categoryId: 'exp_rego' },
  { pattern: /myki|opal.*card|ptv/gi, categoryId: 'exp_public_transport' },
  { pattern: /parking|parkmate|wilson\s+parking/gi, categoryId: 'exp_Parking_Fees' },
  { pattern: /citylink|toll/gi, categoryId: 'exp_citylink_toll' },

  // Utilities → SUB-CATEGORIES
  { pattern: /agl|origin\s+energy|simply\s+energy|red\s+energy|powershop|globird/gi, categoryId: 'exp_electricity' },
  { pattern: /nbn|telstra|optus|vocus|tpg|aussie\s+broadband/gi, categoryId: 'exp_internet' },

  // Health & medical → SUB-CATEGORIES
  { pattern: /chemist\s*warehouse|pharmacy|amcal/gi, categoryId: 'exp_pharmacy' },
  { pattern: /gp\s+clinic|medical\s+centre/gi, categoryId: 'exp_gp' },
  { pattern: /dental|dentist/gi, categoryId: 'exp_dental' },

  // Kids / school → SUB-CATEGORIES
  { pattern: /childcare|early\s+learning/gi, categoryId: 'exp_childcare' },
  { pattern: /school\s+fees|school\s+payment/gi, categoryId: 'exp_school_fees' },

  // Subscriptions → SUB-CATEGORIES
  { pattern: /netflix|stan|binge/gi, categoryId: 'exp_netflix' },
  { pattern: /disney\+?/gi, categoryId: 'exp_disney' },
  { pattern: /prime\s+video|amazon\s+prime/gi, categoryId: 'exp_prime' },
  { pattern: /spotify|apple\s+music|youtube\s+music/gi, categoryId: 'exp_music' },
  { pattern: /google|microsoft|apple\s+subscription|software/gi, categoryId: 'exp_software' },

  // Insurance → SUB-CATEGORIES
  { pattern: /allianz|aami|budget\s+direct|nrma|racv|bupa|medibank|nib/gi, categoryId: 'exp_insurance' },

  // Property / rates → SUB-CATEGORIES
  { pattern: /council\s+rates|city\s+of\s+/gi, categoryId: 'exp_council_rates' },
  { pattern: /body\s+corporate|owners\s+corp/gi, categoryId: 'exp_body_corporate' },
  { pattern: /land\s+tax/gi, categoryId: 'exp_Land_Tax' },

  // Tech & home office → SUB-CATEGORIES
  { pattern: /jb\s+hi-fi|harvey\s+norman|good\s+guys/gi, categoryId: 'exp_tech' },
  { pattern: /officeworks/gi, categoryId: 'exp_home_office' }
];

function keywordCategoryMatch(tx) {
  if (!tx) return null;
  const haystack =
    `${tx.description || ''} ${tx.rawDescription || ''} ${tx.merchant || ''}`.toLowerCase();

  for (const rule of KEYWORD_CATEGORY_MAP) {
      const regex = new RegExp(rule.pattern.source, 'i');
      if (regex.test(haystack)) {
      console.log(`[CategoryMapper] Keyword matched: ${rule.pattern} → ${rule.categoryId}`);
      return rule.categoryId;
    }
  }
  return null;
}

function normaliseMerchant(merchant = '') {
  return merchant
    .toLowerCase()
    .split(' ')
    .slice(0, 2)
    .join(' ');
}


// ---------------------------------------------------------------------------
// NEW: Merchant-specific subcategory mapping
// More specific than keyword matching
// ---------------------------------------------------------------------------
const MERCHANT_SUBCATEGORY_MAP = {
  // Grocery stores
  'woolworths': 'exp_Woolworths',
 //'coles': 'exp_Coles',
  'safeway': 'exp_Safeway',
  'aldi': 'exp_Aldi',
  'malvic': 'exp_Indian_Groceries',
  'marketplace fresh': 'exp_grocery_supermarket',
  'iga': 'exp_grocery_supermarket',
  'fish pier': 'exp_groceries',
  
  // Fast food
  'kfc': 'exp_kfc',
  'mcdonald': 'exp_mcd',
  'hungry jack': 'exp_hj',
  'nando': 'exp_nandos',
  'domino': 'exp_dominos',
  'pizza hut': 'exp_pizzahut',
  'aangan': 'exp_restaurants',
  'casey kebab': 'exp_restaurants',
  
  // Fuel
  'shell': 'exp_fuel',
  'bp': 'exp_fuel',
  'caltex': 'exp_fuel',
  '7-eleven': 'exp_fuel',
  'united petroleum': 'exp_fuel',
  
  // Utilities
  'origin energy': 'exp_electricity',
  'agl': 'exp_electricity',
  'globird': 'exp_electricity',
  
  // Pharmacy
  'chemist warehouse': 'exp_pharmacy',
  
  // Technology
  'google': 'exp_software',
  'microsoft': 'exp_software',
  'apple': 'exp_software',
  'aws': 'exp_software',
  
  // Streaming
  'netflix': 'exp_netflix',
  'disney': 'exp_disney',
  'prime video': 'exp_prime',
  'spotify': 'exp_music',
  
  // Insurance
  'aami': 'exp_insurance',
  
  // Transport
  'citylink': 'exp_citylink_toll',
  'wilson parking': 'exp_Parking_Fees',
  'myki': 'exp_public_transport',
  
  // Property
  'council rates': 'exp_council_rates',
  'body corporate': 'exp_body_corporate',
  'land tax': 'exp_Land_Tax'
};
function merchantSubcategoryMatch(tx) {
  if (!tx) return null;
  
  // Check both cleanDescription AND merchant
  const cleanDesc = (tx.cleanDescription || '').toLowerCase();
  const merchantText = normaliseMerchant(tx.merchant);
  
  const searchText = `${cleanDesc} ${merchantText}`.toLowerCase();
  
  console.log(`[DEBUG merchantSubcategoryMatch] Checking: "${searchText}"`);
  
  for (const [keyword, subcategoryId] of Object.entries(MERCHANT_SUBCATEGORY_MAP)) {
    const lowerKeyword = keyword.toLowerCase();
    if (searchText.includes(lowerKeyword)) {
      console.log(`[CategoryMapper] Merchant keyword "${keyword}" → subcategory "${subcategoryId}"`);
      return subcategoryId;
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
    if (catIdFromBank && !catIdFromBank.startsWith('ms_')) {
      trackAutoLearning('merchant', tx.merchant, catIdFromBank);
    }
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
// UPDATED PRIORITY:
// 1) Explicit userCategoryId (if passed in)
// 2) Merchant-specific subcategory match (NEW!)
// 3) Merchant rule (auto-learned or manual future rules)
// 4) Bank category mapping (if provided)
// 5) Keyword-based mapping from description/merchant
// 6) Fallback: ms_uncategorised
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

  // 2) Merchant-specific subcategory match (NEW - HIGH PRIORITY!)
  const merchantSubcategory = merchantSubcategoryMatch(tx);
  if (merchantSubcategory) {
    return {
      categoryId: merchantSubcategory,
      source: 'merchant_subcategory',
      rule: null
    };
  }

  // 3) Merchant rule
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

  // 4) Bank category mapping
  if (bankCategoryRaw) {
    const catIdFromBank = resolveBankCategory(bankCategoryRaw, {
      bankId: options.bankId
    });
    if (catIdFromBank) {
      // Auto-learn based on merchant + this category
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

  // 5) Keyword-based mapping from description/merchant
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

  // 6) Fallback
  return {
    categoryId: 'ms_uncategorised',
    source: 'fallback',
    rule: null
  };
}

// ---------------------------------------------------------------------------
// NEW: Helper function for parser.js
// ---------------------------------------------------------------------------
export function mapTransactionToSubcategory(tx, bankCategory = null, bankId = null) {
  const suggestion = suggestCategoryForTransaction(tx, bankCategory, { bankId });
  return suggestion.categoryId;
}