import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MERCHANT_LOGOS, getMerchantLogo } from '../js/import/merchantLogos.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGOS_DIR = path.join(__dirname, '..', 'assets', 'logos');

describe('MERCHANT_LOGOS filenames match real files on disk', () => {
  // This is the exact class of bug this file previously had: entries
  // referencing "kfc.png" when the real file was "KFC.png" (case-sensitive
  // hosting like GitHub Pages 404s on that), and entries for files that
  // never existed at all (aldi.png, safeway.png, indiangroceries.png).
  // This test makes that class of bug impossible to reintroduce silently.
  const actualFiles = new Set(readdirSync(LOGOS_DIR));

  test('every referenced logo filename exists on disk with exact casing', () => {
    const missing = MERCHANT_LOGOS
      .map(entry => entry.logo)
      .filter(logo => !actualFiles.has(logo));
    assert.deepEqual(missing, [], `these referenced logo files don't exist on disk: ${missing.join(', ')}`);
  });

  test('no keyword is defined twice across different entries', () => {
    const seen = new Map();
    for (const entry of MERCHANT_LOGOS) {
      for (const keyword of entry.keywords) {
        if (seen.has(keyword)) {
          assert.fail(`keyword "${keyword}" is used by both "${seen.get(keyword)}" and "${entry.logo}"`);
        }
        seen.set(keyword, entry.logo);
      }
    }
  });
});

describe('getMerchantLogo', () => {
  test('matches a simple single-word merchant', () => {
    assert.equal(getMerchantLogo('WOOLWORTHS 1234 MELBOURNE'), 'assets/logos/woolworths.png');
  });

  test('matches case-insensitively regardless of bank statement casing', () => {
    assert.equal(getMerchantLogo('bunnings warehouse'), 'assets/logos/bunnings.png');
    assert.equal(getMerchantLogo('BUNNINGS WAREHOUSE'), 'assets/logos/bunnings.png');
  });

  test('returns the exact on-disk casing for compound-name merchants (the bug that was fixed)', () => {
    assert.equal(getMerchantLogo('KFC AUST 4021'), 'assets/logos/KFC.png');
    assert.equal(getMerchantLogo('MCDONALDS RESTAURANT'), 'assets/logos/macDonalds.png');
    assert.equal(getMerchantLogo('EB GAMES CHADSTONE'), 'assets/logos/ebGames.png');
    assert.equal(getMerchantLogo('CHEMIST WAREHOUSE 123'), 'assets/logos/chemistWarehouse.png');
    assert.equal(getMerchantLogo('CASEY KEBAB HOUSE'), 'assets/logos/caseyKebab.png');
  });

  test('Amazon Web Services and Amazon Music match their own specific logo, not the generic Amazon one', () => {
    assert.equal(getMerchantLogo('AWS EMEA CHARGE'), 'assets/logos/amazonwebservices.png');
    assert.equal(getMerchantLogo('AMAZON WEB SERVICES'), 'assets/logos/amazonwebservices.png');
    assert.equal(getMerchantLogo('AMAZON MUSIC UNLIMITED'), 'assets/logos/amazonmusic.jpeg');
  });

  test('a generic Amazon purchase still matches the plain Amazon logo', () => {
    assert.equal(getMerchantLogo('AMAZON.COM.AU PURCHASE'), 'assets/logos/amazon.png');
  });

  test('returns null for a merchant with no known logo, rather than a broken guess', () => {
    assert.equal(getMerchantLogo('SOME RANDOM CAFE THAT DOES NOT EXIST'), null);
  });

  test('handles an empty or missing description without throwing', () => {
    assert.equal(getMerchantLogo(''), null);
    assert.equal(getMerchantLogo(undefined), null);
  });

  test('logo paths are relative (no leading slash), so they work regardless of hosting path', () => {
    const logo = getMerchantLogo('WOOLWORTHS');
    assert.ok(!logo.startsWith('/'), `expected a relative path, got "${logo}"`);
  });

  test('regression: "Shelly" (smart-home hardware) resolves to its own logo, not the Shell fuel-station one it silently collided with as a substring', () => {
    assert.equal(getMerchantLogo('SHELLY RELAY SWITCH'), 'assets/logos/shelly.png');
    assert.equal(getMerchantLogo('SONOFF SMART PLUG'), 'assets/logos/sonoff.png');
    // Real Shell fuel purchases still match correctly
    assert.equal(getMerchantLogo('SHELL NARRE WARREN'), 'assets/logos/shell.jpeg');
  });
});
