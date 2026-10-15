import { URL } from 'node:url';

const slugPattern = /^[a-z0-9](?:[a-z0-9_-]{0,48}[a-z0-9])$/;
const reservedSlugs = new Set(['api', 'admin', 'auth', 'dashboard', 'docs', 'health', 'login', 'logout', 'register', 'settings', 'v1']);
export const normalizeEmail = (value: string): string => value.trim().toLowerCase();
export const validEmail = (value: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
export const normalizeHost = (value: string): string => value.trim().toLowerCase().replace(/\.$/, '');
export const normalizeSlug = (value: string): string => value.trim().toLowerCase();
export const normalizeDestination = (value: string): string => value.trim();
export const validSlug = (value: string): boolean => {
  const slug = normalizeSlug(value);
  return !reservedSlugs.has(slug) && slugPattern.test(slug);
};
export const validateDestination = (raw: string): boolean => {
  const value = raw.trim();
  if (!value || value.length > 4096 || /[\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
};
export const hostFromUrl = (value: string): string => {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
};
export const isReservedHost = (value: string): boolean => {
  const host = normalizeHost(value);
  return !host || host === 'localhost' || host.startsWith('127.');
};
export const dateRange = (fromValue?: string, toValue?: string): { from: Date; to: Date } => {
  const now = new Date();
  const from =
    fromValue && /^\d{4}-\d{2}-\d{2}$/.test(fromValue) ? new Date(`${fromValue}T00:00:00.000Z`) : new Date(now.getTime() - 7 * 86_400_000);
  const validTo = Boolean(toValue && /^\d{4}-\d{2}-\d{2}$/.test(toValue));
  let to = validTo ? new Date(`${toValue}T00:00:00.000Z`) : new Date(now.getTime() + 60_000);
  if (validTo) to = new Date(to.getTime() + 86_400_000);
  if (to <= from) to = new Date(from.getTime() + 86_400_000);
  return { from, to };
};
