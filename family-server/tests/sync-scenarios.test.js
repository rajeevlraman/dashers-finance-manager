import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = path.join(__dirname, '..', 'server.js');
const DATA_DIR = path.join(__dirname, '..', 'data');
const PORT = 4399; // distinct from the default, so this doesn't collide with a real running instance
const BASE = `http://localhost:${PORT}`;

let serverProcess;

async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE}/api/setup/status`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Server did not start in time');
}

describe('end-to-end sync scenarios (real HTTP + real server process)', () => {
  before(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
    serverProcess = spawn('node', [SERVER_PATH], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'ignore'
    });
    await waitForServer();

    await fetch(`${BASE}/api/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'adminpass' })
    });
  });

  after(async () => {
    serverProcess.kill();
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  async function login() {
    const res = await fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'adminpass' })
    });
    const body = await res.json();
    return body.token;
  }

  test('pushing the identical record repeatedly never creates duplicates', async () => {
    const token = await login();
    const record = { id: 'dup-test-1', name: 'Electricity', amount: 120, updatedAt: '2026-07-12T00:00:00Z' };

    for (let i = 0; i < 5; i++) {
      await fetch(`${BASE}/api/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data: { bills: [record] }, tombstones: [] })
      });
    }

    const pullRes = await fetch(`${BASE}/api/sync/pull`, { headers: { Authorization: `Bearer ${token}` } });
    const pullBody = await pullRes.json();
    const matching = pullBody.data.bills.filter(b => b.id === 'dup-test-1');
    assert.equal(matching.length, 1, 'expected exactly one record, no duplicates from repeated identical pushes');
  });

  test('a deletion (tombstone) removes the record and is retrievable by other devices', async () => {
    const token = await login();
    const record = { id: 'delete-test-1', name: 'Old Gym Membership', amount: 50, updatedAt: '2026-07-12T00:00:00Z' };

    await fetch(`${BASE}/api/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ data: { bills: [record] }, tombstones: [] })
    });

    // Confirm it's actually there first
    let pullRes = await fetch(`${BASE}/api/sync/pull`, { headers: { Authorization: `Bearer ${token}` } });
    let pullBody = await pullRes.json();
    assert.ok(pullBody.data.bills.some(b => b.id === 'delete-test-1'));

    // Now delete it (push a tombstone, as a device applying a local deletion would)
    await fetch(`${BASE}/api/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        data: {},
        tombstones: [{ storeName: 'bills', recordId: 'delete-test-1', deletedAt: '2026-07-12T01:00:00Z' }]
      })
    });

    pullRes = await fetch(`${BASE}/api/sync/pull`, { headers: { Authorization: `Bearer ${token}` } });
    pullBody = await pullRes.json();
    assert.ok(!pullBody.data.bills.some(b => b.id === 'delete-test-1'), 'deleted record should be gone from data');
    assert.ok(
      pullBody.tombstones.some(t => t.storeName === 'bills' && t.recordId === 'delete-test-1'),
      'a tombstone should exist so other devices know to remove their local copy too'
    );
  });

  test('data survives the server process being killed and restarted (the exact scenario reported)', async () => {
    const token = await login();
    const record = { id: 'restart-test-1', name: 'Internet Bill', amount: 89, updatedAt: '2026-07-12T00:00:00Z' };

    const pushRes = await fetch(`${BASE}/api/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ data: { bills: [record] }, tombstones: [] })
    });
    assert.equal(pushRes.status, 200);

    // Kill and restart the server process right after the response, same
    // as flipping the power on the machine right after a sync.
    serverProcess.kill('SIGTERM');
    await new Promise(resolve => serverProcess.once('exit', resolve));

    serverProcess = spawn('node', [SERVER_PATH], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'ignore'
    });
    await waitForServer();

    const newToken = await login();
    const pullRes = await fetch(`${BASE}/api/sync/pull`, { headers: { Authorization: `Bearer ${newToken}` } });
    const pullBody = await pullRes.json();
    assert.ok(
      pullBody.data.bills.some(b => b.id === 'restart-test-1'),
      'the record pushed right before the restart should still be there after restart'
    );
  });
});
