import assert from 'node:assert/strict';
import test from 'node:test';
import { requestLogLevel, sanitizeRequestTarget } from '../src/middleware/request-logger.middleware.js';
import { normalizeHost, normalizeSlug, validateDestination, validSlug } from '../src/utils/url.js';

test('normalizes hosts and slugs', () => {
  assert.equal(normalizeHost(' Example.COM. '), 'example.com');
  assert.equal(normalizeSlug(' My_Link '), 'my_link');
  assert.equal(validSlug('my_link'), true);
  assert.equal(validSlug('health'), false);
});

test('redacts credentials and invitation tokens from request log paths', () => {
  assert.equal(
    sanitizeRequestTarget('/v1/auth/verify-email?email=person%40example.com&code=123456&page=2'),
    '/v1/auth/verify-email?email=%5Bredacted%5D&code=%5Bredacted%5D&page=2',
  );
  assert.equal(sanitizeRequestTarget('/v1/invitations/secret-token?source=email'), '/v1/invitations/[redacted]?source=email');
});

test('maps HTTP statuses to request log severity', () => {
  assert.equal(requestLogLevel(204), 'info');
  assert.equal(requestLogLevel(404), 'warn');
  assert.equal(requestLogLevel(503), 'error');
});

test('accepts safe HTTP destinations and rejects unsafe URLs', () => {
  assert.equal(validateDestination('https://example.com/path?q=1'), true);
  assert.equal(validateDestination('javascript:alert(1)'), false);
  assert.equal(validateDestination('https://user:password@example.com'), false);
  assert.equal(validateDestination('https://example.com/\u0000'), false);
});
