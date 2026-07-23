import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

// These hit a real running instance of the store/server logic in-process
// (not over HTTP) so they run fast and don't need a live port. They
// exercise store.js directly, which is what server.js's handlers sit on
// top of — the same withState()/persist() path that had the bug.
let store;

async function freshStore() {
  await rm(DATA_DIR, { recursive: true, force: true });
  // Re-import with a cache-busting query so each test gets an independent
  // module instance (store.js caches state in a module-level variable).
  const mod = await import(`../store.js?t=${Date.now()}_${Math.random()}`);
  return mod;
}

describe('store.js persistence', () => {
  beforeEach(async () => {
    store = await freshStore();
  });

  after(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  test('withState() only resolves after the write to disk completes (regression guard)', async () => {
    // This is the core guarantee the server.js bug fix depends on: callers
    // must be able to trust that once withState()'s promise resolves, the
    // change is durably on disk — so it's safe to only send the HTTP
    // response after that point.
    await store.withState(async (state) => {
      state.data.bills = [{ id: 'bill1', name: 'Electricity', amount: 120, updatedAt: '2026-07-12T00:00:00Z' }];
      return { status: 200, body: {} };
    });

    // Simulate "the process restarting": load state via a fresh module
    // instance (bypassing the in-memory cache) and confirm the write landed.
    const freshMod = await freshStoreWithoutWipe();
    const reloaded = await freshMod.readState();
    assert.equal(reloaded.data.bills.length, 1);
    assert.equal(reloaded.data.bills[0].name, 'Electricity');
  });

  test('concurrent withState() calls are serialized, not interleaved', async () => {
    // Fire multiple mutations concurrently; the write queue should apply
    // them one at a time rather than corrupting state via interleaved reads.
    await Promise.all([
      store.withState(async (state) => {
        state.data.bills = state.data.bills || [];
        state.data.bills.push({ id: 'a', name: 'A', updatedAt: '2026-07-12T00:00:00Z' });
        return { status: 200, body: {} };
      }),
      store.withState(async (state) => {
        state.data.bills = state.data.bills || [];
        state.data.bills.push({ id: 'b', name: 'B', updatedAt: '2026-07-12T00:00:00Z' });
        return { status: 200, body: {} };
      }),
      store.withState(async (state) => {
        state.data.bills = state.data.bills || [];
        state.data.bills.push({ id: 'c', name: 'C', updatedAt: '2026-07-12T00:00:00Z' });
        return { status: 200, body: {} };
      })
    ]);

    const state = await store.readState();
    const ids = state.data.bills.map(b => b.id).sort();
    assert.deepEqual(ids, ['a', 'b', 'c']); // all three present, none lost/duplicated
  });
});

async function freshStoreWithoutWipe() {
  const mod = await import(`../store.js?t=${Date.now()}_${Math.random()}`);
  return mod;
}
