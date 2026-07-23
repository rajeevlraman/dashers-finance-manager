import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { encryptJSON, decryptJSON, isSupported } from '../js/backupCrypto.js';

describe('backupCrypto', () => {
  test('isSupported reports true in this environment', () => {
    assert.equal(isSupported(), true);
  });

  test('round-trip: decrypting with the correct password returns the original data', async () => {
    const original = {
      timestamp: '2026-07-11T00:00:00.000Z',
      data: {
        properties: [{ id: 'p1', name: '123 Example St', currentValue: 800000 }],
        tenants: [{ id: 't1', name: 'Jane Doe' }]
      }
    };
    const envelope = await encryptJSON(original, 'correct horse battery staple');
    assert.equal(envelope.encrypted, true);
    assert.equal(envelope.kdf, 'PBKDF2');

    const decrypted = await decryptJSON(envelope, 'correct horse battery staple');
    assert.deepEqual(decrypted, original);
  });

  test('the ciphertext does not contain the plaintext property name anywhere', async () => {
    const original = { data: { properties: [{ name: 'TotallyUniqueStreetName123' }] } };
    const envelope = await encryptJSON(original, 'somePassword123');
    const raw = JSON.stringify(envelope);
    assert.ok(!raw.includes('TotallyUniqueStreetName123'));
  });

  test('decrypting with the wrong password throws a clear error, not garbage data', async () => {
    const original = { data: { accounts: [{ id: 'a1', balance: 5000 }] } };
    const envelope = await encryptJSON(original, 'rightPassword');
    await assert.rejects(
      () => decryptJSON(envelope, 'wrongPassword'),
      /Incorrect password or corrupted backup file/
    );
  });

  test('a tampered envelope also fails to decrypt rather than silently returning corrupted data', async () => {
    const original = { data: { bills: [{ id: 'b1', amount: 100 }] } };
    const envelope = await encryptJSON(original, 'aPassword');
    // Flip the last character of the ciphertext to simulate corruption/tampering
    const tampered = { ...envelope, ciphertext: envelope.ciphertext.slice(0, -1) + (envelope.ciphertext.slice(-1) === 'A' ? 'B' : 'A') };
    await assert.rejects(() => decryptJSON(tampered, 'aPassword'));
  });

  test('rejects a non-encrypted object passed to decryptJSON', async () => {
    await assert.rejects(
      () => decryptJSON({ encrypted: false }, 'anyPassword'),
      /Not an encrypted backup envelope/
    );
  });

  test('two encryptions of the same data with the same password produce different ciphertext (random salt/IV)', async () => {
    const original = { data: { categories: [{ id: 'c1', name: 'Groceries' }] } };
    const envelope1 = await encryptJSON(original, 'samePassword');
    const envelope2 = await encryptJSON(original, 'samePassword');
    assert.notEqual(envelope1.ciphertext, envelope2.ciphertext);
    assert.notEqual(envelope1.salt, envelope2.salt);
    assert.notEqual(envelope1.iv, envelope2.iv);
  });
});
