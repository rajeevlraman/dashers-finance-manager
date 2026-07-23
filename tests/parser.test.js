import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  splitCSVLine,
  extractMerchant,
  parseNAB,
  parseNABGeneric,
  parseGenericText,
  parseMacquarie,
  parseDate
} from '../js/import/parser.js';

describe('splitCSVLine', () => {
  test('splits a simple unquoted line', () => {
    assert.deepEqual(splitCSVLine('2026-01-15,Woolworths,-85.32'), ['2026-01-15', 'Woolworths', '-85.32']);
  });

  test('does NOT split on a comma inside quotes (the bug this fixes)', () => {
    const result = splitCSVLine('2026-01-15,"Woolworths, Melbourne",-85.32');
    assert.deepEqual(result, ['2026-01-15', 'Woolworths, Melbourne', '-85.32']);
  });

  test('handles an escaped double-quote inside a quoted field', () => {
    const result = splitCSVLine('2026-01-15,"Bob\'s ""Best"" Store",-10.00');
    assert.deepEqual(result, ['2026-01-15', 'Bob\'s "Best" Store', '-10.00']);
  });

  test('handles multiple quoted fields with commas in the same row', () => {
    const result = splitCSVLine('"Smith, John","123 Main St, Unit 4",100.00');
    assert.deepEqual(result, ['Smith, John', '123 Main St, Unit 4', '100.00']);
  });

  test('trims whitespace around unquoted fields', () => {
    const result = splitCSVLine('  2026-01-15 , Woolworths , -85.32 ');
    assert.deepEqual(result, ['2026-01-15', 'Woolworths', '-85.32']);
  });
});

describe('extractMerchant (regression: no longer captures transaction-type noise)', () => {
  test('strips "EFTPOS PURCHASE" style prefixes and reference numbers to find the real merchant', () => {
    // Note: suburb/city names like "melbourne" aren't stripped (that would
    // need a hardcoded gazetteer of AU place names), but the reference
    // number "1234" is correctly removed even though it's not at the very
    // end of the string — "woolworths melbourne" is still a huge
    // improvement over the old "eftpos purchase visa".
    assert.equal(extractMerchant('EFTPOS PURCHASE VISA DEBIT WOOLWORTHS 1234 MELBOURNE'), 'woolworths melbourne');
  });

  test('strips trailing reference numbers and state codes', () => {
    assert.equal(extractMerchant('KFC AUST 4021 VIC'), 'kfc');
  });

  test('strips "DIRECT DEBIT" prefix', () => {
    assert.equal(extractMerchant('DIRECT DEBIT ORIGIN ENERGY'), 'origin energy');
  });

  test('keeps multi-word merchant names intact (not truncated to 3 words anymore)', () => {
    assert.equal(extractMerchant('CHEMIST WAREHOUSE 456 NSW'), 'chemist warehouse');
    assert.equal(extractMerchant('GUZMAN Y GOMEZ CHADSTONE'), 'guzman y gomez chadstone');
  });

  test('falls back gracefully when the whole line is noise', () => {
    const result = extractMerchant('DIRECT DEBIT 12345');
    assert.ok(result.length > 0); // should not return an empty string
  });

  test('handles an empty description without throwing', () => {
    assert.equal(extractMerchant(''), '');
    assert.equal(extractMerchant(undefined), '');
  });
});

// Note: parseANZ tests against the REAL ANZ format (no header row, 3
// columns: date, signed amount, description — verified against an actual
// exported sample) live in tests/realBankSamples.test.js. An earlier
// version of this file tested against an assumed 4-column
// Date/Description/Debit/Credit layout that turned out not to match any
// real ANZ export at all.

describe('parseGenericText (negative amount capture)', () => {
  test('a positive amount is parsed as income', () => {
    const txs = parseGenericText(['17/01/2026 Salary 2500.00']);
    assert.equal(txs[0].amount, 2500);
    assert.equal(txs[0].type, 'income');
  });

  test('regression: a negative amount is now correctly parsed as an expense (previously always came out positive/income)', () => {
    const txs = parseGenericText(['17/01/2026 Woolworths -85.32']);
    assert.equal(txs[0].amount, -85.32);
    assert.equal(txs[0].type, 'expense');
  });
});

describe('parseNABGeneric (previously undefined - would have crashed if selected)', () => {
  test('parses a simple date,description,amount row without throwing', () => {
    const txs = parseNABGeneric(['Date,Description,Amount', '15/01/2026,Woolworths,-85.32']);
    assert.equal(txs.length, 1);
    assert.equal(txs[0].amount, -85.32);
  });
});

describe('parseNAB', () => {
  test('parses a realistic NAB-style row', () => {
    const header = 'Date,Amount,Blank,Blank,Blank,Details,Blank,BankCategory,Merchant';
    const row = '15/01/2026,-85.32,,,,EFTPOS WOOLWORTHS,,Groceries,Woolworths';
    const txs = parseNAB([header, row]);
    assert.equal(txs.length, 1);
    assert.equal(txs[0].amount, -85.32);
    assert.equal(txs[0].bankCategory, 'Groceries');
  });

  test('a quoted merchant field containing a comma does not corrupt column alignment (CSV bug fix)', () => {
    const header = 'Date,Amount,Blank,Blank,Blank,Details,Blank,BankCategory,Merchant';
    const row = '15/01/2026,-20.00,,,,"EFTPOS SMITH, JOHN",,Shopping,"Smith, John Pty Ltd"';
    const txs = parseNAB([header, row]);
    assert.equal(txs.length, 1);
    assert.equal(txs[0].amount, -20.00);
    assert.equal(txs[0].bankCategory, 'Shopping');
  });
});

describe('parseMacquarie', () => {
  test('parses a realistic Macquarie credit card row', () => {
    const header = 'Transaction Date,Details,Blank,Category,Blank,Blank,Blank,Debit,Credit,Blank';
    const row = '15/01/2026,Woolworths Melbourne,,Groceries,,,,85.32,,';
    const txs = parseMacquarie([header, row]);
    assert.equal(txs.length, 1);
    assert.equal(txs[0].amount, -85.32);
    assert.equal(txs[0].bankCategory, 'Groceries');
  });
});

describe('parseDate (unchanged behavior sanity check)', () => {
  test('parses DD/MM/YYYY', () => {
    assert.equal(parseDate('15/01/2026'), '2026-01-15');
  });

  test('parses ISO YYYY-MM-DD', () => {
    assert.equal(parseDate('2026-01-15'), '2026-01-15');
  });

  test('returns null for unparseable input', () => {
    assert.equal(parseDate('not a date'), null);
  });
});
