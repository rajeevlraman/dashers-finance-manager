// ============================================================================
// 🚦 rateLimit.js — Brute-force protection for login/setup
// ============================================================================
// Simple in-memory, per-IP attempt counter. This is a household server with
// no external database, so in-memory is fine — a restart clears it, which
// is an acceptable trade-off here (the alternative, persisting attempt
// counts to disk, isn't worth the complexity for this threat model).
//
// IMPORTANT: when this server runs behind Caddy (as the deployment docs
// set up), every request arrives from Caddy itself, so req.socket.
// remoteAddress would just be 127.0.0.1 for every real client — that would
// make per-IP limiting meaningless. Caddy's reverse_proxy sets
// X-Forwarded-For to the real client IP by default, so we prefer that
// header when present and only fall back to the socket address when
// running without a proxy in front (e.g. local testing).
// ============================================================================

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000;

const attempts = new Map(); // ip -> { count, lockedUntil }

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For can be a comma-separated chain; the first entry is
    // the original client.
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

/** Returns { limited: boolean, waitSeconds?: number } without recording anything. */
export function checkRateLimit(ip) {
  const entry = attempts.get(ip);
  if (!entry) return { limited: false };
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    return { limited: true, waitSeconds: Math.ceil((entry.lockedUntil - Date.now()) / 1000) };
  }
  return { limited: false };
}

export function recordFailedAttempt(ip) {
  const entry = attempts.get(ip) || { count: 0, lockedUntil: 0 };
  entry.count++;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
    entry.count = 0; // reset so a fresh window starts after the lockout expires
  }
  attempts.set(ip, entry);
}

export function recordSuccess(ip) {
  attempts.delete(ip);
}

// Prevent unbounded growth from many distinct IPs over a long uptime —
// periodically drop entries that are neither mid-lockout nor recently active.
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of attempts.entries()) {
    if (!entry.lockedUntil || entry.lockedUntil < now) {
      attempts.delete(ip);
    }
  }
}, 10 * 60 * 1000).unref();
