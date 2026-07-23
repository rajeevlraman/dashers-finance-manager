# Dashers Family Sync Server

A tiny local-network-only server that lets your family share and sync data
in Dashers Finance Manager — **without any internet or cloud service**.
Everything stays on your home WiFi.

## What this is (and isn't)

- ✅ Runs on a spare laptop, mini PC, Raspberry Pi, or NAS that's on and
  connected to your home WiFi.
- ✅ Zero npm installs — uses only Node.js's built-in modules.
- ✅ All data lives in one file: `data/store.json`, on that one machine.
- ✅ Family members' phones/laptops sync to it over WiFi when they open the app.
- ❌ Not internet-accessible by default — if you're away from home, syncing
  won't work unless you set up something like a VPN back into your home
  network (out of scope of this README).
- ❌ Not a substitute for backups — keep exporting encrypted backups too
  (Settings → Data Management) in case that one machine's disk fails.

## 1. Requirements

- [Node.js](https://nodejs.org) 18 or later installed on the machine that
  will act as the server (check with `node --version`).

## 2. Start the server

```bash
cd family-server
node server.js
```

You should see:

```
🏠 Family Sync Server running at http://localhost:4321
```

Leave this running. On Linux, consider `pm2`, a `systemd` service, or simply
a terminal you don't close, so it stays up.

## 3. Find the server's local IP address

Family members' devices need the server machine's IP on your home network
(not `localhost` — that only works on the server machine itself).

- **Mac/Linux**: `ipconfig getifaddr en0` (Mac) or `hostname -I` (Linux)
- **Windows**: `ipconfig` → look for "IPv4 Address" under your WiFi adapter
- **Raspberry Pi**: `hostname -I`

It'll look like `192.168.1.42` or `10.0.0.15`. The full address family
members will enter in the app is:

```
http://192.168.1.42:4321
```

(Use your actual IP — this one's just an example.)

## 4. First-run setup (creates the admin account)

The first person to connect becomes the admin. In the app:

**Settings → Family Sync → Connect to a server** → enter the address above →
you'll be prompted to create the admin username/password since no account
exists yet. The admin automatically has access to everything.

## 5. Add family members

As the admin, go to **Settings → Family Sync → Manage Family Members** and
add each person with a username, password, and which sections of the app
they're allowed to see (e.g. Bills and Calendar, but not Accounts or Loans).

Each family member then connects their own device to the same server
address and logs in with their own account.

## 6. How syncing works

- Syncing happens automatically when the app is opened (not continuously
  live) — open the app, and it pulls anything new from the server and
  pushes anything you've changed locally.
- If two people edit the exact same record while both were offline, the
  most recently saved version wins when they both sync. This is a simple
  household app, not a full multi-user database — for anything genuinely
  concurrent (two people editing the same bill at the same moment), the
  last save wins.
- A family member only ever receives data for the sections they're allowed
  to see. The server enforces this itself — it's not just hidden in the
  app's UI.

## 7. Keeping the IP address from changing

Home routers usually keep giving the same device the same IP, but not
always. If sync suddenly stops working, check the server's IP hasn't
changed and update it in each device's Settings → Family Sync if needed.
Most home routers let you reserve a fixed IP for a specific device (look for
"DHCP reservation" or "static lease" in your router's settings) — worth
doing once so this never comes up again.

## Troubleshooting

- **Can't connect**: make sure both devices are on the same WiFi network,
  and that your server machine's firewall allows incoming connections on
  the port (4321 by default).
- **"Not found" errors**: double check the address includes `http://` and
  the port number, e.g. `http://192.168.1.42:4321` (not just the IP alone).
- **Change the port**: run `PORT=5000 node server.js` instead, and use that
  port number in the app.
- **Lock down CORS to your actual app URL**: by default (no `ALLOWED_ORIGIN`
  set) this server accepts API requests from any origin, which is fine to
  get started but looser than it needs to be. Once you know the URL your
  app is served from, set it explicitly:
  `ALLOWED_ORIGIN=https://192.168.1.50 node server.js` (comma-separate
  multiple origins if needed). The server logs a reminder on startup if
  this isn't set.
- **Windows: server won't start / you have to run `net stop winnat` to fix
  it**: this is Hyper-V/WSL2/Docker's WinNAT service reserving random port
  ranges for its own internal use on every reboot. If the default port
  happens to land in one of those ranges, `listen()` fails even though
  nothing else is actually using the port. The server now automatically
  tries the next few ports if this happens, so it should still start (check
  the console output for which port it landed on). If it still fails, or you
  want it to stick to one fixed port permanently, run as Administrator once
  and reboot:
  ```
  netsh int ipv4 add excludedportrange protocol=tcp startport=4321 numberofports=1 store=persistent
  ```
  You can check what Windows currently has reserved with:
  ```
  netsh interface ipv4 show excludedportrange protocol=tcp
  ```
  `net stop winnat && net start winnat` still works as a one-off, temporary
  fix, but it typically needs redoing after every reboot.
