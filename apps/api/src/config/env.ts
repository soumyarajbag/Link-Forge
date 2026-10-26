import { z } from 'zod';

const environmentBoolean = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return value;
}, z.boolean());

const rawEnv = z.object({
  APP_ENV: z.string().default('development'),
  LOG_FORMAT: z.enum(['pretty', 'json']).optional(),
  PORT: z.coerce.number().int().positive().default(8080),
  MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017'),
  MONGODB_DATABASE: z.string().min(1).default('linkforge'),
  APP_URL: z.string().default('http://localhost:3000'),
  API_URL: z.string().default('http://localhost:8080'),
  SHORT_BASE_URL: z.string().default('http://localhost:8080'),
  DEFAULT_SHORT_DOMAIN: z.string().default('localhost:8080'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:8080'),
  SESSION_TTL: z.string().default('168h'),
  SESSION_IDLE_TTL: z.string().default('24h'),
  COOKIE_SECURE: environmentBoolean.default(false),
  EXPOSE_DEV_TOKENS: environmentBoolean.optional(),
  PASSWORD_MEMORY_KIB: z.coerce.number().int().min(16_384).default(65_536),
  PASSWORD_ITERATIONS: z.coerce.number().int().min(2).default(3),
  PASSWORD_PARALLELISM: z.coerce.number().int().positive().default(2),
  RATE_LIMIT_REQUESTS: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_WINDOW: z.string().default('1m'),
  ANALYTICS_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  EMAIL_FROM: z.string().default('LinkForge <no-reply@localhost>'),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_SECURE: environmentBoolean.default(false),
  EMAIL_VERIFICATION_TTL: z.string().default('15m'),
  EMAIL_VERIFICATION_RESEND_COOLDOWN: z.string().default('60s'),
  SEED_ADMIN_EMAIL: z.string().default(''),
  SEED_ADMIN_PASSWORD: z.string().default(''),
});

export type AppConfig = {
  environment: string;
  logFormat: 'pretty' | 'json';
  port: number;
  mongoUri: string;
  database: string;
  appUrl: string;
  apiUrl: string;
  shortBaseUrl: string;
  defaultShortDomain: string;
  allowedOrigins: string[];
  sessionTtlMs: number;
  sessionIdleTtlMs: number;
  cookieSecure: boolean;
  exposeDevTokens: boolean;
  passwordMemoryKiB: number;
  passwordIterations: number;
  passwordParallelism: number;
  rateLimitRequests: number;
  rateLimitWindowMs: number;
  analyticsRetentionDays: number;
  emailFrom: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
  emailVerificationTtlMs: number;
  emailVerificationResendCooldownMs: number;
  seedAdminEmail: string;
  seedAdminPassword: string;
};

function parseDuration(value: string, name: string): number {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/i);
  if (!match) throw new Error(`${name} must use a duration such as 30m or 24h`);
  const amount = Number(match[1]);
  const factor: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  const unit = match[2]!.toLowerCase();
  return amount * (factor[unit] ?? 1);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = rawEnv.parse(env);
  const sessionTtlMs = parseDuration(parsed.SESSION_TTL, 'SESSION_TTL');
  const sessionIdleTtlMs = parseDuration(parsed.SESSION_IDLE_TTL, 'SESSION_IDLE_TTL');
  const rateLimitWindowMs = parseDuration(parsed.RATE_LIMIT_WINDOW, 'RATE_LIMIT_WINDOW');
  const emailVerificationTtlMs = parseDuration(parsed.EMAIL_VERIFICATION_TTL, 'EMAIL_VERIFICATION_TTL');
  const emailVerificationResendCooldownMs = parseDuration(parsed.EMAIL_VERIFICATION_RESEND_COOLDOWN, 'EMAIL_VERIFICATION_RESEND_COOLDOWN');
  const cookieSecure = parsed.APP_ENV === 'production' ? true : parsed.COOKIE_SECURE;
  const exposeDevTokens = parsed.APP_ENV === 'production' ? false : (parsed.EXPOSE_DEV_TOKENS ?? true);
  if (sessionIdleTtlMs > sessionTtlMs) throw new Error('SESSION_IDLE_TTL must not exceed SESSION_TTL');
  if ((parsed.SEED_ADMIN_EMAIL === '') !== (parsed.SEED_ADMIN_PASSWORD === ''))
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be provided together');
  if (parsed.SEED_ADMIN_PASSWORD && parsed.SEED_ADMIN_PASSWORD.length < 12)
    throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters');
  if ((parsed.SMTP_USER === '') !== (parsed.SMTP_PASSWORD === '')) throw new Error('SMTP_USER and SMTP_PASSWORD must be provided together');
  if (parsed.APP_ENV === 'production' && !parsed.SMTP_HOST)
    throw new Error('SMTP_HOST is required in production so verification emails can be delivered');
  if (parsed.APP_ENV === 'production' && parsed.EMAIL_FROM.includes('localhost'))
    throw new Error('EMAIL_FROM must be configured with a real sender in production');
  return {
    environment: parsed.APP_ENV,
    logFormat: parsed.LOG_FORMAT || (parsed.APP_ENV === 'production' ? 'json' : 'pretty'),
    port: parsed.PORT,
    mongoUri: parsed.MONGODB_URI,
    database: parsed.MONGODB_DATABASE,
    appUrl: parsed.APP_URL,
    apiUrl: parsed.API_URL,
    shortBaseUrl: parsed.SHORT_BASE_URL,
    defaultShortDomain: parsed.DEFAULT_SHORT_DOMAIN,
    allowedOrigins: parsed.ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    sessionTtlMs,
    sessionIdleTtlMs,
    cookieSecure,
    exposeDevTokens,
    passwordMemoryKiB: parsed.PASSWORD_MEMORY_KIB,
    passwordIterations: parsed.PASSWORD_ITERATIONS,
    passwordParallelism: parsed.PASSWORD_PARALLELISM,
    rateLimitRequests: parsed.RATE_LIMIT_REQUESTS,
    rateLimitWindowMs,
    analyticsRetentionDays: parsed.ANALYTICS_RETENTION_DAYS,
    emailFrom: parsed.EMAIL_FROM,
    smtpHost: parsed.SMTP_HOST,
    smtpPort: parsed.SMTP_PORT,
    smtpUser: parsed.SMTP_USER,
    smtpPassword: parsed.SMTP_PASSWORD,
    smtpSecure: parsed.SMTP_SECURE,
    emailVerificationTtlMs,
    emailVerificationResendCooldownMs,
    seedAdminEmail: parsed.SEED_ADMIN_EMAIL,
    seedAdminPassword: parsed.SEED_ADMIN_PASSWORD,
  };
}
