// ============================================================================
// 🔐 auth.js — Password hashing and session tokens (Node built-ins only)
// ============================================================================

import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH);
  return { salt, hash: derivedKey.toString('hex') };
}

export async function verifyPassword(password, salt, expectedHash) {
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH);
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  if (derivedKey.length !== expectedBuffer.length) return false;
  return timingSafeEqual(derivedKey, expectedBuffer);
}

export function generateToken() {
  return randomBytes(32).toString('hex');
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — this is a household app on a trusted LAN

export function newSessionExpiry() {
  return new Date(Date.now() + SESSION_TTL_MS).toISOString();
}

export function isSessionExpired(session) {
  return new Date(session.expiresAt).getTime() < Date.now();
}
