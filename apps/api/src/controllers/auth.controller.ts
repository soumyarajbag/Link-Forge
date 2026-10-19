import { asyncHandler, parseBody, parseId, sendData, sendMessage, stringParam } from '../utils/http.js';
import type { AppConfig } from '../config/env.js';
import type { AuthRepository } from '../repositories/auth.repository.js';
import { clearAuthCookies, parseCookies, setAuthCookies, setCookie, CSRF_COOKIE } from '../utils/cookies.js';
import { randomToken } from '../utils/crypto.js';
import { resetConfirmSchema, resetRequestSchema, loginSchema, registerSchema, verifyEmailSchema } from '../validators/auth.validator.js';
import { AuthService } from '../services/auth.service.js';

export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly repository: AuthRepository,
    private readonly config: AppConfig,
  ) {}

  register = asyncHandler(async (request, response) => {
    const input = parseBody(registerSchema, request.body);
    const result = await this.service.register(input);
    const data: Record<string, unknown> = {
      user: result.user,
      workspace: result.workspace,
      verification_expires_at: result.verificationExpiresAt,
    };
    if (this.config.exposeDevTokens) data.development_verification_code = result.verificationCode;
    sendData(request, response, 201, data);
  });

  login = asyncHandler(async (request, response) => {
    const input = parseBody(loginSchema, request.body);
    const result = await this.service.login(
      input.email,
      input.password,
      input.device_label || '',
      request.get('user-agent') || '',
      request.ip || '',
    );
    setAuthCookies(response, this.config, result.token);
    const data: Record<string, unknown> = { user: result.user, session: result.session };
    if (this.config.exposeDevTokens) data.development_session_token = result.token;
    sendData(request, response, 200, data);
  });

  verifyEmail = asyncHandler(async (request, response) => {
    const input = parseBody(verifyEmailSchema, request.body);
    const result = await this.service.verifyEmail(
      input.email,
      input.code,
      input.invitation_token,
      '',
      request.get('user-agent') || '',
      request.ip || '',
    );
    setAuthCookies(response, this.config, result.token);
    sendData(request, response, 200, { user: result.user, workspace: result.workspace, session: result.session });
  });

  resendVerification = asyncHandler(async (request, response) => {
    const input = parseBody(resetRequestSchema, request.body);
    const result = await this.service.resendVerification(input.email);
    const data: Record<string, unknown> = {
      message: 'if the account exists, a verification code has been sent',
      verification_expires_at: result.verificationExpiresAt,
    };
    if (this.config.exposeDevTokens && result.verificationCode) data.development_verification_code = result.verificationCode;
    sendData(request, response, 202, data);
  });

  requestReset = asyncHandler(async (request, response) => {
    const input = parseBody(resetRequestSchema, request.body);
    const result = await this.service.requestPasswordReset(input.email);
    const data: Record<string, unknown> = { message: 'if the account exists, reset instructions have been issued' };
    if (this.config.exposeDevTokens && result) {
      data.development_reset_token = result.token;
      data.reset_expires_at = result.expiresAt;
    }
    sendData(request, response, 202, data);
  });
  confirmReset = asyncHandler(async (request, response) => {
    const input = parseBody(resetConfirmSchema, request.body);
    const user = await this.service.resetPassword(input.token, input.password);
    sendData(request, response, 200, { user, message: 'password updated; existing sessions were revoked' });
  });
  csrf = asyncHandler(async (request, response) => {
    let token = parseCookies(request.get('cookie'))[CSRF_COOKIE];
    if (!token) {
      token = randomToken(24);
      setCookie(response, this.config, CSRF_COOKIE, token, false);
    }
    sendData(request, response, 200, { csrf_token: token });
  });
  me = asyncHandler(async (request, response) => sendData(request, response, 200, { user: request.actor!.user }));
  refresh = asyncHandler(async (request, response) => {
    const result = await this.service.refresh(request.actor!, request.get('user-agent') || '', request.ip || '');
    setAuthCookies(response, this.config, result.token);
    const data: Record<string, unknown> = { session: result.session };
    if (this.config.exposeDevTokens) data.development_session_token = result.token;
    sendData(request, response, 200, data);
  });
  logout = asyncHandler(async (request, response) => {
    if (request.actor!.session) await this.repository.revokeSession(request.actor!.session._id);
    clearAuthCookies(response, this.config);
    sendMessage(request, response, 200, 'signed out');
  });
  logoutAll = asyncHandler(async (request, response) => {
    await this.repository.revokeAllSessions(request.actor!.user._id);
    clearAuthCookies(response, this.config);
    sendMessage(request, response, 200, 'all sessions revoked');
  });
  sessions = asyncHandler(async (request, response) =>
    sendData(request, response, 200, { sessions: await this.repository.listSessions(request.actor!.user._id) }),
  );
  revokeSession = asyncHandler(async (request, response) => {
    await this.service.revokeSession(request.actor!.user._id, parseId(stringParam(request.params.sessionID)));
    sendMessage(request, response, 200, 'session revoked');
  });
}
