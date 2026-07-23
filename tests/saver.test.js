import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isDuplicateTransaction } from '../js/import/saver.js';

describe('isDuplicateTransaction', () => {
  test('flags a transaction with the same date, amount, description and account as a duplicate', () => {
    const existing = [
      { id: 'a1', accountId: 'acct1', date: '2026-06-29', description: 'KFC Berwick', amount: -49.95 }
    ];
    const candidate = { accountId: 'acct1', date: '2026-06-29', description: 'KFC Berwick', amount: -49.95 };
    assert.equal(isDuplicateTransaction(candidate, existing), true);
  });

  test('regression: restoring a backup after a CSV import already created the same real transaction under a different id — still flagged as a duplicate even though ids differ', () => {
    // Simulates: a CSV import already saved this transaction with a
    // freshly-generated id ("csv-generated-1"). A backup file (taken on
    // another device, or from before the CSV import) is now being
    // restored and contains the SAME real-world transaction, but with
    // its own different id ("backup-original-id") — before this fix,
    // restore only matched on id and would have added this as a second,
    // visually identical row.
    const existingFromCsvImport = [
      { id: 'csv-generated-1', accountId: 'acct1', date: '2026-06-29', description: 'KRITHIK RAJEEV C6618106338 DADS DEPOSIT', amount: -50 }
    ];
    const backupItem = { id: 'backup-original-id', accountId: 'acct1', date: '2026-06-29', description: 'KRITHIK RAJEEV C6618106338 DADS DEPOSIT', amount: -50 };
    assert.equal(isDuplicateTransaction(backupItem, existingFromCsvImport), true);
  });

  test('does not flag a different amount as a duplicate', () => {
    const existing = [{ id: 'a1', accountId: 'acct1', date: '2026-06-29', description: 'KFC Berwick', amount: -49.95 }];
    const candidate = { accountId: 'acct1', date: '2026-06-29', description: 'KFC Berwick', amount: -12.00 };
    assert.equal(isDuplicateTransaction(candidate, existing), false);
  });

  test('does not flag the same content on a different account as a duplicate', () => {
    const existing = [{ id: 'a1', accountId: 'acct1', date: '2026-06-29', description: 'KFC Berwick', amount: -49.95 }];
    const candidate = { accountId: 'acct2', date: '2026-06-29', description: 'KFC Berwick', amount: -49.95 };
    assert.equal(isDuplicateTransaction(candidate, existing), false);
  });

  test('does not flag the same content more than 2 days apart as a duplicate', () => {
    const existing = [{ id: 'a1', accountId: 'acct1', date: '2026-06-29', description: 'KFC Berwick', amount: -49.95 }];
    const candidate = { accountId: 'acct1', date: '2026-07-05', description: 'KFC Berwick', amount: -49.95 };
    assert.equal(isDuplicateTransaction(candidate, existing), false);
  });

  test('still flags a duplicate within the +/- 2 day buffer (e.g. a bank posting-date shift)', () => {
    const existing = [{ id: 'a1', accountId: 'acct1', date: '2026-06-29', description: 'KFC Berwick', amount: -49.95 }];
    const candidate = { accountId: 'acct1', date: '2026-07-01', description: 'KFC Berwick', amount: -49.95 };
    assert.equal(isDuplicateTransaction(candidate, existing), true);
  });
});
