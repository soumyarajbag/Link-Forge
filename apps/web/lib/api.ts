const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 500, code = 'request_failed') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const endpoint = API_URL ? `${API_URL}${path}` : `/api${path}`;
  const response = await fetch(endpoint, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    cache: 'no-store',
  });
  const payload = await parseResponse(response);
  if (!response.ok)
    throw new ApiError(payload?.error?.message || 'The request could not be completed.', response.status, payload?.error?.code);
  return (payload?.data ?? payload) as T;
}

export async function csrfToken() {
  const data = await apiRequest<{ csrf_token: string }>('/v1/auth/csrf');
  return data.csrf_token;
}

export async function apiMutation<T>(path: string, body?: unknown, method = 'POST') {
  const publicAuthMutation = [
    '/v1/auth/login',
    '/v1/auth/register',
    '/v1/auth/verify-email',
    '/v1/auth/verify-email/resend',
    '/v1/auth/password-reset/request',
    '/v1/auth/password-reset/confirm',
  ].includes(path);
  const headers: Record<string, string> = {};
  if (!publicAuthMutation) headers['X-CSRF-Token'] = await csrfToken();
  return apiRequest<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body), headers });
}

export function shortURL(slug: string, hostname?: string) {
  const base = hostname
    ? hostname.startsWith('http')
      ? hostname
      : `${/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(hostname) ? 'http' : 'https'}://${hostname}`
    : process.env.NEXT_PUBLIC_SHORT_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080');
  return `${base.replace(/\/$/, '')}/${slug}`;
}

export function apiDocsURL() {
  return API_URL ? `${API_URL}/docs` : '/api/docs';
}

export function apiBaseURL() {
  return API_URL || (typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');
}
