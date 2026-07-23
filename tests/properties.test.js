import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PropertiesManager } from '../js/properties.js';

describe('calculatePropertyMetrics (equity calculation)', () => {
  // Regression test for the bug where equity was calculated as
  // currentValue - (monthlyMortgagePayment * 12 * 30), which had no real
  // relationship to the actual outstanding loan balance.
  const manager = new PropertiesManager();

  test('equity = current value minus outstanding loan balance', () => {
    const property = {
      currentValue: 800000,
      outstandingLoanBalance: 350000
    };
    const { equity } = manager.calculatePropertyMetrics(property, null, 0);
    assert.equal(equity, 450000);
  });

  test('equity never goes negative even if the loan exceeds current value', () => {
    const property = {
      currentValue: 300000,
      outstandingLoanBalance: 450000
    };
    const { equity } = manager.calculatePropertyMetrics(property, null, 0);
    assert.equal(equity, 0);
  });

  test('a property with no loan has equity equal to its full current value', () => {
    const property = {
      currentValue: 500000,
      outstandingLoanBalance: 0
    };
    const { equity } = manager.calculatePropertyMetrics(property, null, 0);
    assert.equal(equity, 500000);
  });

  test('missing outstandingLoanBalance is treated as zero, not NaN', () => {
    const property = { currentValue: 500000 };
    const { equity } = manager.calculatePropertyMetrics(property, null, 0);
    assert.equal(equity, 500000);
  });

  test('does NOT reproduce the old (buggy) monthly-payment-times-360 formula', () => {
    // Old formula: equity = currentValue - (mortgage * 12 * 30)
    // With a plausible mortgage payment this used to wipe out equity
    // entirely (clamped to 0) even on a property with substantial real
    // equity. Confirms the old formula is gone for good.
    const property = {
      currentValue: 800000,
      mortgage: 2500, // monthly repayment - should NOT be used for equity anymore
      outstandingLoanBalance: 350000
    };
    const { equity } = manager.calculatePropertyMetrics(property, null, 0);
    const oldBuggyValue = Math.max(0, 800000 - 2500 * 12 * 30);
    assert.equal(equity, 450000);
    assert.notEqual(equity, oldBuggyValue);
  });

  test('ROI is based on annual rent over purchase price', () => {
    const property = {
      purchasePrice: 400000,
      rent: 2000, // monthly
      currentValue: 450000,
      outstandingLoanBalance: 0
    };
    const { roi } = manager.calculatePropertyMetrics(property, null, 0);
    // annualRent = 24000, roi = 24000/400000*100 = 6.0
    assert.equal(roi, '6.0');
  });
});
