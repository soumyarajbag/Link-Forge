import type { RequestHandler } from 'express';
import { errors } from '../utils/app-error.js';
import type { Actor } from '../models/actor.model.js';
import type { ApiKeyRepository } from '../repositories/api-key.repository.js';
import type { AuthRepository } from '../repositories/auth.repository.js';
import { AuthService } from '../services/auth.service.js';
import { parseCookies, SESSION_COOKIE } from '../utils/cookies.js';

declare global {
  namespace Express {
    interface Request {
      actor?: Actor;
      requestId?: string;
    }
  }
}

export function requireAuthentication(auth: AuthService, apiKeys: ApiKeyRepository, users: AuthRepository): RequestHandler {
  return async (request, _response, next) => {
    try {
      const cookies = parseCookies(request.get('cookie'));
      const key =
        request.get('x-api-key') ||
        (request.get('authorization')?.startsWith('Bearer ') ? request.get('authorization')!.slice(7).trim() : '');
      request.actor = key
        ? await auth.authenticateApiKey(key, apiKeys, (id) => users.findUserById(id))
        : await auth.authenticate(cookies[SESSION_COOKIE]);
      next();
    } catch (error) {
      next(error instanceof Error ? error : errors.unauthorized());
    }
  };
}
