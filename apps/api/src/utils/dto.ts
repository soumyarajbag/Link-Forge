import { ObjectId } from 'mongodb';

const hidden = new Set([
  'password_hash',
  'password_reset_hash',
  'password_reset_expires_at',
  'email_verification_hash',
  'email_verification_expires_at',
  'email_verification_attempts',
  'email_verification_sent_at',
  'verification_token',
  'token_hash',
  'secret_hash',
  'ip_hash',
  'user_agent',
  'deleted_at',
]);
export function serialize(value: unknown): unknown {
  if (value instanceof ObjectId) return value.toHexString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (hidden.has(key)) continue;
      output[key === '_id' ? 'id' : key] = serialize(item);
    }
    return output;
  }
  return value;
}
