import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { merchantCategories } from '../js/import/merchantCategories.js';
import { suggestCategoryForTransaction, resolveMerchantLogo } from '../js/import/categoryMapper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Extract every real category id straight out of defaultCategories.js so
// this test can never drift out of sync with the actual default set.
function getRealCategoryIds() {
  const content = readFileSync(path.join(__dirname, '..', 'js', 'defaultCategories.js'), 'utf-8');
  const matches = [...content.matchAll(/id:\s*'([a-zA-Z_0-9]+)'/g)];
  return new Set(matches.map(m => m[1]));
}

describe('merchantCategories category IDs are all real (regression guard)', () => {
  // This is the exact bug that existed: 9 of 17 entries pointed to
  // category IDs that don't exist anywhere in defaultCategories.js
  // (exp_takeaway, exp_cafe, exp_medical, exp_online_shopping,
  // exp_gambling, exp_subscriptions, exp_transfers, inc_investment,
  // uncategorised). This test makes that class of bug impossible to
  // reintroduce silently.
  const realIds = getRealCategoryIds();

  test('every categoryId referenced actually exists in defaultCategories.js', () => {
    const dangling = Object.entries(merchantCategories)
      .filter(([, entry]) => !realIds.has(entry.categoryId))
      .map(([keyword, entry]) => `${keyword} -> ${entry.categoryId}`);
    assert.deepEqual(dangling, [], `dangling category references found: ${dangling.join(', ')}`);
  });

  test('the fallback "default" entry points to the real uncategorized bucket', () => {
    assert.equal(merchantCategories.default.categoryId, 'ms_uncategorised');
    assert.ok(realIds.has('ms_uncategorised'));
  });
});

describe('resolveMerchantLogo (categoryMapper.js) - now fixed to delegate correctly', () => {
  test('matches a real merchant and returns a logo path', () => {
    assert.equal(resolveMerchantLogo('woolworths melbourne'), 'assets/logos/woolworths.png');
  });

  test('returns null for an unrecognized merchant instead of throwing', () => {
    assert.equal(resolveMerchantLogo('some totally unknown business'), null);
  });
});

describe('suggestCategoryForTransaction', () => {
  test('matches a known merchant keyword to its category', () => {
    const tx = { description: 'WOOLWORTHS 1234 MELBOURNE', merchant: 'woolworths melbourne', cleanDescription: 'woolworths 1234 melbourne' };
    const { categoryId, source } = suggestCategoryForTransaction(tx, null, {});
    assert.equal(categoryId, 'exp_groceries');
    assert.notEqual(source, 'fallback');
  });

  test('falls back to the uncategorized bucket for a totally unknown transaction', () => {
    const tx = { description: 'SOME UNKNOWN BUSINESS XYZ', merchant: 'unknown business xyz', cleanDescription: 'some unknown business xyz' };
    const { categoryId, source } = suggestCategoryForTransaction(tx, null, {});
    assert.equal(source, 'fallback');
    assert.ok(getRealCategoryIds().has(categoryId), 'fallback categoryId should still be a real category');
  });

  test('regression: an unmatched INCOME transaction falls back to "Other Income", not the expense-typed "Uncategorised" bucket', () => {
    const tx = { type: 'income', description: 'SOME UNKNOWN DEPOSIT XYZ', merchant: 'unknown deposit xyz' };
    const { categoryId, source } = suggestCategoryForTransaction(tx, null, {});
    assert.equal(source, 'fallback');
    assert.equal(categoryId, 'ms_income_other');
  });

  test('regression: an unmatched EXPENSE transaction falls back to Misc Items, not the bare "Uncategorised" label', () => {
    const tx = { type: 'expense', description: 'SOME UNKNOWN BUSINESS XYZ', merchant: 'unknown business xyz' };
    const { categoryId, source } = suggestCategoryForTransaction(tx, null, {});
    assert.equal(source, 'fallback');
    assert.equal(categoryId, 'exp_misc_items');
  });

  test('regression: a salary deposit is recognized via keyword match even with no matching bank category', () => {
    const tx = { type: 'income', description: 'PAY/SALARY FROM GCP', merchant: 'gcp' };
    const { categoryId, source } = suggestCategoryForTransaction(tx, null, {});
    assert.equal(categoryId, 'ms_income_salary');
    assert.notEqual(source, 'fallback');
  });

  test('regression: Microsoft and Amazon Web Services resolve to real tech categories, not a generic fallback', () => {
    const msTx = { type: 'expense', description: "MICROSOFT#G170348761 MSBILL.INFO", merchant: 'microsoft g170348761 msbill info' };
    assert.equal(suggestCategoryForTransaction(msTx, null, {}).categoryId, 'ms_tech_software');

    const awsTx = { type: 'expense', description: 'AMAZON WEB SERVICES SYDNEY', merchant: 'amazon web services' };
    assert.equal(suggestCategoryForTransaction(awsTx, null, {}).categoryId, 'ms_tech_online_services');
  });

  test('regression: a NAB "Transfers out" bank category resolves instead of falling through unmatched', () => {
    const tx = { type: 'expense', description: 'KRITHIK RAJEEV C6618106338 DADS DEPOSIT', merchant: 'krithik rajeev' };
    const { categoryId, source } = suggestCategoryForTransaction(tx, 'Transfers out', { bankId: 'nab' });
    assert.equal(categoryId, 'ms_financial_transfers');
    assert.equal(source, 'bank_category');
  });

  test('regression: a specific bank category ("Food & Drink") no longer gets shadowed by the generic "food"->groceries key', () => {
    const tx = { type: 'expense', description: 'KFC Berwick South', merchant: 'kfc' };
    const { categoryId } = suggestCategoryForTransaction(tx, 'Food & Drink', {});
    assert.equal(categoryId, 'exp_dining');
  });

  test('regression: "Shelly" (smart-home hardware) is not miscategorized as Shell fuel via a substring match', () => {
    const shellyTx = { type: 'expense', description: 'SHELLY RELAY SWITCH', merchant: 'shelly relay switch' };
    assert.equal(suggestCategoryForTransaction(shellyTx, null, {}).categoryId, 'ms_tech_hardware');

    const shellTx = { type: 'expense', description: 'SHELL NARRE WARREN', merchant: 'shell narre warren' };
    assert.equal(suggestCategoryForTransaction(shellTx, null, {}).categoryId, 'exp_fuel');
  });

  test('regression: Specsavers and Superloop have real categories, not just logos with no matching rule', () => {
    const specsaversTx = { type: 'expense', description: 'SPECSAVERS BERWICK', merchant: 'specsavers' };
    assert.equal(suggestCategoryForTransaction(specsaversTx, null, {}).categoryId, 'ms_health_eyes');

    const superloopTx = { type: 'expense', description: 'SUPERLOOP INTERNET', merchant: 'superloop' };
    assert.equal(suggestCategoryForTransaction(superloopTx, null, {}).categoryId, 'exp_internet');
  });
});
