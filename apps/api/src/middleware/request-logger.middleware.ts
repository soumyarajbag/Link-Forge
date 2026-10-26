import { STATUS_CODES } from 'node:http';
import type { Request, RequestHandler, Response } from 'express';

type LogFormat = 'pretty' | 'json';
type LogLevel = 'info' | 'warn' | 'error';

type HttpLogEntry = {
  timestamp: string;
  level: LogLevel;
  event: 'http_request';
  request_id: string;
  method: string;
  path: string;
  status: number;
  status_text: string;
  duration_ms: number;
  request_bytes?: number;
  response_bytes?: number;
  ip?: string;
  user_agent?: string;
  auth_method?: 'cookie' | 'api_key';
  user_id?: string;
  workspace_id?: string;
  api_key_id?: string;
  api_key_prefix?: string;
  error_code?: string;
  connection_closed?: boolean;
};

const sensitiveQueryKey = /(?:password|token|secret|api[-_]?key|authorization|cookie|code|email)/i;
const invitationTokenPath = /^(\/v1\/invitations\/)([^/?]+)/i;
const colors = {
  reset: '\u001b[0m',
  dim: '\u001b[2m',
  bold: '\u001b[1m',
  cyan: '\u001b[36m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  red: '\u001b[31m',
  magenta: '\u001b[35m',
  gray: '\u001b[90m',
} as const;

export function requestLogger(options: { format: LogFormat }): RequestHandler {
  return (request, response, next) => {
    const startedAt = performance.now();
    let logged = false;

    const write = (connectionClosed = false) => {
      if (logged) return;
      logged = true;
      const entry = createEntry(request, response, startedAt, connectionClosed);
      if (options.format === 'json') writeJson(entry);
      else console.log(formatPretty(entry));
    };

    response.once('finish', () => write(false));
    response.once('close', () => {
      if (!response.writableFinished) write(true);
    });
    next();
  };
}

function createEntry(request: Request, response: Response, startedAt: number, connectionClosed: boolean): HttpLogEntry {
  const actor = request.actor;
  const requestBytes = parseByteCount(request.get('content-length'));
  const responseBytes = parseByteCount(response.getHeader('content-length'));
  const status = connectionClosed && response.statusCode < 400 ? 499 : response.statusCode;
  return compact({
    timestamp: new Date().toISOString(),
    level: requestLogLevel(status),
    event: 'http_request',
    request_id: request.requestId || 'unknown',
    method: request.method.toUpperCase(),
    path: sanitizeRequestTarget(request.originalUrl || request.url),
    status,
    status_text: connectionClosed ? 'Client Closed Request' : STATUS_CODES[status] || 'Unknown',
    duration_ms: Number((performance.now() - startedAt).toFixed(2)),
    request_bytes: requestBytes,
    response_bytes: responseBytes,
    ip: request.ip,
    user_agent: cleanUserAgent(request.get('user-agent')),
    auth_method: actor?.authMethod,
    user_id: actor?.user._id.toHexString(),
    workspace_id: actor?.workspaceId?.toHexString(),
    api_key_id: actor?.apiKey?._id.toHexString(),
    api_key_prefix: actor?.apiKey?.prefix,
    error_code: typeof response.locals.errorCode === 'string' ? response.locals.errorCode : undefined,
    connection_closed: connectionClosed || undefined,
  });
}

export function sanitizeRequestTarget(target: string): string {
  try {
    const parsed = new URL(target, 'http://logger.local');
    parsed.pathname = parsed.pathname.replace(invitationTokenPath, '$1[redacted]');
    for (const key of [...parsed.searchParams.keys()]) {
      if (!sensitiveQueryKey.test(key)) continue;
      parsed.searchParams.set(key, '[redacted]');
    }
    const query = parsed.searchParams.toString();
    return `${parsed.pathname}${query ? `?${query}` : ''}`;
  } catch {
    return target.split('?')[0] || '/';
  }
}

export function requestLogLevel(status: number): LogLevel {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return 'info';
}

function writeJson(entry: HttpLogEntry) {
  const line = JSON.stringify(entry);
  if (entry.level === 'error') console.error(line);
  else if (entry.level === 'warn') console.warn(line);
  else console.log(line);
}

function formatPretty(entry: HttpLogEntry): string {
  const colorEnabled = Boolean(process.stdout.isTTY && !process.env.NO_COLOR);
  const color = (value: string, tone: keyof typeof colors) => (colorEnabled ? `${colors[tone]}${value}${colors.reset}` : value);
  const methodTone = methodColor(entry.method);
  const statusTone = entry.status >= 500 ? 'red' : entry.status >= 400 ? 'yellow' : entry.status >= 300 ? 'magenta' : 'green';
  const icon = entry.connection_closed ? '×' : entry.status >= 500 ? '✕' : entry.status >= 400 ? '!' : '✓';
  const firstLine = [
    color(formatClock(entry.timestamp), 'gray'),
    color(icon, statusTone),
    color(entry.method.padEnd(7), methodTone),
    color(entry.path, 'bold'),
    color(`${entry.status} ${entry.status_text}`, statusTone),
    color(formatDuration(entry.duration_ms), durationColor(entry.duration_ms)),
    color(formatBytes(entry.response_bytes), 'gray'),
  ].join('  ');
  const context = [
    `request=${entry.request_id}`,
    entry.auth_method ? `auth=${entry.auth_method}` : 'auth=public',
    entry.user_id ? `user=${entry.user_id}` : undefined,
    entry.workspace_id ? `workspace=${entry.workspace_id}` : undefined,
    entry.api_key_prefix ? `key=${entry.api_key_prefix}…` : undefined,
    entry.ip ? `ip=${entry.ip}` : undefined,
    entry.request_bytes !== undefined ? `in=${formatBytes(entry.request_bytes)}` : undefined,
    entry.error_code ? `error=${entry.error_code}` : undefined,
    entry.user_agent ? `agent="${entry.user_agent}"` : undefined,
  ]
    .filter(Boolean)
    .join('  •  ');
  return `${firstLine}\n${color(`             ↳ ${context}`, 'dim')}`;
}

function methodColor(method: string): keyof typeof colors {
  if (method === 'GET' || method === 'HEAD') return 'cyan';
  if (method === 'POST') return 'green';
  if (method === 'PATCH' || method === 'PUT') return 'yellow';
  if (method === 'DELETE') return 'red';
  return 'magenta';
}

function durationColor(durationMs: number): keyof typeof colors {
  if (durationMs >= 1_000) return 'red';
  if (durationMs >= 300) return 'yellow';
  return 'cyan';
}

function formatClock(timestamp: string): string {
  return timestamp.slice(11, 23);
}

function formatDuration(value: number): string {
  return value < 1_000 ? `${value.toFixed(value < 10 ? 2 : 1)}ms` : `${(value / 1_000).toFixed(2)}s`;
}

function formatBytes(value?: number): string {
  if (value === undefined) return '-';
  if (value < 1_024) return `${value}B`;
  if (value < 1_048_576) return `${(value / 1_024).toFixed(1)}KB`;
  return `${(value / 1_048_576).toFixed(1)}MB`;
}

function parseByteCount(value: string | number | string[] | undefined): number | undefined {
  if (Array.isArray(value)) value = value[0];
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function cleanUserAgent(value?: string): string | undefined {
  if (!value) return undefined;
  return value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180);
}

function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}
