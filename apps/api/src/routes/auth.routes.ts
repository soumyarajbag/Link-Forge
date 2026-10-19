import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';

export function authRoutes(controller: AuthController, authenticated: Router): Router {
  const router = Router();
  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/verify-email', controller.verifyEmail);
  router.post('/verify-email/resend', controller.resendVerification);
  router.post('/password-reset/request', controller.requestReset);
  router.post('/password-reset/confirm', controller.confirmReset);
  authenticated.get('/csrf', controller.csrf);
  authenticated.get('/me', controller.me);
  authenticated.post('/refresh', controller.refresh);
  authenticated.post('/logout', controller.logout);
  authenticated.post('/logout-all', controller.logoutAll);
  authenticated.get('/sessions', controller.sessions);
  authenticated.delete('/sessions/:sessionID', controller.revokeSession);
  return router;
}
