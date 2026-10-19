import type { RequestHandler } from 'express';
import { errors } from '../utils/app-error.js';
import { parseCookies, CSRF_COOKIE } from '../utils/cookies.js';
import { timingSafeStringEqual } from '../utils/crypto.js';

export const csrfProtection: RequestHandler = (request, _response, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method) || request.actor?.authMethod !== 'cookie') return next();
  const cookie = parseCookies(request.get('cookie'))[CSRF_COOKIE];
  const header = request.get('x-csrf-token') || '';
  if (!cookie || !header || !timingSafeStringEqual(cookie, header)) return next(errors.forbidden('a valid CSRF token is required'));
  next();
};
