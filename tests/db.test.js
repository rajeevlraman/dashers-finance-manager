import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getFinancialYear } from '../js/db.js';

describe('getFinancialYear', () => {
  test('1 July starts a new financial year', () => {
    assert.equal(getFinancialYear('2026-07-01'), '2026-2027');
  });

  test('30 June is the last day of the current financial year', () => {
    assert.equal(getFinancialYear('2026-06-30'), '2025-2026');
  });

  test('a date in the middle of the FY (e.g. January) belongs to the FY that started the previous July', () => {
    assert.equal(getFinancialYear('2026-01-15'), '2025-2026');
  });

  test('a date in the middle of the FY (e.g. December) belongs to the FY that started that same July', () => {
    assert.equal(getFinancialYear('2026-12-15'), '2026-2027');
  });

  test('this is the exact bug that was previously never populated on expense save — regression guard', () => {
    // Prior to the fix, expenses.js never set this field at all, silently
    // breaking any financial-year-based filtering (getPropertyExpenseSummary,
    // tax records, etc). This just asserts the helper itself keeps working
    // as expected so a future regression there is caught immediately.
    const result = getFinancialYear(new Date('2026-07-11').toISOString());
    assert.equal(result, '2026-2027');
  });
});
