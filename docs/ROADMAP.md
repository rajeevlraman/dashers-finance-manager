# Future Upgrade Tips / Roadmap

Rough priority order — quick housekeeping first, then bigger features.

## Quick wins (low effort, worth doing soon)

- **Delete the dead weight:** `original_index.html`, `importParser_original.js`,
  `test_v9_anz.mjs`, `is_development_branch.txt`, the duplicate root-level
  `icon-192.png`, and the unused `js/propertyExpenseCategories.js` (superseded
  by `expenses.js`'s `EXPENSE_CATEGORIES`). Removing these also removes the
  risk of someone editing the wrong copy later and reintroducing a bug that's
  already been fixed elsewhere.
- **Fix `<title>Budget Tracker</title>`** in `index.html` to match the app's
  actual name — shows up in browser tabs, bookmarks, and the iOS home screen
  label if `apple-mobile-web-app-title` isn't separately set.
- **Consolidate the category-deductibility data** into one source of truth
  (probably `js/expenses.js`'s map, since that's the one actually driving the
  UI) so a future ATO rule change only needs updating in one place.
- **Add a DHCP reservation note or a small "check server address" helper** to
  the Family Sync setup flow, since a changed local IP is a common reason
  sync silently stops working.

## Medium effort, real value

- **Depreciation schedule import.** If you ever get a professional quantity
  surveyor's report, being able to import its per-asset effective-life table
  (rather than the rough flat-rate estimate the built-in calculator uses)
  would make the depreciation numbers materially more accurate.
- **Per-transaction deductibility override.** Right now deductibility is set
  at the category level; a rare case (e.g. travel that genuinely is
  deductible because it's a commercial property) currently has no way to be
  marked as an exception without changing the whole category's default.
- **Receipt/document attachments per transaction or maintenance record** —
  currently there's no attachment field, so the record-keeping compliance
  checklist can only tell you a matching *transaction* exists, not that
  you've actually got the receipt to back it up.
- **A "sold" state for properties** that locks in the final CGT calculation
  (sale price, sale costs, discount eligibility, taxable gain) as a
  permanent record, rather than the cost base tracker's live/current-value
  estimate.
- **Automatic yearly tax-bracket review reminder.** The 2026-27 brackets are
  correct today, but they'll need re-checking (and likely updating) at each
  federal budget — a simple "last verified: <date>" note plus an in-app
  reminder around each May budget would prevent this quietly going stale.

## Bigger features, worth planning properly

- **Multi-currency support**, if this ever needs to handle an overseas
  property or account.
- **True PDF report generation** for the ATO Reports section, instead of the
  current JSON export — genuinely useful working papers to hand to an
  accountant, formatted rather than raw data.
- **Optional end-to-end encryption for Family Sync**, if you ever want to
  run the sync server somewhere other than a fully trusted home network
  (e.g. a small cloud VM instead of a spare PC) — right now it's built and
  documented as local-network-only, with no internet-facing hardening.
- **Multi-property portfolio-level reporting** (aggregate cash flow, LVR,
  total depreciation across the whole portfolio) — most of the current
  reports work per-property or as a flat aggregate; a proper portfolio view
  sits in between.
- **Legislation-change tracking for the 1 July 2027 negative-gearing
  change.** It's currently just a static note in the calculator; if the
  legislation passes, the negative-gearing calculator will need actual logic
  changes (new builds vs established property) rather than a warning label.

## Testing

There's already decent coverage (`tests/`) for parsing, sanitisation, backup
crypto, loan math, and tax math — worth extending that same pattern to the
newer ATO Reports calculators (depreciation, GST, CGT, negative gearing) and
to the family-server sync/permission logic, since those are exactly the
kind of numeric/business-rule code where a silent regression is easy to
miss just by looking at the UI.
