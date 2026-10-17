import { ObjectId } from 'mongodb';
import type { AppConfig } from '../config/env.js';
import { errors } from '../utils/app-error.js';
import type { Actor } from '../models/actor.model.js';
import type { UserDocument } from '../models/user.model.js';
import type { SessionDocument } from '../models/session.model.js';
import type { AuthRepository } from '../repositories/auth.repository.js';
import type { ApiKeyRepository } from '../repositories/api-key.repository.js';
import type { WorkspaceRepository } from '../repositories/workspace.repository.js';
import type { InvitationService } from './invitation.service.js';
import {
  hashIp,
  hashPassword,
  hashToken,
  randomOtp,
  randomSlug,
  randomToken,
  timingSafeStringEqual,
  verifyPassword,
} from '../utils/crypto.js';
import { normalizeEmail, normalizeSlug, validEmail, validSlug } from '../utils/url.js';
import { isDuplicateKey } from '../config/database.js';
import { EmailService } from './email.service.js';

const MAX_VERIFICATION_ATTEMPTS = 5;

export class AuthService {
  constructor(
    private readonly auth: AuthRepository,
    private readonly workspaces: WorkspaceRepository,
    private readonly email: EmailService,
    private readonly invitations: InvitationService,
    private readonly config: AppConfig,
  ) {}

  async authenticate(sessionToken?: string, apiKeyToken?: string): Promise<Actor> {
    if (apiKeyToken?.trim()) throw errors.unauthorized('API key authentication is configured by the API-key module');
    if (!sessionToken?.trim()) throw errors.unauthorized();
    const session = await this.auth.findSessionByHash(hashToken(sessionToken));
    if (
      !session ||
      session.revoked_at ||
      new Date() > session.expires_at ||
      Date.now() - session.last_used_at.getTime() > this.config.sessionIdleTtlMs
    )
      throw errors.unauthorized();
    const user = await this.auth.findUserById(session.user_id);
    if (!user || user.status !== 'active' || !user.email_verified_at) throw errors.unauthorized();
    await this.auth.touchSession(session._id, new Date());
    return { user, session, authMethod: 'cookie' };
  }

  async authenticateApiKey(
    token: string,
    apiKeys: ApiKeyRepository,
    getUser: (id: ObjectId) => Promise<UserDocument | null>,
  ): Promise<Actor> {
    const key = await apiKeys.findByHash(hashToken(token));
    if (!key || (key.expires_at && new Date() > key.expires_at)) throw errors.unauthorized();
    const members = await this.workspaces.listMembers(key.workspace_id);
    if (!members.length) throw errors.unauthorized();
    const user = await getUser(key.created_by || members[0]!.user_id);
    if (!user || user.status !== 'active' || !user.email_verified_at) throw errors.unauthorized();
    await apiKeys.touch(key._id, new Date());
    return { user, apiKey: key, workspaceId: key.workspace_id, authMethod: 'api_key' };
  }

  async register(input: { email: string; password: string; display_name?: string; device_label?: string; invitation_token?: string }) {
    const email = normalizeEmail(input.email);
    if (!validEmail(email) || input.password.length < 12) throw errors.validation();
    if (await this.auth.findUserByEmail(email)) throw errors.conflict('email already exists');
    if (input.invitation_token) await this.invitations.validateForEmail(input.invitation_token, email);

    const now = new Date();
    const verificationCode = randomOtp();
    const verificationExpiresAt = new Date(now.getTime() + this.config.emailVerificationTtlMs);
    const user = await this.auth.createUser({
      email,
      password_hash: await hashPassword(
        input.password,
        this.config.passwordMemoryKiB,
        this.config.passwordIterations,
        this.config.passwordParallelism,
      ),
      display_name: input.display_name?.trim() || email.split('@')[0] || 'user',
      status: 'pending',
      email_verification_hash: hashToken(verificationCode),
      email_verification_expires_at: verificationExpiresAt,
      email_verification_attempts: 0,
      email_verification_sent_at: now,
      is_platform_admin: false,
      created_at: now,
      updated_at: now,
    });
    const workspace = input.invitation_token ? undefined : await this.createDefaultWorkspace(user, input.display_name || user.display_name);
    await this.email.sendVerificationCode(email, verificationCode, verificationExpiresAt);
    return { user, workspace, verificationCode, verificationExpiresAt };
  }

  async login(emailValue: string, password: string, deviceLabel: string, userAgent: string, ip: string) {
    const user = await this.auth.findUserByEmail(normalizeEmail(emailValue));
    if (!user || !(await verifyPassword(user.password_hash, password))) throw errors.invalidCredentials();
    if (!user.email_verified_at) throw errors.emailVerificationRequired();
    if (user.status !== 'active') throw errors.invalidCredentials();
    return { user, ...(await this.createSession(user._id, deviceLabel, userAgent, ip)) };
  }

  async verifyEmail(
    emailValue: string,
    code: string,
    invitationToken: string | undefined,
    deviceLabel: string,
    userAgent: string,
    ip: string,
  ) {
    const user = await this.auth.findUserByEmail(normalizeEmail(emailValue));
    if (
      !user ||
      user.status !== 'pending' ||
      !user.email_verification_hash ||
      !user.email_verification_expires_at ||
      user.email_verification_expires_at <= new Date()
    )
      throw errors.invalidCredentials('invalid or expired verification code');
    if (invitationToken) await this.invitations.validateForEmail(invitationToken, user.email);

    const attempts = user.email_verification_attempts || 0;
    if (attempts >= MAX_VERIFICATION_ATTEMPTS) throw errors.rateLimited('too many invalid verification attempts; request a new code');
    if (!timingSafeStringEqual(hashToken(code), user.email_verification_hash)) {
      user.email_verification_attempts = attempts + 1;
      user.updated_at = new Date();
      await this.auth.updateUser(user);
      if (user.email_verification_attempts >= MAX_VERIFICATION_ATTEMPTS)
        throw errors.rateLimited('too many invalid verification attempts; request a new code');
      throw errors.invalidCredentials('invalid verification code');
    }

    Object.assign(user, {
      status: 'active',
      email_verified_at: new Date(),
      email_verification_hash: undefined,
      email_verification_expires_at: undefined,
      email_verification_attempts: 0,
      email_verification_sent_at: undefined,
      updated_at: new Date(),
    });
    await this.auth.updateUser(user);
    const invitedWorkspace = invitationToken ? await this.invitations.acceptForUser(user._id, invitationToken) : undefined;
    const workspace =
      invitedWorkspace || (await this.workspaces.listForUser(user._id))[0] || (await this.createDefaultWorkspace(user, user.display_name));
    return { user, workspace, ...(await this.createSession(user._id, deviceLabel, userAgent, ip)) };
  }

  async resendVerification(emailValue: string) {
    const user = await this.auth.findUserByEmail(normalizeEmail(emailValue));
    if (!user || user.status !== 'pending') return { verificationCode: undefined, verificationExpiresAt: undefined };

    const now = new Date();
    if (
      user.email_verification_sent_at &&
      now.getTime() - user.email_verification_sent_at.getTime() < this.config.emailVerificationResendCooldownMs
    )
      throw errors.rateLimited('please wait before requesting another verification code');
    const verificationCode = randomOtp();
    const verificationExpiresAt = new Date(now.getTime() + this.config.emailVerificationTtlMs);
    Object.assign(user, {
      email_verification_hash: hashToken(verificationCode),
      email_verification_expires_at: verificationExpiresAt,
      email_verification_attempts: 0,
      email_verification_sent_at: now,
      updated_at: now,
    });
    await this.auth.updateUser(user);
    await this.email.sendVerificationCode(user.email, verificationCode, verificationExpiresAt);
    return { verificationCode, verificationExpiresAt };
  }

  async requestPasswordReset(emailValue: string) {
    const user = await this.auth.findUserByEmail(normalizeEmail(emailValue));
    if (!user) return undefined;
    const token = randomToken(32);
    const expiresAt = new Date(Date.now() + 1_800_000);
    Object.assign(user, { password_reset_hash: hashToken(token), password_reset_expires_at: expiresAt, updated_at: new Date() });
    await this.auth.updateUser(user);
    await this.email.sendPasswordReset(user.email, token, expiresAt);
    return { token, expiresAt };
  }
  async resetPassword(token: string, password: string) {
    if (password.length < 12) throw errors.validation();
    const user = await this.auth.findUserByReset(hashToken(token));
    if (!user) throw errors.invalidCredentials();
    Object.assign(user, {
      password_hash: await hashPassword(
        password,
        this.config.passwordMemoryKiB,
        this.config.passwordIterations,
        this.config.passwordParallelism,
      ),
      password_reset_hash: undefined,
      password_reset_expires_at: undefined,
      updated_at: new Date(),
    });
    await this.auth.updateUser(user);
    await this.auth.revokeAllSessions(user._id);
    return user;
  }
  async refresh(actor: Actor, userAgent: string, ip: string) {
    if (!actor.session) throw errors.unauthorized();
    const session = await this.createSession(actor.user._id, actor.session.device_label || '', userAgent, ip);
    await this.auth.revokeSession(actor.session._id);
    return session;
  }
  async revokeSession(userId: ObjectId, sessionId: ObjectId) {
    const sessions = await this.auth.listSessions(userId);
    if (!sessions.some((session) => session._id.equals(sessionId))) throw errors.notFound();
    await this.auth.revokeSession(sessionId);
  }
  async seedAdmin() {
    if (!this.config.seedAdminEmail) return;
    let user = await this.auth.findUserByEmail(normalizeEmail(this.config.seedAdminEmail));
    if (!user) {
      const now = new Date();
      user = await this.auth.createUser({
        email: normalizeEmail(this.config.seedAdminEmail),
        password_hash: await hashPassword(
          this.config.seedAdminPassword,
          this.config.passwordMemoryKiB,
          this.config.passwordIterations,
          this.config.passwordParallelism,
        ),
        display_name: 'Platform Admin',
        status: 'active',
        email_verified_at: now,
        is_platform_admin: true,
        created_at: now,
        updated_at: now,
      });
    } else if (!user.is_platform_admin) {
      user.is_platform_admin = true;
      user.email_verified_at ||= new Date();
      user.status = 'active';
      user.updated_at = new Date();
      await this.auth.updateUser(user);
    }
    if (!(await this.workspaces.listForUser(user._id)).length) await this.createDefaultWorkspace(user, 'Admin Workspace');
  }

  private async createSession(userId: ObjectId, deviceLabel: string, userAgent: string, ip: string) {
    const token = randomToken(32);
    const now = new Date();
    const session = await this.auth.createSession({
      user_id: userId,
      token_hash: hashToken(token),
      family_id: new ObjectId().toHexString(),
      device_label: deviceLabel.trim(),
      user_agent: userAgent,
      ip_hash: hashIp(ip),
      created_at: now,
      last_used_at: now,
      expires_at: new Date(now.getTime() + this.config.sessionTtlMs),
    });
    return { token, session };
  }
  private async createDefaultWorkspace(user: UserDocument, name: string) {
    const base = validSlug(normalizeSlug(name)) ? normalizeSlug(name) : 'workspace';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const now = new Date();
      const workspaceSlug = attempt ? `${base}-${randomSlug()}` : base;
      try {
        const workspace = await this.workspaces.createWorkspace({
          name: name.trim(),
          slug: workspaceSlug,
          plan: 'free',
          status: 'active',
          created_at: now,
          updated_at: now,
        });
        await this.workspaces.upsertMember({
          workspace_id: workspace._id,
          user_id: user._id,
          role: 'owner',
          permissions: [],
          created_at: now,
          updated_at: now,
        });
        return workspace;
      } catch (error) {
        if (!isDuplicateKey(error)) throw error;
      }
    }
    throw errors.conflict();
  }
}
