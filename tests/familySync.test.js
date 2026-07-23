import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { storesForSections } from '../js/familySync.js';
import { storesForSections as serverStoresForSections, ALL_SECTIONS } from '../family-server/permissions.js';
import { ALL_SECTIONS_LABELS } from '../js/familySyncSections.js';

describe('familySync storesForSections (client copy)', () => {
  test('a user limited to "bills" only gets the bills store (plus always-synced)', () => {
    const stores = storesForSections(['bills']);
    assert.ok(stores.includes('bills'));
    assert.ok(!stores.includes('accounts'));
  });

  test('admin wildcard gets every store', () => {
    const stores = storesForSections(['*']);
    assert.ok(stores.includes('accounts'));
    assert.ok(stores.includes('properties'));
  });
});

describe('client/server section-mapping stay in sync', () => {
  // js/familySync.js intentionally duplicates family-server/permissions.js's
  // SECTION_STORES mapping (so the browser bundle doesn't need to reach
  // outside js/), rather than importing it. This test is the guard against
  // that duplication silently drifting apart over time.
  test('every section produces an identical store list on both sides', () => {
    for (const section of ALL_SECTIONS) {
      const clientStores = storesForSections([section]).sort();
      const serverStores = serverStoresForSections([section]).sort();
      assert.deepEqual(
        clientStores,
        serverStores,
        `mismatch for section "${section}": client=${clientStores} server=${serverStores}`
      );
    }
  });

  test('the admin wildcard produces an identical full store list on both sides', () => {
    const clientStores = storesForSections(['*']).sort();
    const serverStores = serverStoresForSections(['*']).sort();
    assert.deepEqual(clientStores, serverStores);
  });
});

describe('familySyncSections labels stay in sync with the server section list', () => {
  test('every server section has exactly one matching UI label, and vice versa', () => {
    const labelKeys = ALL_SECTIONS_LABELS.map(s => s.key).sort();
    const serverKeys = [...ALL_SECTIONS].sort();
    assert.deepEqual(labelKeys, serverKeys);
  });
});
