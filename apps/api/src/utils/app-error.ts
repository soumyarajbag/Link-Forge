export type ErrorCode =
  | 'validation_error'
  | 'invalid_json'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'invalid_credentials'
  | 'email_verification_required'
  | 'password_required'
  | 'link_unavailable'
  | 'rate_limited'
  | 'internal_error';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const errors = {
  validation: (message = 'validation failed', details?: unknown) => new AppError('validation_error', message, 400, details),
  invalidJson: () => new AppError('invalid_json', 'request body is invalid', 400),
  unauthorized: (message = 'authentication is required') => new AppError('unauthorized', message, 401),
  forbidden: (message = 'forbidden') => new AppError('forbidden', message, 403),
  notFound: (message = 'not found') => new AppError('not_found', message, 404),
  conflict: (message = 'conflict') => new AppError('conflict', message, 409),
  invalidCredentials: (message = 'invalid credentials') => new AppError('invalid_credentials', message, 401),
  emailVerificationRequired: () => new AppError('email_verification_required', 'email verification is required before signing in', 403),
  passwordRequired: () => new AppError('password_required', 'link password required', 401),
  linkUnavailable: () => new AppError('link_unavailable', 'link unavailable', 410),
  rateLimited: (message = 'too many requests') => new AppError('rate_limited', message, 429),
};
