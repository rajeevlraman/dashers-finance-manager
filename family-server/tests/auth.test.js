import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, generateToken, isSessionExpired } from '../auth.js';

describe('hashPassword / verifyPassword', () => {
  test('a correct password verifies successfully', async () => {
    const { salt, hash } = await hashPassword('correct horse battery staple');
    const ok = await verifyPassword('correct horse battery staple', salt, hash);
    assert.equal(ok, true);
  });

  test('an incorrect password fails verification', async () => {
    const { salt, hash } = await hashPassword('correctPassword');
    const ok = await verifyPassword('wrongPassword', salt, hash);
    assert.equal(ok, false);
  });

  test('the same password hashed twice produces different salts/hashes', async () => {
    const first = await hashPassword('samePassword');
    const second = await hashPassword('samePassword');
    assert.notEqual(first.salt, second.salt);
    assert.notEqual(first.hash, second.hash);
  });

  test('plaintext password is never stored in the hash output', async () => {
    const { hash } = await hashPassword('mySecretPassword123');
    assert.ok(!hash.includes('mySecretPassword123'));
  });
});

describe('generateToken', () => {
  test('produces a long, unpredictable-looking token', () => {
    const token = generateToken();
    assert.ok(token.length >= 32);
  });

  test('two calls produce different tokens', () => {
    assert.notEqual(generateToken(), generateToken());
  });
});

describe('isSessionExpired', () => {
  test('a session with a future expiry is not expired', () => {
    const session = { expiresAt: new Date(Date.now() + 60000).toISOString() };
    assert.equal(isSessionExpired(session), false);
  });

  test('a session with a past expiry is expired', () => {
    const session = { expiresAt: new Date(Date.now() - 60000).toISOString() };
    assert.equal(isSessionExpired(session), true);
  });
});
