import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../js/sanitize.js';

describe('escapeHtml', () => {
  test('escapes a script tag so it cannot execute if injected via innerHTML', () => {
    const input = '<script>alert(1)</script>';
    const escaped = escapeHtml(input);
    assert.ok(!escaped.includes('<script>'));
    assert.equal(escaped, '&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  test('escapes attribute-breaking characters (quotes)', () => {
    assert.equal(escapeHtml(`"onmouseover="alert(1)`), '&quot;onmouseover=&quot;alert(1)');
    assert.equal(escapeHtml(`it's a test`), 'it&#39;s a test');
  });

  test('leaves ordinary text completely unchanged', () => {
    assert.equal(escapeHtml('123 Example Street'), '123 Example Street');
    assert.equal(escapeHtml('Jane Doe'), 'Jane Doe');
  });

  test('handles null/undefined gracefully instead of throwing or printing "null"', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
  });

  test('coerces non-string values (numbers) to string first', () => {
    assert.equal(escapeHtml(42), '42');
  });
});
