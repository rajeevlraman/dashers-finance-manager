// ============================================================================
// 🧮 taxCalculations.js — Pure tax/CGT calculation logic
// ============================================================================
// Deliberately has ZERO dependency on window/document/DOM/IndexedDB, so it
// can be unit tested directly under Node (see tests/taxCalculations.test.js).
// tax_compliance.js imports from here for the actual numbers and only
// handles rendering/DOM.
// ============================================================================

// Tax rates and thresholds for FY2026-27 (1 July 2026 - 30 June 2027)
// Source: ATO / Treasury Laws Amendment (More Cost of Living Relief) Act 2025 —
// the 18,201-45,000 bracket dropped from 16% to 15% from 1 July 2026.
// NOTE: review these every new financial year — the ATO updates them annually,
// and this exact drift (stale brackets going unnoticed for 2+ years) is the
// bug that prompted extracting this into its own tested module.
export const TAX_RATES = {
  individual: [
    { threshold: 0, rate: 0.00 },
    { threshold: 18200, rate: 0.15 },
    { threshold: 45000, rate: 0.30 },
    { threshold: 135000, rate: 0.37 },
    { threshold: 190000, rate: 0.45 }
  ],
  corporate: 0.30,
  gst: 0.10
};

// ----------------------------------------------------------------------------
// Financial year helpers
// ----------------------------------------------------------------------------
// The most recently COMPLETED financial year is generally what you're
// reporting to the ATO on (e.g. in July 2026 you're lodging for FY2025-26,
// which just ended, not the brand-new FY2026-27 that just started).
export function getMostRecentCompletedFYRange(now = new Date()) {
  const currentFYStartYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const completedFYStartYear = currentFYStartYear - 1;
  return {
    label: `FY ${completedFYStartYear}-${completedFYStartYear + 1}`,
    start: new Date(`${completedFYStartYear}-07-01T00:00:00`),
    end: new Date(`${completedFYStartYear + 1}-06-30T23:59:59`)
  };
}

// Months (as "YYYY-MM") a rental property overlaps with a date range, used
// to prorate rent for properties bought/sold partway through the period.
// `today` is injectable for deterministic testing.
export function monthsOverlapping(rangeStart, rangeEnd, propertyCreatedAt, today = new Date()) {
  const createdAt = propertyCreatedAt ? new Date(propertyCreatedAt) : rangeStart;
  const effectiveStart = createdAt > rangeStart ? createdAt : rangeStart;
  const effectiveEnd = today < rangeEnd ? today : rangeEnd; // never count future months
  if (effectiveEnd < effectiveStart) return [];

  const months = [];
  const cursor = new Date(effectiveStart.getFullYear(), effectiveStart.getMonth(), 1);
  const endCursor = new Date(effectiveEnd.getFullYear(), effectiveEnd.getMonth(), 1);
  while (cursor <= endCursor) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

// ----------------------------------------------------------------------------
// Capital Gains Tax
// ----------------------------------------------------------------------------
// ATO rule: the 50% CGT discount applies once an asset has been held for
// more than 12 months.
export function calculateCGTValues({ purchase, sell, improve, costs, years, taxRatePercent }) {
  const costBase = purchase + improve + costs;
  const capitalGain = sell - costBase;
  const discount = years >= 1 ? 0.5 : 0;
  const taxableGain = capitalGain * (1 - discount);
  const taxPayable = taxableGain * (taxRatePercent / 100);
  return { costBase, capitalGain, discount, taxableGain, taxPayable };
}

// Assumed marginal rate used for the "quick estimate" savings figure. Reads
// from TAX_RATES rather than a separate hardcoded number, so both stay in
// sync automatically when the ATO updates rates each financial year.
export function getAssumedMarginalRate() {
  return TAX_RATES.individual.find(b => b.threshold === 45000)?.rate ?? 0.30;
}
