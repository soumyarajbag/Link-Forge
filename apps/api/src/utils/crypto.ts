import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';

export const randomToken = (bytes: number): string => randomBytes(bytes).toString('base64url');
export const randomOtp = (digits = 6): string => randomInt(10 ** (digits - 1), 10 ** digits).toString();
export const hashToken = (value: string): string => createHash('sha256').update(value).digest('base64url');
export const hashIp = (value: string): string => createHash('sha256').update(value).digest('hex');
export const timingSafeStringEqual = (left: string, right: string): boolean => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};
export const randomSlug = (length = 8): string => {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
  return Array.from({ length: Math.max(6, length) }, () => alphabet[randomInt(alphabet.length)]).join('');
};
export const hashPassword = (password: string, memoryCost: number, timeCost: number, parallelism: number): Promise<string> =>
  argon2.hash(password, { type: argon2.argon2id, memoryCost, timeCost, parallelism, hashLength: 32 });
export const verifyPassword = (encoded: string, password: string): Promise<boolean> => argon2.verify(encoded, password).catch(() => false);
