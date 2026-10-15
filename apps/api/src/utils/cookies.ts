import type { Response } from 'express';
import type { AppConfig } from '../config/env.js';
import { randomToken } from './crypto.js';

export const SESSION_COOKIE = 'linkforge_session';
export const CSRF_COOKIE = 'linkforge_csrf';
export function parseCookies(header: string | undefined): Record<string, string> {
  return Object.fromEntries(
    (header || '')
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([key, value]) => key && value)
      .map(([key, ...rest]) => {
        const raw = rest.join('=');
        try {
          return [key, decodeURIComponent(raw)];
        } catch {
          return [key, raw];
        }
      }),
  );
}
export function setCookie(
  response: Response,
  config: AppConfig,
  name: string,
  value: string,
  httpOnly: boolean,
  maxAgeMs = config.sessionTtlMs,
) {
  const sameSite = config.cookieSecure ? 'None' : 'Lax';
  response.append(
    'Set-Cookie',
    `${name}=${encodeURIComponent(value)}; Max-Age=${Math.floor(maxAgeMs / 1000)}; Path=/; ${httpOnly ? 'HttpOnly; ' : ''}${config.cookieSecure ? 'Secure; ' : ''}SameSite=${sameSite}`,
  );
}
export function setAuthCookies(response: Response, config: AppConfig, sessionToken: string) {
  setCookie(response, config, SESSION_COOKIE, sessionToken, true);
  setCookie(response, config, CSRF_COOKIE, randomToken(24), false);
}
export function clearAuthCookies(response: Response, config: AppConfig) {
  setCookie(response, config, SESSION_COOKIE, '', true, 0);
  setCookie(response, config, CSRF_COOKIE, '', false, 0);
}
