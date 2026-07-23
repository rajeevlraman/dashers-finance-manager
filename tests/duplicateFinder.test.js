import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { findDuplicateGroups, getDefaultDeletionIds } from '../js/import/duplicateFinder.js';

describe('findDuplicateGroups', () => {
  test('returns no groups when there are no duplicates', () => {
    const txs = [
      { id: '1', accountId: 'acct1', date: '2026-06-01', description: 'KFC', amount: -10, createdAt: '2026-06-01T10:00:00Z' },
      { id: '2', accountId: 'acct1', date: '2026-06-02', description: 'Woolworths', amount: -55, createdAt: '2026-06-02T10:00:00Z' },
    ];
    assert.deepEqual(findDuplicateGroups(txs), []);
  });

  test('groups two exact-content transactions with different ids as one duplicate group', () => {
    const txs = [
      { id: 'csv-1', accountId: 'acct1', date: '2026-06-29', description: 'KRITHIK RAJEEV DEPOSIT', amount: -50, createdAt: '2026-07-01T10:00:00Z' },
      { id: 'backup-1', accountId: 'acct1', date: '2026-06-29', description: 'KRITHIK RAJEEV DEPOSIT', amount: -50, createdAt: '2026-07-05T10:00:00Z' },
    ];
    const groups = findDuplicateGroups(txs);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].length, 2);
  });

  test('the earlier-created copy is first in the group (default "keep")', () => {
    const txs = [
      { id: 'newer', accountId: 'acct1', date: '2026-06-29', description: 'KFC', amount: -49.95, createdAt: '2026-07-05T10:00:00Z' },
      { id: 'older', accountId: 'acct1', date: '2026-06-29', description: 'KFC', amount: -49.95, createdAt: '2026-07-01T10:00:00Z' },
    ];
    const groups = findDuplicateGroups(txs);
    assert.equal(groups[0][0].id, 'older');
    assert.equal(groups[0][1].id, 'newer');
  });

  test('does not group transactions from different accounts even with identical content', () => {
    const txs = [
      { id: '1', accountId: 'acct1', date: '2026-06-29', description: 'KFC', amount: -49.95, createdAt: '2026-07-01T10:00:00Z' },
      { id: '2', accountId: 'acct2', date: '2026-06-29', description: 'KFC', amount: -49.95, createdAt: '2026-07-01T10:00:00Z' },
    ];
    assert.deepEqual(findDuplicateGroups(txs), []);
  });

  test('does not group transactions with different amounts', () => {
    const txs = [
      { id: '1', accountId: 'acct1', date: '2026-06-29', description: 'KFC', amount: -49.95, createdAt: '2026-07-01T10:00:00Z' },
      { id: '2', accountId: 'acct1', date: '2026-06-29', description: 'KFC', amount: -12.00, createdAt: '2026-07-01T10:00:00Z' },
    ];
    assert.deepEqual(findDuplicateGroups(txs), []);
  });

  test('groups three-way duplicates (e.g. imported 3 times) into a single group of 3, not separate pairs', () => {
    const txs = [
      { id: '1', accountId: 'acct1', date: '2026-06-29', description: 'KFC', amount: -49.95, createdAt: '2026-07-01T10:00:00Z' },
      { id: '2', accountId: 'acct1', date: '2026-06-29', description: 'KFC', amount: -49.95, createdAt: '2026-07-02T10:00:00Z' },
      { id: '3', accountId: 'acct1', date: '2026-06-29', description: 'KFC', amount: -49.95, createdAt: '2026-07-03T10:00:00Z' },
    ];
    const groups = findDuplicateGroups(txs);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].length, 3);
  });

  test('keeps two separate duplicate pairs as two separate groups, not merged', () => {
    const txs = [
      { id: '1a', accountId: 'acct1', date: '2026-06-01', description: 'KFC', amount: -10, createdAt: '2026-06-01T10:00:00Z' },
      { id: '1b', accountId: 'acct1', date: '2026-06-01', description: 'KFC', amount: -10, createdAt: '2026-06-01T11:00:00Z' },
      { id: '2a', accountId: 'acct1', date: '2026-06-15', description: 'Woolworths', amount: -80, createdAt: '2026-06-15T10:00:00Z' },
      { id: '2b', accountId: 'acct1', date: '2026-06-15', description: 'Woolworths', amount: -80, createdAt: '2026-06-15T11:00:00Z' },
    ];
    const groups = findDuplicateGroups(txs);
    assert.equal(groups.length, 2);
    assert.ok(groups.every(g => g.length === 2));
  });

  test('a single unmatched transaction never forms a group', () => {
    const txs = [
      { id: '1', accountId: 'acct1', date: '2026-06-01', description: 'KFC', amount: -10, createdAt: '2026-06-01T10:00:00Z' },
    ];
    assert.deepEqual(findDuplicateGroups(txs), []);
  });

  test('handles an empty transaction list', () => {
    assert.deepEqual(findDuplicateGroups([]), []);
  });
});

describe('getDefaultDeletionIds', () => {
  test('returns every id except the first (kept) one in each group', () => {
    const groups = [
      [{ id: 'keep1' }, { id: 'del1' }, { id: 'del2' }],
      [{ id: 'keep2' }, { id: 'del3' }],
    ];
    const ids = getDefaultDeletionIds(groups);
    assert.deepEqual(ids.sort(), ['del1', 'del2', 'del3'].sort());
  });

  test('returns an empty array when there are no groups', () => {
    assert.deepEqual(getDefaultDeletionIds([]), []);
  });
});
