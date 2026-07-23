import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePaymentAmount,
  calculateAmortizationSchedule,
  calculateTotalInterest,
  calculateNextPayment
} from '../js/loanCalculations.js';

describe('calculatePaymentAmount', () => {
  test('matches a known standard mortgage payment', () => {
    // $500,000, 6% p.a., 30 years (360 months) -> standard textbook figure
    // ≈ $2,997.75/month.
    const payment = calculatePaymentAmount({
      originalAmount: 500000,
      interestRate: 6,
      termMonths: 360
    });
    assert.ok(Math.abs(payment - 2997.75) < 1, `expected ~2997.75, got ${payment}`);
  });

  test('handles a 0% interest loan as a simple division', () => {
    const payment = calculatePaymentAmount({
      originalAmount: 12000,
      interestRate: 0,
      termMonths: 12
    });
    assert.equal(payment, 1000);
  });
});

describe('calculateAmortizationSchedule', () => {
  const loan = {
    originalAmount: 100000,
    interestRate: 5,
    termMonths: 60,
    startDate: '2026-01-01',
    paymentFrequency: 'monthly'
  };

  test('produces one row per term month (until paid off)', () => {
    const schedule = calculateAmortizationSchedule(loan);
    assert.equal(schedule.length, 60);
  });

  test('balance decreases every period and never goes negative', () => {
    const schedule = calculateAmortizationSchedule(loan);
    let prevBalance = loan.originalAmount;
    for (const row of schedule) {
      assert.ok(row.balance <= prevBalance, 'balance should never increase');
      assert.ok(row.balance >= 0, 'balance should never go negative');
      prevBalance = row.balance;
    }
  });

  test('final balance is (near) zero once the term completes', () => {
    const schedule = calculateAmortizationSchedule(loan);
    const last = schedule[schedule.length - 1];
    assert.ok(last.balance < 1, `expected final balance near 0, got ${last.balance}`);
  });

  test('every payment equals principal + interest for that period', () => {
    const schedule = calculateAmortizationSchedule(loan);
    for (const row of schedule) {
      assert.ok(
        Math.abs(row.payment - (row.principal + row.interest)) < 0.01,
        `payment should equal principal+interest at period ${row.period}`
      );
    }
  });
});

describe('calculateTotalInterest', () => {
  test('total interest is positive and less than total repayments for a normal loan', () => {
    const loan = {
      originalAmount: 50000,
      interestRate: 7,
      termMonths: 36,
      startDate: '2026-01-01',
      paymentFrequency: 'monthly'
    };
    const totalInterest = calculateTotalInterest(loan);
    const totalRepaid = calculatePaymentAmount(loan) * 36;
    assert.ok(totalInterest > 0);
    assert.ok(totalInterest < totalRepaid);
  });

  test('is (near) zero for a 0% interest loan', () => {
    const loan = {
      originalAmount: 12000,
      interestRate: 0,
      termMonths: 12,
      startDate: '2026-01-01',
      paymentFrequency: 'monthly'
    };
    const totalInterest = calculateTotalInterest(loan);
    assert.ok(Math.abs(totalInterest) < 0.01);
  });
});

describe('calculateNextPayment', () => {
  test('returns the first unpaid period’s payment amount', () => {
    const loan = {
      originalAmount: 20000,
      interestRate: 4,
      termMonths: 24,
      startDate: '2026-01-01',
      paymentFrequency: 'monthly'
    };
    const next = calculateNextPayment(loan);
    const expected = calculatePaymentAmount(loan);
    assert.ok(Math.abs(next.amount - expected) < 0.01);
    assert.notEqual(next.dueDate, 'Paid off');
  });
});
