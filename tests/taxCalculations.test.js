import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  TAX_RATES,
  getMostRecentCompletedFYRange,
  monthsOverlapping,
  calculateCGTValues,
  getAssumedMarginalRate
} from '../js/taxCalculations.js';

describe('TAX_RATES', () => {
  test('brackets are in ascending threshold order with no gaps/overlaps', () => {
    const thresholds = TAX_RATES.individual.map(b => b.threshold);
    const sorted = [...thresholds].sort((a, b) => a - b);
    assert.deepEqual(thresholds, sorted, 'thresholds should already be sorted ascending');
  });

  test('rates strictly increase with each bracket (progressive tax)', () => {
    for (let i = 1; i < TAX_RATES.individual.length; i++) {
      assert.ok(
        TAX_RATES.individual[i].rate > TAX_RATES.individual[i - 1].rate,
        `bracket ${i} rate should exceed bracket ${i - 1}`
      );
    }
  });

  test('tax-free threshold is $18,200 at 0%', () => {
    assert.equal(TAX_RATES.individual[0].threshold, 0);
    assert.equal(TAX_RATES.individual[0].rate, 0);
    assert.equal(TAX_RATES.individual[1].threshold, 18200);
  });

  test('top marginal rate is 45%', () => {
    const top = TAX_RATES.individual[TAX_RATES.individual.length - 1];
    assert.equal(top.rate, 0.45);
  });
});

describe('getAssumedMarginalRate', () => {
  test('reads from TAX_RATES rather than a separate hardcoded number', () => {
    const rate = getAssumedMarginalRate();
    const bracket45k = TAX_RATES.individual.find(b => b.threshold === 45000);
    assert.equal(rate, bracket45k.rate);
  });
});

describe('getMostRecentCompletedFYRange', () => {
  test('early in a calendar year (e.g. March), the completed FY is two years back from the current start', () => {
    const { label, start, end } = getMostRecentCompletedFYRange(new Date('2026-03-15'));
    assert.equal(label, 'FY 2024-2025');
    assert.equal(start.getFullYear(), 2024);
    assert.equal(start.getMonth(), 6); // July, 0-indexed
    assert.equal(end.getFullYear(), 2025);
    assert.equal(end.getMonth(), 5); // June, 0-indexed
  });

  test('just after 1 July, the completed FY is the one that just ended', () => {
    const { label } = getMostRecentCompletedFYRange(new Date('2026-07-11'));
    assert.equal(label, 'FY 2025-2026');
  });

  test('just before 30 June, the completed FY is still the prior one', () => {
    const { label } = getMostRecentCompletedFYRange(new Date('2027-06-29'));
    assert.equal(label, 'FY 2025-2026');
  });
});

describe('monthsOverlapping', () => {
  const rangeStart = new Date('2025-07-01T00:00:00');
  const rangeEnd = new Date('2026-06-30T23:59:59');

  test('a property owned the whole FY returns all 12 months', () => {
    const months = monthsOverlapping(rangeStart, rangeEnd, '2020-01-01', new Date('2026-07-11'));
    assert.equal(months.length, 12);
    assert.equal(months[0], '2025-07');
    assert.equal(months[11], '2026-06');
  });

  test('a property bought partway through the FY is prorated', () => {
    // Bought 15 Jan 2026 -> should count Jan through Jun (6 months)
    const months = monthsOverlapping(rangeStart, rangeEnd, '2026-01-15', new Date('2026-07-11'));
    assert.equal(months.length, 6);
    assert.equal(months[0], '2026-01');
    assert.equal(months[5], '2026-06');
  });

  test('never counts months in the future relative to "today"', () => {
    // "Today" is partway through the FY, so only completed months so far count
    const months = monthsOverlapping(rangeStart, rangeEnd, '2020-01-01', new Date('2025-09-15'));
    assert.equal(months.length, 3); // Jul, Aug, Sep
    assert.equal(months[months.length - 1], '2025-09');
  });
});

describe('calculateCGTValues', () => {
  test('applies the 50% discount once held 12+ months', () => {
    const result = calculateCGTValues({
      purchase: 400000,
      sell: 600000,
      improve: 20000,
      costs: 10000,
      years: 2,
      taxRatePercent: 30
    });
    assert.equal(result.costBase, 430000);
    assert.equal(result.capitalGain, 170000);
    assert.equal(result.discount, 0.5);
    assert.equal(result.taxableGain, 85000);
    assert.equal(result.taxPayable, 25500);
  });

  test('applies no discount when held under 12 months', () => {
    const result = calculateCGTValues({
      purchase: 400000,
      sell: 450000,
      improve: 0,
      costs: 0,
      years: 0.5,
      taxRatePercent: 30
    });
    assert.equal(result.discount, 0);
    assert.equal(result.taxableGain, 50000);
    assert.equal(result.taxPayable, 15000);
  });

  test('applies the discount at exactly 12 months (ATO boundary)', () => {
    const result = calculateCGTValues({
      purchase: 100000,
      sell: 150000,
      improve: 0,
      costs: 0,
      years: 1,
      taxRatePercent: 30
    });
    assert.equal(result.discount, 0.5);
  });

  test('handles a capital loss (negative gain) without throwing', () => {
    const result = calculateCGTValues({
      purchase: 500000,
      sell: 450000,
      improve: 0,
      costs: 0,
      years: 3,
      taxRatePercent: 30
    });
    assert.equal(result.capitalGain, -50000);
    assert.ok(result.taxPayable < 0, 'a loss should not produce positive tax payable');
  });
});
