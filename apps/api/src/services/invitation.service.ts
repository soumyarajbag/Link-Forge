import { ObjectId } from 'mongodb';
import { errors } from '../utils/app-error.js';
import type { Actor } from '../models/actor.model.js';
import type { WorkspaceRole } from '../models/member.model.js';
import type { WorkspaceInvitationDocument } from '../models/workspace-invitation.model.js';
import type { AuthRepository } from '../repositories/auth.repository.js';
import type { WorkspaceRepository } from '../repositories/workspace.repository.js';
import { AuditService } from './audit.service.js';
import { AuthorizationService } from './authorization.service.js';
import { EmailService } from './email.service.js';
import { hashToken, randomToken } from '../utils/crypto.js';
import { normalizeEmail, validEmail } from '../utils/url.js';

export class InvitationService {
  constructor(
    private readonly workspaces: WorkspaceRepository,
    private readonly auth: AuthRepository,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
  ) {}

  async create(actor: Actor, workspaceId: ObjectId, emailValue: string, role: WorkspaceRole) {
    await this.authorization.workspace(actor, workspaceId, 'workspace:admin');
    const workspace = await this.workspaces.findWorkspace(workspaceId);
    const email = normalizeEmail(emailValue);
    if (!workspace || !validEmail(email)) throw errors.validation();
    const user = await this.auth.findUserByEmail(email);
    if (user && (await this.workspaces.findMember(workspaceId, user._id)))
      throw errors.conflict('user is already a member of this workspace');

    const now = new Date();
    const token = randomToken(32);
    const expiresAt = new Date(now.getTime() + 7 * 86_400_000);
    let invitation = await this.workspaces.findPendingInvitation(workspaceId, email);
    if (invitation) {
      Object.assign(invitation, {
        role,
        token_hash: hashToken(token),
        invited_by: actor.user._id,
        status: 'pending',
        expires_at: expiresAt,
        updated_at: now,
      });
      await this.workspaces.updateInvitation(invitation);
    } else {
      invitation = await this.workspaces.createInvitation({
        workspace_id: workspaceId,
        email,
        role,
        token_hash: hashToken(token),
        status: 'pending',
        invited_by: actor.user._id,
        expires_at: expiresAt,
        created_at: now,
        updated_at: now,
      });
    }
    await this.email.sendWorkspaceInvitation(email, workspace.name, role, token, expiresAt);
    await this.audit.record(
      actor.user._id,
      'workspace.invitation.created',
      'workspace_invitation',
      invitation._id.toHexString(),
      workspaceId,
    );
    return { invitation, token };
  }

  async list(actor: Actor, workspaceId: ObjectId) {
    await this.authorization.workspace(actor, workspaceId, 'workspace:admin');
    return this.workspaces.listInvitations(workspaceId);
  }

  async publicDetails(token: string) {
    const invitation = await this.findUsable(token);
    const [workspace, invitedUser] = await Promise.all([
      this.workspaces.findWorkspace(invitation.workspace_id),
      this.auth.findUserByEmail(invitation.email),
    ]);
    if (!workspace || workspace.status !== 'active') throw errors.notFound('invitation is no longer available');
    return {
      invitation: { _id: invitation._id, email: invitation.email, role: invitation.role, expires_at: invitation.expires_at },
      workspace,
      account_exists: Boolean(invitedUser),
    };
  }

  async accept(actor: Actor, token: string) {
    return this.acceptForUser(actor.user._id, token);
  }

  async validateForEmail(token: string, email: string) {
    const invitation = await this.findUsable(token);
    if (invitation.email !== normalizeEmail(email)) throw errors.forbidden('the invitation email does not match this account');
    return invitation;
  }

  async acceptForUser(userId: ObjectId, token: string) {
    const user = await this.auth.findUserById(userId);
    if (!user) throw errors.unauthorized();
    const invitation = await this.validateForEmail(token, user.email);
    const workspace = await this.workspaces.findWorkspace(invitation.workspace_id);
    if (!workspace || workspace.status !== 'active') throw errors.notFound('invitation workspace is no longer active');

    const existingMember = await this.workspaces.findMember(workspace._id, userId);
    if (!existingMember) {
      const now = new Date();
      await this.workspaces.upsertMember({
        workspace_id: workspace._id,
        user_id: userId,
        role: invitation.role,
        permissions: [],
        created_at: now,
        updated_at: now,
      });
    }
    invitation.status = 'accepted';
    invitation.accepted_by = userId;
    invitation.accepted_at = new Date();
    invitation.updated_at = new Date();
    await this.workspaces.updateInvitation(invitation);
    await this.audit.record(userId, 'workspace.invitation.accepted', 'workspace_invitation', invitation._id.toHexString(), workspace._id);
    return workspace;
  }

  async revoke(actor: Actor, workspaceId: ObjectId, invitationId: ObjectId) {
    await this.authorization.workspace(actor, workspaceId, 'workspace:admin');
    const invitation = await this.workspaces.findInvitationById(invitationId);
    if (!invitation || !invitation.workspace_id.equals(workspaceId)) throw errors.notFound();
    invitation.status = 'revoked';
    invitation.updated_at = new Date();
    await this.workspaces.updateInvitation(invitation);
    await this.audit.record(
      actor.user._id,
      'workspace.invitation.revoked',
      'workspace_invitation',
      invitation._id.toHexString(),
      workspaceId,
    );
  }

  private async findUsable(token: string) {
    const invitation = await this.workspaces.findInvitationByTokenHash(hashToken(token));
    if (!invitation || invitation.status !== 'pending') throw errors.notFound('invitation is invalid or has already been used');
    if (invitation.expires_at <= new Date()) {
      invitation.status = 'expired';
      invitation.updated_at = new Date();
      await this.workspaces.updateInvitation(invitation);
      throw errors.notFound('invitation has expired');
    }
    return invitation;
  }
}
