# Dashers Finance Manager — README

A finance tracker for everyday budgeting *and* investment property
management (rent, tenants, maintenance, loans, ATO deductions, CGT cost
base) that runs entirely in your browser and installs as an offline app on
your phone or tablet. No account, no cloud, no subscription — your data
stays on your device unless you turn on Family Sync yourself.

---

## 1. Installing it as an app

Service workers (what makes offline mode and "Add to Home Screen" actually
work) require the site to be served over **HTTPS**, or over `http://localhost`
on the same device. Opening it via your computer's local IP address (e.g.
`http://192.168.1.42:5500`) will *not* give you a real installable, offline
app — it'll just be a live browser tab pointed at your computer.

**Pick one:**

- **Recommended — deploy it once, use it forever:** upload the contents of
  this folder to a free static host with HTTPS built in — GitHub Pages,
  Netlify, Vercel, or Cloudflare Pages all work. Since it's a static site
  (no build step), this is usually a drag-and-drop or single `git push`.
- **Quick local test:** run a local server (e.g. VS Code's "Live Server"
  extension, or `npx serve`), then tunnel it through something that gives
  you an HTTPS URL (e.g. `ngrok http <port>`). Open that HTTPS URL on your
  phone/tablet once so the service worker installs, and from then on it
  works offline even without the tunnel.

Once you're on an HTTPS URL:

- **iPhone/iPad:** open it in Safari → Share icon → **Add to Home Screen**.
- **Android:** open it in Chrome → menu (⋮) → **Add to Home screen** / **Install app**.

## 2. First use

On first load the app seeds a default set of categories (including a
property-expense set that reflects current ATO deductibility rules — e.g.
travel to inspect a residential rental isn't deductible, so it's flagged as
such by default). Nothing else is pre-filled; add your accounts,
properties, and transactions as you go.

**Backups:** Settings → Export Backup gives you a password-encrypted JSON
file (AES-GCM, your password never leaves the device). Keep that password
somewhere safe — there's no recovery if you lose it, by design. Import it
back from Settings on any device to restore.

**App Lock:** Settings → App Lock adds a PIN screen when you open the app.
This is a screen lock, not encryption — it stops casual access to an
unlocked device, not someone with direct access to the browser's storage.
There's no PIN recovery either; forgetting it means wiping local app data
(your backup file is then your way back in).

## 3. Importing bank transactions

Transactions → Import accepts common Australian bank CSV/OFX exports. It
auto-detects the bank format, suggests a category and merchant per line
(with logos for common Australian merchants), flags likely duplicates
against what's already imported, and lets you review everything before
committing. Nothing is saved until you confirm.

## 4. Property investor features

- **Properties** — register each property (purchase price, current value, dates).
- **Tenants** — lease details per property.
- **Maintenance** — log repairs vs capital improvements separately; this
  distinction matters a lot for tax (repairs are usually immediately
  deductible, capital improvements are depreciated over time instead).
- **Loans** — track balances and interest.
- **ATO Reports** — deduction tips, a compliance checklist (based on your
  actual records, not a fixed checklist), depreciation/GST/CGT/negative-
  gearing calculators, and an exportable rental schedule.
- **Cost Base** — running CGT cost base per property (purchase price +
  capital costs), with an estimated tax-on-sale summary.

**Everything under ATO Reports and Cost Base is general information, not
tax advice.** The calculators cover the common cases but don't model
main-residence exemptions, the six-year rule, pre-1985 assets, or
indexation — check with a registered tax agent for anything beyond a
straightforward, fully-rented, post-1985 investment property.

## 5. Family Sync (optional)

If more than one person in your household wants to see the same data on
their own device, you can run a small local sync server yourself. It's not
a hosted service — you run it on a spare computer on your home WiFi, and it
only syncs between devices on that same network.

**Setup:**
```
cd family-server
npm install     # none needed — Node built-ins only — but harmless if you do
node server.js
```
The console will print the address to use (e.g. `http://192.168.1.42:4321`).
On first run, visiting that address creates the admin account. From
Settings → Family Sync on each device, enter that address and log in (or
have the admin add you as a family member first).

You can give each family member access to specific sections only (e.g.
Bills and Budgets, but not Properties or Cost Base) — set this up from the
admin's Settings → Family Sync → Manage Members screen.

**Keeping the server reachable:**
- Your computer's local IP can change if your router reassigns it — check
  your router's settings for a way to reserve/pin it (usually called
  "DHCP reservation" or "static lease") so the address doesn't change on you.
- **Windows only:** if the server refuses to start and you find yourself
  running `net stop winnat` to fix it, see the Troubleshooting section in
  `family-server/README.md` — there's a permanent fix (one `netsh` command,
  run once) instead of doing that every reboot.
- The server logs errors instead of crashing on a dropped connection (a
  phone briefly losing WiFi, etc.) — a flaky connection on one device won't
  take the server down for everyone else.

## 6. Updating the app

Since there's no build step, updating just means replacing the files on
whatever host you're using (or re-syncing your local folder if testing
locally). The service worker version is bumped whenever cached files change
significantly, which forces installed devices to fetch the new version
instead of serving a stale cache — if you make your own edits to any file
under `js/`, `css/`, or `assets/icons/`, bump `CACHE_VERSION` in
`serviceWorker.js` too, or installed devices may keep using the old cached
copy for a while.

## 7. Troubleshooting

- **"Add to Home Screen" doesn't create a real offline app / breaks when my
  computer is off** — you're serving over `http://` on a LAN IP, not HTTPS.
  See section 1.
- **Family Sync won't start on Windows** — see `family-server/README.md`.
- **Forgot my App Lock PIN** — no recovery path; you'll need to clear the
  app's local data (this deletes everything not restored from a backup) and
  set up App Lock again.
- **Forgot my backup password** — no recovery path; that backup file's data
  is unrecoverable by design.

---

_General information only, not financial or tax advice. This is a personal
finance tool, not a substitute for a registered tax agent or financial
adviser for anything beyond straightforward, everyday situations._
