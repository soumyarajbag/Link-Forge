import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeHost, normalizeSlug, validateDestination, validSlug } from '../src/utils/url.js';

test('normalizes hosts and slugs at the domain boundary', () => {
  assert.equal(normalizeHost(' Example.COM. '), 'example.com');
  assert.equal(normalizeSlug(' My_Link '), 'my_link');
  assert.equal(validSlug('my_link'), true);
  assert.equal(validSlug('health'), false);
});

test('accepts safe HTTP destinations and rejects unsafe URLs', () => {
  assert.equal(validateDestination('https://example.com/path?q=1'), true);
  assert.equal(validateDestination('javascript:alert(1)'), false);
  assert.equal(validateDestination('https://user:password@example.com'), false);
  assert.equal(validateDestination('https://example.com/\u0000'), false);
});
