// ============================================================================
// categoryMapper.js
// Smart category engine for imported transactions
// - Uses: merchant rules, bank category mappings, keyword matching
// - Auto-learns merchant rules after repeated consistent matches
// ============================================================================

//To activate logo + category matching in your app, add line 10 to 29 here inside categoryMapper.js:

import { getMerchantLogo } from "./merchantLogos.js";
import { merchantCategories } from "./merchantCategories.js";

// Bug fix: this used to do `Object.keys(merchantLogos)` where
// merchantLogos is an ARRAY of { keywords: [...], logo } entries, not a
// plain object — Object.keys() on an array returns numeric indices
// ("0", "1", "2"...), so this never actually matched any real merchant. It
// was also never called anywhere in the app. Now it delegates to the
// correct, tested implementation in merchantLogos.js.
export function resolveMerchantLogo(cleanDesc) {
  return getMerchantLogo(cleanDesc);
}

export function resolveMerchantCategory(cleanDesc) {
  for (const key of Object.keys(merchantCategories)) {
    if (key !== 'default' && hasWholeWord(cleanDesc, key)) {
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

// Bug fix: every keyword match in this file used to be a raw substring
// check (text.includes(keyword)), which lets a short or generic keyword
// match inside an unrelated longer word - e.g. "food" inside "seafood", or
// "car" inside "card". This checks for the keyword as a whole word/phrase
// instead, using \b boundaries, so it only matches when the keyword isn't
// glued to other letters.
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWholeWord(text, keyword) {
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i').test(text);
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
      if (!hasWholeWord(merchantKey, rulePattern)) continue;
    } else if (rule.field === 'description') {
      if (!hasWholeWord(descKey, rulePattern)) continue;
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
  'groceries': 'cat_groceries',
  'supermarket': 'sub_supermarket',
  'food': 'cat_groceries',
  'dining': 'cat_dining',
  'restaurants': 'cat_dining',
  'subscriptions': 'cat_entertainment',
  'fast food': 'cat_dining',
  'takeaway': 'cat_dining',
  // Bug fix: Macquarie's own CSV "Category" column uses "Food & Drink"
  // as a single combined label for cafes/takeaway/restaurants (see the
  // real sample row in this project's tests, where KFC is filed under
  // "Food & Drink"). Without this, the bare 'food' key below matched
  // first and mapped it to Groceries instead — see the length-sort
  // fix in resolveBankCategory() that makes this take priority.
  'food & drink': 'cat_dining',
  'food and drink': 'cat_dining',

  'medical': 'cat_health',
  'health': 'cat_health',

  'fuel': 'sub_fuel',
  'petrol': 'sub_fuel',
  'transport': 'cat_transport',
  // Bug fix: Macquarie's own CSV category column uses "Transportation",
  // which never matched the 'transport' key above for the same reason
  // "transfers" never matched "transfer" - there's no word boundary
  // between "transport" and the "ation" that follows it.
  'transportation': 'cat_transport',
  'tolls': 'sub_tolls_parking',
  'parking': 'sub_tolls_parking',
  'public transport': 'sub_public_transport',
  'transit': 'sub_public_transport',

  'insurance': 'cat_insurance',
  'home insurance': 'sub_home_ins',
  'car insurance': 'sub_car_insurance',
  'life insurance': 'sub_life_ins',
  'health insurance': 'sub_health_insurance',

  'utilities': 'cat_utilities',
  'electricity': 'sub_electricity',
  'gas': 'sub_gas',
  'water': 'sub_water_usage',
  'internet': 'sub_internet',
  'phone': 'sub_mobile',

  'education': 'cat_education',
  'school fees': 'sub_school_fees',
  'university': 'sub_uni_fees',

  'fees': 'cat_fees',
  'charges': 'cat_fees',

  'rent': 'sub_rent_payment',
  'mortgage': 'sub_mortgage_home',

  'travel': 'cat_travel',
  'flights': 'sub_flights',
  'accommodation': 'sub_accommodation',

  'savings': 'cat_savings',
  'investment': 'sub_shares_etf',
  'loan repayment': 'cat_debt',

  // Bug fix: NAB's own CSV "Category" column commonly says "Transfers
  // out"/"Transfers in" (see the real sample row in this project's
  // tests), which had no entry here, so every NAB transfer fell all the
  // way through to keyword matching (no match either) and then the
  // fallback — despite the bank having told us exactly what it was.
  'transfer': 'sub_general_transfer',
  // Bug fix: the bare 'transfer' key above never actually matched NAB's
  // real "Transfers in" / "Transfers out" labels, because whole-word
  // matching requires a boundary right after "transfer" - "transfers"
  // has an "s" glued straight on, so there's no boundary there. Adding
  // the plural forms explicitly (found in real NAB export data) instead
  // of trying to make "transfer" match its own plural.
  'transfers in': 'sub_general_transfer',
  'transfers out': 'sub_general_transfer',

  // Bug fix: also found in real NAB export data with no mapping at all,
  // so every ATM withdrawal and grooming/salon expense fell through to
  // "Uncategorised" despite NAB's own category column saying exactly
  // what they were.
  'cash': 'sub_cash_withdrawal',
  'personal care': 'sub_grooming'
};

const BANK_CATEGORY_MAP_BY_BANK = {
  // You can expand specific bank mappings here
  nab: {
    'groceries': 'cat_groceries',
    'supermarket': 'sub_supermarket',
    // Confirmed with user from real NAB export data.
    'gambling': 'sub_gambling',
    'electronics & technology': 'sub_electronics',
    'medical': 'cat_health',
    'health': 'cat_health',
    'fuel': 'sub_fuel',
    'petrol': 'sub_fuel',
    'transport': 'cat_transport',
    'tolls': 'sub_tolls_parking',
    'parking': 'sub_tolls_parking',
    'insurance': 'cat_insurance',
    'electricity': 'sub_electricity',
    'gas': 'sub_gas',
    'water': 'sub_water_usage',
    'internet': 'sub_internet',
    'phone': 'sub_mobile',
    'education': 'cat_education',
    'fees': 'cat_fees',
    'rent': 'sub_rent_payment',
    'mortgage': 'sub_mortgage_home'
    // etc.
  },

  // Confirmed with user against real Macquarie export data. Keys here are
  // Macquarie's Subcategory column values (see the parser.js change that
  // now prefers Subcategory over the generic parent Category), scoped to
  // this bank specifically since some of these words (e.g. "services") are
  // too generic to risk applying to every bank's vocabulary.
  macquarie: {
    'groceries': 'cat_groceries',
    'fast food': 'sub_fast_food',
    'restaurants': 'cat_dining',
    'fuel': 'sub_fuel',
    // Confirmed with user: Public Transit here is really about vehicle
    // registration (the one real example was "Department of Transport"),
    // not train/bus fares.
    'public transit': 'sub_rego',
    'phone': 'sub_mobile',
    // No generic "Streaming" category exists (only provider-specific ones
    // like Netflix/Disney/Prime) and "Pay TV" doesn't tell us which
    // provider, so this goes to the generic Subscriptions category rather
    // than guessing a specific streaming service.
    'pay tv': 'cat_entertainment',
    'bpay payments': 'sub_bpay',
    'annual cardholder fees': 'cat_fees',
    'hardware': 'sub_electronics'
    // "Other Personal Expenses" and "Services" deliberately left
    // unmapped - confirmed with user these are too mixed (Amazon, union
    // dues, Kmart, CoreLogic all appear under the same subcategory) to
    // safely map as a whole; left to per-merchant matching instead.
  }
};

// Resolve bank category to a categoryId
function resolveBankCategory(bankCategoryRaw, opts = {}) {
  if (!bankCategoryRaw) return null;
  const bankId = (opts.bankId || '').toLowerCase();
  const raw = bankCategoryRaw.toLowerCase().trim();

  const bankMap = BANK_CATEGORY_MAP_BY_BANK[bankId] || {};
  // Bug fix: this used to check keys in plain object insertion order, so
  // a short generic key (e.g. "food") could match — and win — before a
  // more specific, more correct phrase (e.g. "food & drink", "fast
  // food") ever got checked, even though the more specific phrase was
  // right there in the list. Sorting longest-first means the most
  // specific applicable phrase always wins.
  const allKeys = [
    ...Object.keys(bankMap),
    ...Object.keys(GENERIC_BANK_CATEGORY_MAP)
  ].sort((a, b) => b.length - a.length);

  for (const key of allKeys) {
    if (!key) continue;
    if (hasWholeWord(raw, key)) {
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
  // Bug fix: these three used to be bundled into one pattern pointing at
  // the generic Groceries & Household category, even though the user has
  // dedicated Coles/Aldi/Safeway categories that were sitting completely
  // unused as a result. Split out so each brand with its own category
  // reaches it, matching the same approach as the KFC/McDonald's split
  // below. Woolworths and IGA have no dedicated category, so they
  // correctly stay on the generic one.
  { pattern: /\bwoolworths\b|\bwoolies\b|\biga\b/gi, categoryId: 'cat_groceries' },
  { pattern: /\bcoles\b/gi, categoryId: 'sub_supermarket' },
  { pattern: /\baldi\b/gi, categoryId: 'sub_supermarket' },
  { pattern: /\bsafeway\b/gi, categoryId: 'sub_supermarket' },
  { pattern: /indian\s+grocer|spice\s+house|mal\s*vic|dosa\s+hut\s+grocer|aangan|marketplace\s+fresh|vel\s*spices/gi, categoryId: 'sub_specialty_groceries' },

  // Fast food / dining
  { pattern: /kfc/gi, categoryId: 'sub_fast_food' },
  { pattern: /mcdonald'?s|maccas/gi, categoryId: 'sub_fast_food' },
  { pattern: /hungry\s+jacks?/gi, categoryId: 'sub_fast_food' },
  { pattern: /nando'?s/gi, categoryId: 'sub_fast_food' },
  { pattern: /domino'?s/gi, categoryId: 'sub_fast_food' },
  { pattern: /pizza\s+hut/gi, categoryId: 'sub_fast_food' },
  // Bug fix: added — no entry for these previously, despite logos
  // already existing in assets/logos for them.
  { pattern: /guzman\s*y?\s*gomez|\bgyg\b/gi, categoryId: 'cat_dining' },
  { pattern: /boost\s+juice/gi, categoryId: 'cat_dining' },
  { pattern: /uber\s*eats|menulog|doordash/gi, categoryId: 'cat_dining' },
  { pattern: /\brestaurant\b|\bdiner\b|\bbistro\b|\bcafe\b|\bcoffee\b/gi, categoryId: 'cat_dining' },

  // Fuel / transport
  // Bug fix: the old pattern required the literal word "fuel" to appear
  // right after "7-eleven" (e.g. it would only match "7-Eleven fuel"),
  // but real 7-Eleven transaction lines just say "7 ELEVEN 1306 NARRE
  // WARREN" — no "fuel" anywhere in the text — so this never actually
  // matched a real 7-Eleven transaction. Also added apco/reddy/united
  // petroleum, which have logos but weren't covered here.
  // Bug fix: "shell" (Shell fuel) used to match without a word boundary,
  // so it also matched "Shelly" (a smart-home hardware brand) as a
  // substring, silently miscategorizing Shelly purchases as fuel.
  { pattern: /\bbp\s+petrol\b|\bcaltex\b|\bshell\b|7[\s-]?eleven|\bampol\b|\bapco\b|reddy\s*(fuel|express)|united\s+petroleum/gi, categoryId: 'sub_fuel' },
  // Bug fix: "Department of Transport (Victoria)" found uncategorized in
  // real import data - VicRoads' vehicle registration functions were
  // absorbed into this department, so it belongs with the same rego
  // category as the other patterns here.
  { pattern: /rego|registration|vicroads|department\s+of\s+transport/gi, categoryId: 'sub_rego' },
  { pattern: /\bmyki\b|opal.*card|\bptv\b/gi, categoryId: 'sub_public_transport' },
  { pattern: /parking|parkmate|wilson\s+parking/gi, categoryId: 'sub_tolls_parking' },
  { pattern: /\bcitylink\b|\blinkt\b|\btoll\b/gi, categoryId: 'sub_tolls_parking' },
  { pattern: /malaysian?\s+airlines?|qantas|jetstar|virgin\s+australia/gi, categoryId: 'sub_flights' },

  // Utilities
  { pattern: /\bagl\b|origin\s+energy|simply\s+energy|red\s+energy|\bpowershop\b|\bglobird\b/gi, categoryId: 'sub_electricity' },
  { pattern: /south\s+east\s+water|yarra\s+valley\s+water|city\s+west\s+water/gi, categoryId: 'sub_water_usage' },
  { pattern: /\bnbn\b|\btelstra\b|\boptus\b|\bvocus\b|\btpg\b|aussie\s+broadband|\bsuperloop\b/gi, categoryId: 'sub_internet' },

  // Health & medical
  { pattern: /chemist\s*warehouse|\bpharmacy\b|\bamcal\b/gi, categoryId: 'sub_pharmacy' },
  { pattern: /gp\s+clinic|medical\s+centre|myhealth/gi, categoryId: 'sub_gp' },
  { pattern: /dental|dentist/gi, categoryId: 'sub_dental' },
  { pattern: /specsavers|spec\s*savers/gi, categoryId: 'sub_specialists' },
  { pattern: /medicare/gi, categoryId: 'cat_health' },
  { pattern: /ambulance\s+victoria/gi, categoryId: 'sub_ambulance_cover' },

  // Kids / school
  { pattern: /childcare|early\s+learning/gi, categoryId: 'sub_childcare' },
  { pattern: /school\s+fees|school\s+payment|schoolpix/gi, categoryId: 'sub_school_fees' },

  // Subscriptions & entertainment
  { pattern: /netflix|\bstan\b|binge/gi, categoryId: 'sub_streaming' },
  { pattern: /disney\+?/gi, categoryId: 'sub_streaming' },
  { pattern: /prime\s+video|amazon\s+prime/gi, categoryId: 'sub_streaming' },
  { pattern: /spotify|apple\s+music|youtube\s+music|amazon\s+music/gi, categoryId: 'sub_music_subs' },
  { pattern: /\bxbox\b/gi, categoryId: 'sub_gaming' },
  { pattern: /eb\s*games/gi, categoryId: 'sub_gaming' },
  { pattern: /sea\s*life|sealife/gi, categoryId: 'sub_events_movies' },

  // Bug fix: Microsoft and generic Amazon had no keyword coverage at
  // all despite being two of the most common transactions (and both
  // explicitly called out as needing a real category, not
  // "Uncategorised"). Amazon Web Services gets its own tech/business
  // bucket since it's cloud infrastructure spend, not a retail purchase.
  { pattern: /microsoft|msbill\.info|office\s*365/gi, categoryId: 'sub_software_cloud' },
  { pattern: /amazon\s*web\s*services|\baws\b/gi, categoryId: 'sub_software_cloud' },
  { pattern: /amazon(?!\s*(web\s*services|music|prime))/gi, categoryId: 'sub_general_retail' },
  { pattern: /paypal/gi, categoryId: 'sub_general_retail' },
  { pattern: /apple(?!\s*music)|itunes/gi, categoryId: 'cat_shopping' },

  // General retail (bug fix: bunnings/kmart/target/myer/jb hi-fi's
  // sibling stores/westfield/uniqlo/temu/rebel/petstock had logos but
  // no category coverage)
  { pattern: /bunnings/gi, categoryId: 'sub_home_repairs' },
  { pattern: /\bkmart\b|\btarget\b|\bmyer\b|\bwestfield\b|\buniqlo\b|\btemu\b|big\s*w|\baliexpress\b/gi, categoryId: 'sub_general_retail' },
  // Confirmed with user: found in real NAB data mislabeled by the bank's
  // own category column as generic "Homeware" - Kathmandu sells outdoor
  // clothing and camping gear, not homeware.
  { pattern: /kathmandu/gi, categoryId: 'sub_clothing' },
  { pattern: /rebel\s+sport/gi, categoryId: 'sub_fitness' },
  { pattern: /petstock/gi, categoryId: 'cat_pets' },

  // Insurance
  { pattern: /\ballianz\b|\baami\b|budget\s+direct|\bnrma\b|\bracv\b|\bbupa\b|\bmedibank\b|\bnib\b/gi, categoryId: 'cat_insurance' },
  { pattern: /hannover|real\s+insurance/gi, categoryId: 'sub_life_ins' },

  // Property / rates
  { pattern: /council\s+rates|city\s+of\s+/gi, categoryId: 'sub_council_rates' },
  { pattern: /body\s+corporate|owners\s+corp/gi, categoryId: 'sub_body_corporate' },

  // Tech & home office
  { pattern: /jb\s+hi-fi|harvey\s+norman|good\s+guys/gi, categoryId: 'cat_shopping' },
  { pattern: /officeworks/gi, categoryId: 'sub_electronics' },
  { pattern: /\bsonoff\b|\bshelly\b/gi, categoryId: 'sub_electronics' },

  // Tax / government
  { pattern: /land\s+tax|\bsro\b|state\s+revenue\s+office/gi, categoryId: 'sub_land_tax' },
  { pattern: /\bato\b|australian\s+taxation\s+office/gi, categoryId: 'sub_personal_tax' },
  { pattern: /h\s*&\s*r\s*block/gi, categoryId: 'sub_business_services' },
  { pattern: /australia\s*post|auspost/gi, categoryId: 'sub_rideshare_taxi' },

  // Leisure
  { pattern: /the\s+lott\b/gi, categoryId: 'sub_gambling' },

  // Income — bug fix: previously there was no income-side keyword
  // coverage at all, so every salary/wage deposit that didn't happen
  // to match a bank-provided category fell straight through to the
  // (expense-typed) "Uncategorised" fallback. These match on the raw
  // description text before merchant-name cleanup strips the words
  // out, so they still catch "PAY/SALARY FROM GCP" style deposits.
  { pattern: /salary|wages?|payroll/gi, categoryId: 'sub_salary' },
  { pattern: /dividend/gi, categoryId: 'sub_dividends' }
];

function keywordCategoryMatch(tx) {
  if (!tx) return null;
  const haystack =
    `${tx.description || ''} ${tx.rawDescription || ''} ${tx.merchant || ''}`.toLowerCase();

  for (const rule of KEYWORD_CATEGORY_MAP) {
    // Bug fix: every pattern here uses the /g flag, and a /g regex keeps
    // internal position state (lastIndex) across calls to .test() on the
    // same object. Since these patterns are shared module-level constants
    // reused for every transaction checked, a pattern that just matched
    // one transaction could leave lastIndex partway through that string -
    // then the very next transaction it's tested against starts searching
    // from that same offset instead of position 0, and can spuriously
    // fail to match even when the keyword is right there at the start.
    // Resetting lastIndex before every test makes each check independent
    // of whatever happened on the previous transaction.
    rule.pattern.lastIndex = 0;
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
// A small, deliberately short list of overrides that win even over the
// bank's own category label - reserved for cases where that label is
// actively misleading, not routine keyword matching (KEYWORD_CATEGORY_MAP
// is for that, and only runs after bank-category matching). Add to this
// list sparingly.
const HIGH_CONFIDENCE_OVERRIDES = [
  // Confirmed with user: NAB tags real estate agency rent distributions
  // as generic "Investment income", which the unrelated 'investment' ->
  // Investments mapping would otherwise catch first.
  { pattern: /ray\s+white/gi, categoryId: 'sub_rental_income' },

  // Confirmed with user: these two employers were being categorized
  // backwards (this account holder's own salary was landing on Spouse,
  // and vice versa) - almost certainly from a previously-learned
  // merchant rule set up the wrong way round. These overrides win
  // regardless of whatever a learned rule currently says.
  { pattern: /department\s+of\s+ed/gi, categoryId: 'sub_spouse_salary' },
  { pattern: /\bgcp\b/gi, categoryId: 'sub_salary' },

  // Confirmed with user: label money transfers by which of their own
  // accounts/people the description says it actually went to, rather
  // than a single generic "Transfer" bucket.
  { pattern: /nab\s+savings/gi, categoryId: 'sub_transfer_savings' },
  { pattern: /\binv\s+offset\s+account\b/gi, categoryId: 'sub_transfer_inv_offset' },
  { pattern: /\bme\s+offset\s+account\b/gi, categoryId: 'sub_transfer_offset' },
  { pattern: /\bto\s+rajeev\b|raman\s+rajeev\s+lakshmi/gi, categoryId: 'sub_transfer_person' },

  // Found via systematic scan: "interest" alone is ambiguous - could be
  // interest earned (income) or interest charged on a card/loan (an
  // expense) - and the old flat keyword rule always assumed income
  // regardless of transaction type. Splitting by type here instead.
  { pattern: /\binterest\b/gi, categoryId: 'sub_interest_income', type: 'income' },
  { pattern: /\binterest\b/gi, categoryId: 'sub_interest_charged', type: 'expense' },

  // Found via real ANZ data: "BPAY TAX OFFICE PAYMENT" is a payment to the
  // Australian Taxation Office. Left ambiguous otherwise, since several
  // unrelated tax categories (Land Tax, Tax Refund, Other Tax Expenses)
  // all tie once "office"/"payment" are excluded as generic words.
  { pattern: /tax\s+office/gi, categoryId: 'sub_personal_tax' }
];

export function suggestCategoryForTransaction(tx, bankCategoryRaw = null, options = {}) {
  const dryRun = !!options.dryRun;

  // 1) User override (if importer already knows a manual choice)
  if (options.userCategoryId) {
    return {
      categoryId: options.userCategoryId,
      source: 'user_override',
      rule: null
    };
  }

  // 2) High-confidence overrides - a small, deliberately short list for
  // cases where a very specific signal should win even over the bank's
  // own category label, because that label is actively misleading rather
  // than just generic. Confirmed with user: NAB tags real estate agency
  // rent distributions as generic "Investment income", which would
  // otherwise be caught by the unrelated 'investment' -> Investments
  // mapping below before ever reaching keyword matching. This is NOT the
  // place for routine keyword rules - see KEYWORD_CATEGORY_MAP for those.
  const highConfidenceHaystack =
    `${tx.description || ''} ${tx.rawDescription || ''} ${tx.merchant || ''}`.toLowerCase();
  for (const rule of HIGH_CONFIDENCE_OVERRIDES) {
    if (rule.type && rule.type !== tx.type) continue;
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(highConfidenceHaystack)) {
      return { categoryId: rule.categoryId, source: 'keyword_match', rule: null };
    }
  }

  // 3) Merchant rule
  const merchantRule = findMerchantRuleForTransaction(tx);
  if (merchantRule) {
    if (!dryRun) {
      merchantRule.hitCount = (merchantRule.hitCount || 0) + 1;
      merchantRule.lastUsed = new Date().toISOString();
      saveRulesToStorage();
    }

    return {
      categoryId: merchantRule.categoryId,
      source: 'merchant_rule',
      rule: merchantRule
    };
  }

  // 4) Keyword-based mapping from description/merchant
  // Bug fix: this used to run AFTER bank-category matching, but a bank's
  // own category label is often much more generic than what keyword
  // matching on the actual merchant name can find - e.g. NAB labels both
  // "South East Water" and an electricity bill the same generic
  // "Utilities", while keyword matching on the merchant name itself can
  // tell them apart (Water Usage vs Electricity). Running keyword
  // matching first means a specific match here wins over a generic bank
  // label, while bank-category matching (next) still fills in the gaps
  // keyword matching can't cover (NAB's "Cash", "Personal care", etc.,
  // which have no reliable merchant-name keyword to match on).
  const catIdFromKeywords = keywordCategoryMatch(tx);
  if (catIdFromKeywords) {
    if (!dryRun && tx && tx.merchant) {
      trackAutoLearning('merchant', tx.merchant, catIdFromKeywords);
    }
    return {
      categoryId: catIdFromKeywords,
      source: 'keyword_match',
      rule: null
    };
  }

  // 5) Bank category mapping
  if (bankCategoryRaw) {
    const catIdFromBank = resolveBankCategory(bankCategoryRaw, {
      bankId: options.bankId
    });
    if (catIdFromBank) {
      // Auto-learn based on merchant + this category (your option A)
      if (!dryRun && tx && tx.merchant) {
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

  // 6) Fallback
  // Bug fix: this always returned 'cat_misc' — a category
  // explicitly typed 'expense' — regardless of what kind of
  // transaction it was. An unmatched salary deposit or refund would
  // get labelled as an "Uncategorised" expense, which is both an
  // unhelpful name and the wrong type. This now branches: an unmatched
  // income transaction goes to "Other Income", and an unmatched
  // expense goes to "Misc Items" — every transaction lands in a real,
  // sensibly-named category. (Genuinely unrecognised merchants will
  // still land here — the way to close that gap further is adding more
  // keyword/logo entries, or just categorizing it once yourself: after
  // 3 manual picks for the same merchant the app auto-learns the rule
  // going forward.)
  const fallback = (tx && tx.type === 'income') ? 'sub_other_income' : 'sub_misc_items';
  return {
    categoryId: fallback,
    source: 'fallback',
    rule: null
  };
}
