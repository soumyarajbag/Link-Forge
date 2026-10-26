import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config/env.js';
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

test('parses false environment booleans without treating them as truthy strings', () => {
  const config = loadConfig({ COOKIE_SECURE: 'false', SMTP_SECURE: 'false', EXPOSE_DEV_TOKENS: 'false' });
  assert.equal(config.cookieSecure, false);
  assert.equal(config.smtpSecure, false);
  assert.equal(config.exposeDevTokens, false);
});

test('disables exposed development tokens by default in production', () => {
  const config = loadConfig({
    APP_ENV: 'production',
    SMTP_HOST: 'smtp.example.com',
    EMAIL_FROM: 'LinkForge <no-reply@example.com>',
  });
  assert.equal(config.exposeDevTokens, false);
  assert.equal(config.cookieSecure, true);
});

test('forces secure cookies in production even when a stale variable says false', () => {
  const config = loadConfig({
    APP_ENV: 'production',
    COOKIE_SECURE: 'false',
    SMTP_HOST: 'smtp.example.com',
    EMAIL_FROM: 'LinkForge <no-reply@example.com>',
  });
  assert.equal(config.cookieSecure, true);
});

test('forces exposed development tokens off in production even when configured true', () => {
  const config = loadConfig({
    APP_ENV: 'production',
    SMTP_HOST: 'smtp.example.com',
    EMAIL_FROM: 'LinkForge <no-reply@example.com>',
    EXPOSE_DEV_TOKENS: 'true',
  });
  assert.equal(config.exposeDevTokens, false);
});

test('accepts safe HTTP destinations and rejects unsafe URLs', () => {
  assert.equal(validateDestination('https://example.com/path?q=1'), true);
  assert.equal(validateDestination('javascript:alert(1)'), false);
  assert.equal(validateDestination('https://user:password@example.com'), false);
  assert.equal(validateDestination('https://example.com/\u0000'), false);
});
