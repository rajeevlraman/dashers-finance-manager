// ============================================================================
// 🏠 server.js — Family Sync Server
// ============================================================================
// Run with: node server.js
// No npm install needed — everything here is a Node.js built-in module, so
// this runs on a Raspberry Pi / spare laptop / NAS with nothing but Node
// itself installed. All data stays on your local network; nothing here ever
// calls out to the internet.
//
// See README.md in this folder for setup instructions.
//
// IMPORTANT ORDERING RULE (bug fix): every handler that changes state MUST
// finish writing to disk (withState() resolving) BEFORE the HTTP response
// is sent. An earlier version called sendJSON() from inside the withState()
// mutator itself — that ran before the disk write, so if the server process
// was killed right after a request (e.g. someone turning the machine off),
// the client had already been told "success" for a change that might never
// have made it to disk. Every handler below follows: mutate + return a
// plain {status, body} -> await withState() resolves (disk write done) ->
// only then call sendJSON().
// ============================================================================

import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { withState, readState } from './store.js';
import { hashPassword, verifyPassword, generateToken, newSessionExpiry, isSessionExpired } from './auth.js';
import { ALL_SECTIONS, storesForSections, isValidSection } from './permissions.js';
import { getClientIp, checkRateLimit, recordFailedAttempt, recordSuccess } from './rateLimit.js';

const PORT = process.env.PORT || 4321;

// ----------------------------------------------------------------------------
// CORS — restrict to your app's actual origin(s) instead of '*'.
// Set ALLOWED_ORIGIN to a comma-separated list, e.g.:
//   ALLOWED_ORIGIN=https://192.168.1.50 node server.js
// If unset, falls back to '*' (previous behavior) so existing deployments
// don't break silently — but a startup warning nudges you to configure it,
// since '*' lets any website's JS call this API if it ever obtained a token.
// ----------------------------------------------------------------------------
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function resolveCorsOrigin(req) {
  if (ALLOWED_ORIGINS.length === 0) return '*';
  const origin = req.headers['origin'];
  return origin && ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

// ----------------------------------------------------------------------------
// Small helpers
// ----------------------------------------------------------------------------
function sendJSON(res, statusCode, body) {
  const json = JSON.stringify(body);
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  // Set on the request handler before routing (see corsOrigin below) — null
  // means an Origin was present but didn't match the allowlist, so the
  // header is simply omitted and the browser blocks the cross-origin read.
  if (res.corsOrigin) {
    headers['Access-Control-Allow-Origin'] = res.corsOrigin;
  }
  res.writeHead(statusCode, headers);
  res.end(json);
}

const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10MB — generous for a full sync payload, far below anything that risks memory pressure

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let bytesReceived = 0;
    let tooLarge = false;

    req.on('data', chunk => {
      if (tooLarge) return;
      bytesReceived += chunk.length;
      if (bytesReceived > MAX_BODY_BYTES) {
        tooLarge = true;
        const err = new Error('Request body too large');
        err.statusCode = 413;
        req.destroy();
        reject(err);
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (tooLarge) return;
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function publicUser(user) {
  return { id: user.id, username: user.username, role: user.role, sections: user.sections };
}

async function getUserFromToken(state, token) {
  if (!token) return null;
  const session = state.sessions.find(s => s.token === token);
  if (!session) return null;
  if (isSessionExpired(session)) return null;
  return state.users.find(u => u.id === session.userId) || null;
}

function getBearerToken(req) {
  const header = req.headers['authorization'] || '';
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

function requireUserSync(state, token) {
  // Synchronous-style helper used inside mutators (state is already loaded).
  if (!token) return { error: { status: 401, body: { error: 'Not logged in or session expired.' } } };
  const session = state.sessions.find(s => s.token === token);
  if (!session || isSessionExpired(session)) {
    return { error: { status: 401, body: { error: 'Not logged in or session expired.' } } };
  }
  const user = state.users.find(u => u.id === session.userId);
  if (!user) return { error: { status: 401, body: { error: 'Not logged in or session expired.' } } };
  return { user };
}

// ----------------------------------------------------------------------------
// Route handlers — each returns { status, body } from inside withState(),
// and the response is only sent after that promise resolves (disk write done).
// ----------------------------------------------------------------------------

async function handleSetup(req, res, body) {
  const ip = getClientIp(req);
  const { limited, waitSeconds } = checkRateLimit(ip);
  if (limited) {
    return sendJSON(res, 429, { error: `Too many attempts. Try again in ${waitSeconds}s.` });
  }

  const result = await withState(async (state) => {
    if (state.users.length > 0) {
      return { status: 403, body: { error: 'Setup already completed. An admin account already exists.' } };
    }
    const { username, password } = body;
    if (!username || !password || password.length < 8) {
      return { status: 400, body: { error: 'Username and a password (8+ characters) are required.' } };
    }
    const { salt, hash } = await hashPassword(password);
    const user = {
      id: randomUUID(),
      username,
      passwordSalt: salt,
      passwordHash: hash,
      role: 'admin',
      sections: ['*'],
      createdAt: new Date().toISOString()
    };
    state.users.push(user);
    return { status: 200, body: { user: publicUser(user) } };
  });
  if (result.status !== 200) recordFailedAttempt(ip); else recordSuccess(ip);
  sendJSON(res, result.status, result.body);
}

async function handleLogin(req, res, body) {
  const ip = getClientIp(req);
  const { limited, waitSeconds } = checkRateLimit(ip);
  if (limited) {
    return sendJSON(res, 429, { error: `Too many attempts. Try again in ${waitSeconds}s.` });
  }

  const result = await withState(async (state) => {
    const { username, password } = body;
    const user = state.users.find(u => u.username === username);
    if (!user) {
      return { status: 401, body: { error: 'Invalid username or password.' } };
    }
    const ok = await verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!ok) {
      return { status: 401, body: { error: 'Invalid username or password.' } };
    }
    const token = generateToken();
    state.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString(), expiresAt: newSessionExpiry() });
    return { status: 200, body: { token, user: publicUser(user) } };
  });
  if (result.status !== 200) recordFailedAttempt(ip); else recordSuccess(ip);
  sendJSON(res, result.status, result.body);
}

async function handleLogout(req, res, token) {
  const result = await withState(async (state) => {
    state.sessions = state.sessions.filter(s => s.token !== token);
    return { status: 200, body: { ok: true } };
  });
  sendJSON(res, result.status, result.body);
}

async function handleMe(req, res) {
  const state = await readState();
  const { user, error } = requireUserSync(state, getBearerToken(req));
  if (error) return sendJSON(res, error.status, error.body);
  sendJSON(res, 200, { user: publicUser(user) });
}

async function handleListUsers(req, res) {
  const state = await readState();
  const { user, error } = requireUserSync(state, getBearerToken(req));
  if (error) return sendJSON(res, error.status, error.body);
  if (user.role !== 'admin') {
    return sendJSON(res, 403, { error: 'Admin access required.' });
  }
  sendJSON(res, 200, { users: state.users.map(publicUser), allSections: ALL_SECTIONS });
}

async function handleCreateUser(req, res, body) {
  const token = getBearerToken(req);
  const result = await withState(async (state) => {
    const { user: requester, error } = requireUserSync(state, token);
    if (error) return error;
    if (requester.role !== 'admin') {
      return { status: 403, body: { error: 'Admin access required.' } };
    }
    const { username, password, sections } = body;
    if (!username || !password || password.length < 8) {
      return { status: 400, body: { error: 'Username and a password (8+ characters) are required.' } };
    }
    if (state.users.some(u => u.username === username)) {
      return { status: 409, body: { error: 'That username is already taken.' } };
    }
    const cleanSections = Array.isArray(sections) ? sections.filter(isValidSection) : [];
    const { salt, hash } = await hashPassword(password);
    const newUser = {
      id: randomUUID(),
      username,
      passwordSalt: salt,
      passwordHash: hash,
      role: 'member',
      sections: cleanSections,
      createdAt: new Date().toISOString()
    };
    state.users.push(newUser);
    return { status: 200, body: { user: publicUser(newUser) } };
  });
  sendJSON(res, result.status, result.body);
}

async function handleUpdateUser(req, res, body, userId) {
  const token = getBearerToken(req);
  const result = await withState(async (state) => {
    const { user: requester, error } = requireUserSync(state, token);
    if (error) return error;
    if (requester.role !== 'admin') {
      return { status: 403, body: { error: 'Admin access required.' } };
    }
    const target = state.users.find(u => u.id === userId);
    if (!target) {
      return { status: 404, body: { error: 'User not found.' } };
    }
    if (target.role === 'admin' && body.sections) {
      return { status: 400, body: { error: "The admin account always has full access — its sections can't be changed." } };
    }
    if (Array.isArray(body.sections)) {
      target.sections = body.sections.filter(isValidSection);
    }
    if (body.password) {
      if (body.password.length < 8) {
        return { status: 400, body: { error: 'Password must be at least 8 characters.' } };
      }
      const { salt, hash } = await hashPassword(body.password);
      target.passwordSalt = salt;
      target.passwordHash = hash;
    }
    return { status: 200, body: { user: publicUser(target) } };
  });
  sendJSON(res, result.status, result.body);
}

async function handleDeleteUser(req, res, userId) {
  const token = getBearerToken(req);
  const result = await withState(async (state) => {
    const { user: requester, error } = requireUserSync(state, token);
    if (error) return error;
    if (requester.role !== 'admin') {
      return { status: 403, body: { error: 'Admin access required.' } };
    }
    const target = state.users.find(u => u.id === userId);
    if (!target) {
      return { status: 404, body: { error: 'User not found.' } };
    }
    if (target.role === 'admin') {
      return { status: 400, body: { error: 'Cannot delete the admin account.' } };
    }
    state.users = state.users.filter(u => u.id !== userId);
    state.sessions = state.sessions.filter(s => s.userId !== userId);
    return { status: 200, body: { ok: true } };
  });
  sendJSON(res, result.status, result.body);
}

async function handleSyncPull(req, res, query) {
  const state = await readState();
  const { user, error } = requireUserSync(state, getBearerToken(req));
  if (error) return sendJSON(res, error.status, error.body);

  const since = query.get('since') || null;
  const permittedStores = storesForSections(user.sections);

  const data = {};
  for (const storeName of permittedStores) {
    const records = state.data[storeName] || [];
    data[storeName] = since ? records.filter(r => (r.updatedAt || '') > since) : records;
  }

  const tombstones = state.tombstones.filter(t =>
    permittedStores.includes(t.storeName) && (!since || t.deletedAt > since)
  );

  sendJSON(res, 200, {
    data,
    tombstones,
    serverTime: new Date().toISOString(),
    sections: user.sections
  });
}

async function handleSyncPush(req, res, body) {
  const token = getBearerToken(req);
  const result = await withState(async (state) => {
    const { user, error } = requireUserSync(state, token);
    if (error) return error;

    const permittedStores = storesForSections(user.sections);
    const incomingData = body.data || {};
    const incomingTombstones = body.tombstones || [];
    let applied = 0;
    let rejectedStores = [];

    for (const [storeName, records] of Object.entries(incomingData)) {
      if (!permittedStores.includes(storeName)) {
        rejectedStores.push(storeName);
        continue;
      }
      if (!Array.isArray(records)) continue;
      state.data[storeName] = state.data[storeName] || [];
      for (const record of records) {
        if (!record || !record.id) continue;
        const existingIndex = state.data[storeName].findIndex(r => r.id === record.id);
        const existing = existingIndex >= 0 ? state.data[storeName][existingIndex] : null;
        const incomingIsNewer = !existing || !existing.updatedAt || !record.updatedAt || record.updatedAt >= existing.updatedAt;
        if (incomingIsNewer) {
          if (existingIndex >= 0) {
            state.data[storeName][existingIndex] = record;
          } else {
            state.data[storeName].push(record);
          }
          applied++;
        }
      }
    }

    for (const tombstone of incomingTombstones) {
      if (!tombstone || !permittedStores.includes(tombstone.storeName)) continue;
      const alreadyExists = state.tombstones.some(
        t => t.storeName === tombstone.storeName && t.recordId === tombstone.recordId
      );
      if (!alreadyExists) {
        state.tombstones.push(tombstone);
      }
      state.data[tombstone.storeName] = (state.data[tombstone.storeName] || [])
        .filter(r => r.id !== tombstone.recordId);
    }

    return {
      status: 200,
      body: {
        applied,
        rejectedStores: rejectedStores.length ? [...new Set(rejectedStores)] : undefined,
        serverTime: new Date().toISOString()
      }
    };
  });
  sendJSON(res, result.status, result.body);
}

// ----------------------------------------------------------------------------
// Router
// ----------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  res.corsOrigin = resolveCorsOrigin(req);

  if (req.method === 'OPTIONS') {
    sendJSON(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    if (req.method === 'POST' && pathname === '/api/setup') {
      return await handleSetup(req, res, await readBody(req));
    }
    if (req.method === 'GET' && pathname === '/api/setup/status') {
      const state = await readState();
      return sendJSON(res, 200, { needsSetup: state.users.length === 0 });
    }
    if (req.method === 'POST' && pathname === '/api/login') {
      return await handleLogin(req, res, await readBody(req));
    }
    if (req.method === 'POST' && pathname === '/api/logout') {
      return await handleLogout(req, res, getBearerToken(req));
    }
    if (req.method === 'GET' && pathname === '/api/me') {
      return await handleMe(req, res);
    }
    if (req.method === 'GET' && pathname === '/api/users') {
      return await handleListUsers(req, res);
    }
    if (req.method === 'POST' && pathname === '/api/users') {
      return await handleCreateUser(req, res, await readBody(req));
    }
    const userIdMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
    if (userIdMatch && req.method === 'PUT') {
      return await handleUpdateUser(req, res, await readBody(req), userIdMatch[1]);
    }
    if (userIdMatch && req.method === 'DELETE') {
      return await handleDeleteUser(req, res, userIdMatch[1]);
    }
    if (req.method === 'GET' && pathname === '/api/sync/pull') {
      return await handleSyncPull(req, res, url.searchParams);
    }
    if (req.method === 'POST' && pathname === '/api/sync/push') {
      return await handleSyncPush(req, res, await readBody(req));
    }

    sendJSON(res, 404, { error: 'Not found' });
  } catch (err) {
    if (err.statusCode === 413) {
      sendJSON(res, 413, { error: 'Request body too large.' });
      return;
    }
    console.error('Request error:', err);
    sendJSON(res, 500, { error: err.message || 'Internal server error' });
  }
});

// Graceful shutdown: stop accepting new connections and let in-flight
// requests (including pending disk writes) finish before exiting, instead
// of dying mid-write on Ctrl+C or a service manager's stop signal.
function gracefulShutdown() {
  console.log('\n🛑 Shutting down — finishing any in-flight writes first...');
  server.close(() => process.exit(0));
  // Safety net in case something hangs
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// On Windows, Hyper-V/WSL2/Docker's virtual switch (WinNAT/HNS) periodically
// reserves random chunks of the port range for its own internal NAT use.
// If our PORT happens to land inside one of those reserved ranges, listen()
// fails with EADDRINUSE even though nothing is actually using the port -
// `net stop winnat && net start winnat` "fixes" it by forcing Windows to
// pick a new random range, but that's temporary and comes back after every
// reboot. Rather than requiring that dance every time, we fall back to
// trying nearby ports automatically, and if we still can't bind, we print
// the actual permanent fix instead of a bare crash.
const MAX_PORT_ATTEMPTS = 10;

function startServer(port, attemptsLeft = MAX_PORT_ATTEMPTS) {
  function onListening() {
    console.log(`\n🏠 Family Sync Server running at http://localhost:${port}`);
    if (port !== PORT) {
      console.log(`   (Note: port ${PORT} was unavailable, so ${port} was used instead.)`);
    }
    console.log(`   Find your machine's local IP (e.g. 192.168.1.x) so other`);
    console.log(`   family devices on the same WiFi can reach it.\n`);
    if (ALLOWED_ORIGINS.length === 0) {
      console.log(`⚠️  ALLOWED_ORIGIN isn't set — CORS is wide open ('*'), meaning any`);
      console.log(`   website's JavaScript could call this API if it ever got hold of a`);
      console.log(`   token. Set it to your app's actual URL, e.g.:`);
      console.log(`     ALLOWED_ORIGIN=https://192.168.1.50 node server.js\n`);
    }
    // We're up. Stop treating errors as "couldn't bind at startup" - hand
    // off to the permanent, non-fatal handler below instead.
    server.removeListener('error', onStartupError);
  }

  function onStartupError(err) {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.warn(`⚠️  Port ${port} is unavailable, trying ${port + 1}...`);
      server.removeListener('listening', onListening);
      setTimeout(() => startServer(port + 1, attemptsLeft - 1), 100);
      return;
    }

    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Couldn't find a free port after trying ${PORT}-${PORT + MAX_PORT_ATTEMPTS}.`);
      console.error(`   On Windows this is usually Hyper-V/WSL2/Docker's WinNAT service`);
      console.error(`   reserving that port range for itself, not another program.`);
      console.error(`   Quick fix (until next reboot): run as Administrator —`);
      console.error(`     net stop winnat && net start winnat`);
      console.error(`   Permanent fix (run once as Administrator, then reboot):`);
      console.error(`     netsh int ipv4 add excludedportrange protocol=tcp startport=${PORT} numberofports=1 store=persistent`);
      console.error(`   You can check current reservations with:`);
      console.error(`     netsh interface ipv4 show excludedportrange protocol=tcp\n`);
      process.exit(1);
    }

    // Any other startup error we don't specifically recognise - don't
    // silently swallow it, but don't crash blindly either.
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }

  server.on('listening', onListening);
  server.on('error', onStartupError);
  server.listen(port);
}

// Once the server is up, a dropped WiFi connection, a client closing a
// request mid-flight, or any other transient socket hiccup can still emit
// an 'error' event on the server - that's normal and expected on a home
// network with phones/tablets moving in and out of range. Log it and keep
// serving everyone else, rather than taking the whole server down over one
// flaky connection.
server.on('error', (err) => {
  console.error('⚠️  Server error (non-fatal, still running):', err.message || err);
});

// Last-resort safety net: log unexpected errors instead of letting an
// uncaught exception silently kill the process and lock everyone out.
process.on('uncaughtException', (err) => {
  console.error('⚠️  Unexpected error (server is still trying to keep running):', err);
});
process.on('unhandledRejection', (err) => {
  console.error('⚠️  Unexpected error (server is still trying to keep running):', err);
});

startServer(PORT);
