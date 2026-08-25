# Dashers Finance Manager — App Overview

_Version 1.0.0 · A personal & property-investor finance tracker that runs entirely
in the browser, installs as an offline-capable PWA, and optionally syncs
between family devices over your home network._

## 1. What this app actually is

A single-page web app (no build step, no framework) that stores everything
locally in the browser's IndexedDB. There is no cloud backend by default —
your data never leaves your device unless you explicitly turn on the optional
Family Sync Server (see below). It's designed to be installed to your phone's
home screen and used like a native app, including offline.

**Core idea:** one app covering both everyday budgeting *and* the
property-investor-specific stuff (rent, tenants, maintenance, loans, capital
works, CGT, ATO deduction rules) that most budgeting apps don't touch.

## 2. Tech stack

| Layer | Choice |
|---|---|
| UI | Vanilla HTML/CSS/JS — no React/Vue, no bundler |
| Storage | IndexedDB via Dexie.js (`js/db_dexie.js`, vendored, no CDN dependency) |
| Charts | Chart.js (vendored) |
| Offline | Service worker (`serviceWorker.js`) with a full precache list |
| Sync (optional) | A tiny Node.js server in `family-server/` — Node built-ins only, no npm install needed |
| Tests | Node's built-in test runner (`node --test`), covering parsers, sanitisation, backup crypto, loan math, tax math, dedup logic |

Nothing calls out to the internet at runtime. Bank statement parsing,
merchant categorisation, and tax calculations all run locally.

## 3. Feature map (by nav section)

- **Dashboard** — at-a-glance net worth / cash flow snapshot, aggregating other sections
- **Transactions** — the core ledger; bank statement import with auto-categorisation
- **Budgets** — category-based budget targets vs actuals
- **Accounts** — bank accounts / balances
- **Categories** — customisable income/expense categories, with a default ATO-aware set for property expenses
- **Reports** — spending/income breakdowns and charts
- **Bills** — recurring bill tracking
- **Calendar** — date-based view across bills/rent/loan events
- **Recurring** — recurring transaction templates + a background job to generate them
- **Loans** — loan balances, repayment schedules, interest calculations
- **Properties** — the investment property register (purchase price, current value, etc.)
- **Tenants** — tenant/lease records per property
- **Maintenance** — repairs vs capital improvements, linked to properties
- **Expenses** — property-specific expense tracking with deductibility flags
- **ATO Reports** (`tax`) — deduction tips, compliance checklist, depreciation/GST/CGT/negative-gearing calculators, rental schedule export
- **Cost Base** (`costbase`) — per-property CGT cost base ledger (acquisition + capital costs) with an estimated-tax-on-sale summary
- **Settings** — app lock (PIN), encrypted backup export/import, family sync setup

## 4. Data import pipeline

`js/import/` is a small subsystem in its own right: `parser.js` reads bank
CSV/OFX exports, `bankFormats.js` knows the quirks of specific Australian
banks, `categoryMapper.js` + `merchantCategories.js` + `merchantLogos.js`
auto-assign a category and a little brand logo per merchant,
`duplicateFinder.js` prevents re-importing the same transactions twice, and
`saver.js` commits the reviewed batch to IndexedDB. `importParser_original.js`
at the project root looks like a superseded earlier version kept around for
reference — worth deleting once you're confident the current parser covers
everything it did.

## 5. Security & privacy model (as actually implemented)

- **App Lock** (`appLock.js`) is a PIN gate on the UI only — it does **not**
  encrypt the IndexedDB data itself. It protects against someone picking up
  an unlocked device, not against someone with dev-tools access to the
  browser's storage. There's also no PIN recovery — forgetting it means
  wiping local app data. This is documented honestly in the code and in
  Settings.
- **Backup encryption** (`backupCrypto.js`) uses PBKDF2 (250,000 iterations)
  + AES-GCM via Web Crypto, so exported backup *files* are properly
  encrypted at rest. Again, no password recovery by design.
- **Family Sync Server** uses per-user sessions (bearer tokens), password
  hashing, and a section-based permission model (`family-server/permissions.js`)
  so you can give a family member access to, say, Bills and Budgets without
  exposing Properties or Cost Base data. It's designed to run on your own
  local network only — there's no internet-facing auth hardening (rate
  limiting, HTTPS, etc.), so don't expose it directly to the internet as-is.

## 6. The Family Sync Server, briefly

A separate, dependency-free Node server (`family-server/server.js`) that
your main devices can push/pull against over WiFi. It stores everything in
a single `data/store.json` file with a write-serialisation guard
(`store.js`) so concurrent requests can't corrupt it. Sync is last-write-wins
per record, keyed by `updatedAt`, with tombstones for deletions. This is
**not** a hosted service — you run it yourself on a spare PC/laptop/Pi on
your home network, and it only makes sense for a household syncing between
their own devices.

## 7. Known rough edges (current state, being honest about it)

- **Three separate copies** of the property-expense-category deductibility
  data exist (`js/expenses.js`'s live `EXPENSE_CATEGORIES`, the `db.js` seed
  data, and an unused `js/propertyExpenseCategories.js`). Only the first one
  actually drives the UI today; the other two are effectively dead code that
  could drift out of sync with it again in the future if edited separately.
- **Tax/CGT calculators are deliberately simplified.** They cover the common
  cases (standard rental deductions, basic CGT discount math, negative
  gearing) but don't model main-residence exemptions, the six-year absence
  rule, pre-CGT (pre-Sept-1985) assets, or indexation — these are flagged in
  the UI as things to check with a tax agent rather than silently ignored.
- **`css/styles.css` is hand-maintained directly, not generated.** The many
  smaller files under `css/components/`, `css/layouts/`, `css/core/`,
  `css/themes/` aren't linked from `index.html` and aren't merged into
  `styles.css` by anything — `css-cleaner.js` only dedupes repeated
  lines/blocks *within* `styles.css` itself. Those component/layout files
  look like an earlier, abandoned refactor; either wire them up properly or
  delete them, since right now editing them has zero effect on the live app
  and it's an easy trap to fall into.
- **`css/styles.css` has a lot of duplicate/conflicting selectors** from
  being edited in place many times (e.g. `.bottom-nav` and `main#mainContent`
  are each redefined 5+ times across the file). Several of these were
  actively fighting each other — e.g. a later plain `.bottom-nav` rule was
  silently overriding an earlier "FINAL unified bottom nav" rule's safe-area
  padding, which is what caused the iOS layout bug fixed this session (see
  below). Worth a proper consolidation pass at some point rather than
  continuing to patch in place.
- **Leftover dev artifacts** at the project root (`original_index.html`,
  `importParser_original.js`, `test_v9_anz.mjs`, `is_development_branch.txt`,
  a stray root-level `icon-192.png` duplicate) look safe to delete once
  you're confident the current versions have fully replaced them.
- **`<title>Budget Tracker</title>`** in `index.html` is a naming leftover
  from before the app became "Dashers Finance Manager" — cosmetic, but
  visible in browser tabs/bookmarks.
- The service worker now precaches every real module (fixed this session),
  but any brand-new file you add later needs to be added to
  `serviceWorker.js`'s `PRECACHE_URLS` list too, or it won't be available
  offline on first install.

## 8. This session's fixes, for the record

- iOS install/offline behaviour: root cause was serving over `http://` on a
  LAN IP, not HTTPS — service workers won't register there. Also fixed real
  filename typos in the precache list and expanded it to cover every module.
- Corrected the "Travel is deductible" error (wrong since 1 July 2017),
  wired up the previously-dead Depreciation and GST calculators, made the
  compliance checklist and risk assessment reflect real data instead of
  hardcoded values, and fixed the cost-base tracker's unconditional 50% CGT
  discount and its incorrect "borrowing costs add to cost base" guidance.
- Family Sync Server: added automatic fallback to the next port when
  Windows/Hyper-V's WinNAT reserves the default one, documented the
  permanent `netsh` fix, and — after an initial version of that fix
  introduced a crash bug — fixed the server so a dropped connection can
  never take the whole process down again.
- iOS layout: the bottom tab bar's safe-area padding was being silently
  overridden by a later, conflicting `.bottom-nav` rule elsewhere in the
  same stylesheet, leaving a visible gap of plain background below the nav
  icons instead of the nav's own background extending to the true bottom
  edge. The `<header>` bar (containing the hamburger button) had no CSS
  rule at all, so it rendered flush with the top-left corner behind the
  status bar/notch on notched iPhones. Both fixed; see `css/styles.css`.
