import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { storesForSections, isValidSection, ALL_SECTIONS, SECTION_STORES } from '../permissions.js';

describe('storesForSections', () => {
  test('admin (["*"]) gets every store used by any section, plus always-synced stores', () => {
    const stores = storesForSections(['*']);
    assert.ok(stores.includes('accounts'));
    assert.ok(stores.includes('bills'));
    assert.ok(stores.includes('properties'));
    assert.ok(stores.includes('meta'));
  });

  test('a user limited to "bills" only gets the bills store (plus always-synced)', () => {
    const stores = storesForSections(['bills']);
    assert.ok(stores.includes('bills'));
    assert.ok(!stores.includes('accounts'));
    assert.ok(!stores.includes('properties'));
    assert.ok(!stores.includes('loans'));
  });

  test('a user with no sections still gets always-synced stores but nothing sensitive', () => {
    const stores = storesForSections([]);
    assert.ok(stores.includes('meta'));
    assert.ok(!stores.includes('accounts'));
    assert.ok(!stores.includes('bills'));
  });

  test('sections that map to multiple stores (e.g. loans) include all of them', () => {
    const stores = storesForSections(['loans']);
    assert.ok(stores.includes('loans'));
    assert.ok(stores.includes('loanTransactions'));
  });

  test('dashboard/reports/calendar are aggregate views with no dedicated stores of their own', () => {
    assert.deepEqual(SECTION_STORES.dashboard, []);
    assert.deepEqual(SECTION_STORES.reports, []);
    assert.deepEqual(SECTION_STORES.calendar, []);
  });

  test('never returns duplicate store names even if sections overlap', () => {
    const stores = storesForSections(['bills', 'bills', 'loans']);
    const unique = new Set(stores);
    assert.equal(stores.length, unique.size);
  });
});

describe('isValidSection', () => {
  test('accepts every section actually used by the app nav', () => {
    for (const section of ALL_SECTIONS) {
      assert.equal(isValidSection(section), true);
    }
  });

  test('rejects an unknown/made-up section name', () => {
    assert.equal(isValidSection('totallyMadeUpSection'), false);
  });

  test('rejects the admin wildcard as a section name (it is not a real section)', () => {
    assert.equal(isValidSection('*'), false);
  });
});
