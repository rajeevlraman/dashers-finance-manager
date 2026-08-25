// ============================================================================
// 💾 store.js — JSON file-backed data store
// ============================================================================
// Deliberately not a real database — this app is meant to be trivial to run
// on a spare laptop/Raspberry Pi/NAS with nothing but `node server.js`. All
// family data + accounts + sessions live in one JSON file on disk. Writes
// are serialized through an in-process queue (Node is single-threaded, so
// this alone is enough to prevent the file from getting corrupted by
// overlapping writes — it does NOT protect against multiple server
// processes writing the same file, which this app never does).
// ============================================================================

import { readFile, writeFile, mkdir, rename, chmod } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const EMPTY_STATE = {
  users: [],
  sessions: [],
  data: {},      // storeName -> array of records
  tombstones: [] // { storeName, recordId, deletedAt }
};

let writeQueue = Promise.resolve();
let cachedState = null;

async function ensureDataFile() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
  }
  if (!existsSync(DATA_FILE)) {
    await writeFile(DATA_FILE, JSON.stringify(EMPTY_STATE, null, 2), { mode: 0o600 });
  }
  // Belt-and-suspenders: enforce owner-only permissions on every startup,
  // in case the directory/file already existed from before this was added,
  // or something (a backup tool, an editor) loosened them since. This file
  // holds real financial data plus password hashes and session tokens, so
  // it shouldn't be world- or group-readable regardless of the OS's
  // default umask.
  try {
    await chmod(DATA_DIR, 0o700);
    await chmod(DATA_FILE, 0o600);
  } catch {
    // Non-fatal — some filesystems (e.g. certain network shares, or
    // Windows) don't support Unix permission bits. Not worth crashing over.
  }
}

async function loadState() {
  if (cachedState) return cachedState;
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, 'utf-8');
  cachedState = { ...EMPTY_STATE, ...JSON.parse(raw) };
  return cachedState;
}

async function persist(state) {
  // Write to a temp file then rename, so a crash mid-write can't leave a
  // half-written (corrupted) store.json behind.
  const tmpFile = `${DATA_FILE}.tmp`;
  await writeFile(tmpFile, JSON.stringify(state, null, 2), { mode: 0o600 });
  await rename(tmpFile, DATA_FILE);
}

/**
 * Runs `mutator` with the current state and persists whatever it returns
 * (or mutates in place). Queued so concurrent requests can't interleave
 * writes and corrupt the file.
 */
export function withState(mutator) {
  const result = writeQueue.then(async () => {
    const state = await loadState();
    const returned = await mutator(state);
    await persist(state);
    return returned;
  });
  // Keep the queue alive even if this particular call rejects, so later
  // calls still run; but let the caller see the rejection.
  writeQueue = result.catch(() => {});
  return result;
}

export async function readState() {
  return loadState();
}
