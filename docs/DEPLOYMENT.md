# Deployment: Proxmox LXC + local HTTPS (no domain)

This covers running the app from your Proxmox LXC container over HTTPS on
your home network, with no domain name and no internet exposure — using a
private local Certificate Authority (via `mkcert`) that you install once on
your iPhone.

**Why this approach:** iOS only treats a site as installable/offline-capable
("Add to Home Screen" as a real PWA, not just a bookmark) if it's served
over HTTPS from a certificate the device actually trusts. Since you're not
using a public domain, a real Let's Encrypt certificate isn't an option —
`mkcert` solves this by creating your own private CA, issuing a cert from
it for your server's LAN IP, and letting you tell your iPhone "trust this
CA" exactly once. After that, your LXC's IP looks like a fully valid HTTPS
site to Safari, with no warnings.

Give the LXC a **static/reserved IP** in your router or Proxmox network
config before starting (DHCP reservation) — the certificate is issued for
a specific IP, so if that IP changes later you'd need to reissue it.

---

## 1. Run the app itself (Node)

The zip includes `serve.js`, a small dependency-free static file server, and
a `start` script.

```bash
# inside the LXC, wherever you've unzipped the project
npm start          # or: node serve.js
```

By default it listens on `0.0.0.0:8080`. Once Caddy (below) is fronting it
for HTTPS, tighten this so it's only reachable from inside the container:

```bash
HOST=127.0.0.1 PORT=8080 node serve.js
```

**Keep it running after you log out / on reboot** — set it up as a systemd
service:

```bash
sudo tee /etc/systemd/system/dashers-app.service > /dev/null << 'EOF'
[Unit]
Description=Dashers Finance Manager static server
After=network.target

[Service]
ExecStart=/usr/bin/node /opt/dashers-finance-manager/serve.js
WorkingDirectory=/opt/dashers-finance-manager
Environment=PORT=8080
Environment=HOST=127.0.0.1
Restart=always
User=nobody

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now dashers-app
```

(Adjust `WorkingDirectory`/`ExecStart` to wherever you actually unzip the
project - `/opt/dashers-finance-manager` is just a suggestion. Copy the
whole unzipped folder there first: `sudo mkdir -p /opt/dashers-finance-manager`.)

## 2. Create your own local Certificate Authority (`mkcert`)

```bash
sudo apt update
sudo apt install -y mkcert libnss3-tools
# if `mkcert` isn't in your distro's repo, grab the binary instead:
#   curl -L -o mkcert https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-v1.4.4-linux-amd64
#   chmod +x mkcert && sudo mv mkcert /usr/local/bin/
# (check the releases page for the current version number)

mkcert -install
```

Now generate a certificate for your LXC's actual LAN IP (replace
`192.168.1.50` with the real one throughout this guide):

```bash
mkdir -p ~/certs && cd ~/certs
mkcert 192.168.1.50
```

This creates `192.168.1.50.pem` (certificate) and `192.168.1.50-key.pem`
(private key) in that folder.

Find where the CA's root certificate lives (you'll need this next):

```bash
mkcert -CAROOT
# e.g. /root/.local/share/mkcert
```

## 3. Trust that CA on your iPhone

The CA needs to reach your iPhone once. Easiest way from inside the LXC:

```bash
cd "$(mkcert -CAROOT)"
python3 -m http.server 8000
```

On the iPhone (same WiFi), open Safari and go to
`http://192.168.1.50:8000/rootCA.pem`. iOS will offer to download a
configuration profile — allow it, then:

1. **Settings → General → VPN & Device Management** → tap the downloaded
   profile → **Install** (enter your passcode).
2. **This step is easy to miss and required:** **Settings → General →
   About → Certificate Trust Settings** → toggle full trust **on** for the
   mkcert certificate.

Without step 2, Safari will still flag the site as untrusted even though
the profile shows as "installed." Once both steps are done, stop the
`python3 -m http.server` (Ctrl+C) — you don't need it running long-term.

## 4. Install Caddy and point it at the app with your cert

Caddy will terminate HTTPS on port 443 using your `mkcert` certificate and
forward plain HTTP to the Node server from step 1.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

Edit `/etc/caddy/Caddyfile`:

```
192.168.1.50 {
  tls /root/certs/192.168.1.50.pem /root/certs/192.168.1.50-key.pem
  reverse_proxy 127.0.0.1:8080
}
```

The plain `tls <cert> <key>` directive tells Caddy to use your provided
certificate directly instead of trying to fetch one from Let's Encrypt
(which needs a real domain and internet reachability - neither applies
here).

```bash
sudo systemctl restart caddy
```

## 5. Install on your iPhone

Open Safari and go to `https://192.168.1.50` — you should see a normal
padlock, no warnings. Then **Share → Add to Home Screen**. Since it's now
genuinely HTTPS and trusted, the service worker will register properly and
the installed app will work offline, independent of the LXC being on.

## Optional: put Family Sync behind the same setup

If you also want the Family Sync Server (port 4321) reachable over HTTPS
from other devices, add a second block to the same Caddyfile:

```
192.168.1.50:8443 {
  tls /root/certs/192.168.1.50.pem /root/certs/192.168.1.50-key.pem
  reverse_proxy 127.0.0.1:4321
}
```

Then point the app's Family Sync settings at `https://192.168.1.50:8443`
instead of the old `http://...:4321` address. Run `family-server/server.js`
the same way as step 1 (systemd service, `HOST=127.0.0.1` so it's not
directly reachable, only through Caddy) — and set `ALLOWED_ORIGIN` to your
app's URL from step 5 (`ALLOWED_ORIGIN=https://192.168.1.50`) so the sync
API only accepts requests from your actual app, not any site.

## Troubleshooting

- **Still shows "Not Secure" on iPhone** — you likely missed step 3.2
  (Certificate Trust Settings toggle). Installing the profile alone isn't
  enough.
- **Cert stops working after a while** — `mkcert` certs are valid ~2 years
  by default; regenerate with the same `mkcert 192.168.1.50` command and
  restart Caddy when it expires.
- **LXC's IP changed** — reissue the cert for the new IP (step 2) and
  update the Caddyfile, or better, fix the IP with a DHCP reservation so
  this doesn't happen again.
- **Want a real domain later instead** — if you ever register a domain,
  Caddy can get you a real trusted Let's Encrypt certificate automatically
  (no `mkcert`/manual trust needed) via a DNS-01 challenge, without opening
  any ports to the internet — worth revisiting if you go that route.
