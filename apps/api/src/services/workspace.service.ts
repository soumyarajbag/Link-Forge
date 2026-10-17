import { ObjectId } from 'mongodb';
import type { AuthRepository } from '../repositories/auth.repository.js';
import type { WorkspaceRepository } from '../repositories/workspace.repository.js';
import type { Actor } from '../models/actor.model.js';
import { errors } from '../utils/app-error.js';
import { normalizeEmail, normalizeHost, isReservedHost } from '../utils/url.js';
import { randomToken, hashToken } from '../utils/crypto.js';
import { isDuplicateKey } from '../config/database.js';
import { AuthorizationService } from './authorization.service.js';
import { AuditService } from './audit.service.js';

export class WorkspaceService {
  constructor(
    private readonly workspaces: WorkspaceRepository,
    private readonly auth: AuthRepository,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
  ) {}
  list(userId: ObjectId) {
    return this.workspaces.listForUser(userId);
  }
  async create(userId: ObjectId, name: string) {
    const user = await this.auth.findUserById(userId);
    if (!user || !name.trim() || name.length > 80) throw errors.validation();
    const base =
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/^-+|-+$/g, '') || 'workspace';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const now = new Date();
        const workspace = await this.workspaces.createWorkspace({
          name: name.trim(),
          slug: attempt ? `${base}-${randomToken(6).toLowerCase()}` : base,
          plan: 'free',
          status: 'active',
          created_at: now,
          updated_at: now,
        });
        await this.workspaces.upsertMember({
          workspace_id: workspace._id,
          user_id: userId,
          role: 'owner',
          permissions: [],
          created_at: now,
          updated_at: now,
        });
        await this.audit.record(userId, 'workspace.created', 'workspace', workspace._id.toHexString(), workspace._id);
        return workspace;
      } catch (error) {
        if (!isDuplicateKey(error)) throw error;
      }
    }
    throw errors.conflict();
  }
  get(actor: Actor, workspaceId: ObjectId) {
    return this.authorization.workspace(actor, workspaceId, 'workspace:read');
  }
  async update(actor: Actor, workspaceId: ObjectId, name: string) {
    await this.authorization.workspace(actor, workspaceId, 'workspace:admin');
    const workspace = await this.workspaces.findWorkspace(workspaceId);
    if (!workspace || !name.trim() || name.trim().length > 80) throw errors.validation();
    workspace.name = name.trim();
    workspace.updated_at = new Date();
    await this.workspaces.updateWorkspace(workspace);
    await this.audit.record(actor.user._id, 'workspace.updated', 'workspace', workspace._id.toHexString(), workspace._id);
    return workspace;
  }
  async listMembers(actor: Actor, workspaceId: ObjectId) {
    await this.authorization.workspace(actor, workspaceId, 'workspace:read');
    const members = await this.workspaces.listMembers(workspaceId);
    return Promise.all(
      members.map(async (member) => {
        const user = await this.auth.findUserById(member.user_id);
        return {
          ...member,
          user: user ? { _id: user._id, email: user.email, display_name: user.display_name, status: user.status } : undefined,
        };
      }),
    );
  }
  async addMember(actor: Actor, workspaceId: ObjectId, emailValue: string, role: 'owner' | 'admin' | 'editor' | 'analyst' | 'viewer') {
    await this.authorization.workspace(actor, workspaceId, 'workspace:admin');
    const user = await this.auth.findUserByEmail(normalizeEmail(emailValue));
    if (!user || user.status !== 'active' || !user.email_verified_at)
      throw errors.notFound('an active verified user with that email was not found');
    const now = new Date();
    try {
      await this.workspaces.upsertMember({
        workspace_id: workspaceId,
        user_id: user._id,
        role,
        permissions: [],
        created_at: now,
        updated_at: now,
      });
    } catch (error) {
      if (isDuplicateKey(error)) throw errors.conflict();
      throw error;
    }
    const member = await this.workspaces.findMember(workspaceId, user._id);
    if (!member) throw errors.notFound();
    await this.audit.record(actor.user._id, 'member.added', 'workspace_member', member._id.toHexString(), workspaceId);
    return member;
  }
  async updateMember(
    actor: Actor,
    workspaceId: ObjectId,
    userId: ObjectId,
    role: 'owner' | 'admin' | 'editor' | 'analyst' | 'viewer',
    permissions: string[],
  ) {
    await this.authorization.workspace(actor, workspaceId, 'workspace:admin');
    const member = await this.workspaces.findMember(workspaceId, userId);
    if (!member) throw errors.notFound();
    if (member.role === 'owner' && role !== 'owner') throw errors.forbidden('the workspace owner cannot be demoted');
    if (member.role !== 'owner' && role === 'owner') throw errors.forbidden('owner transfer is not supported');
    member.role = role;
    member.permissions = [...new Set(permissions.map((permission) => permission.trim()).filter(Boolean))];
    member.updated_at = new Date();
    await this.workspaces.updateMember(member);
    await this.audit.record(actor.user._id, 'member.updated', 'workspace_member', member._id.toHexString(), workspaceId);
    return member;
  }
  async removeMember(actor: Actor, workspaceId: ObjectId, userId: ObjectId) {
    await this.authorization.workspace(actor, workspaceId, 'workspace:admin');
    const member = await this.workspaces.findMember(workspaceId, userId);
    if (!member) throw errors.notFound();
    if (member.role === 'owner') throw errors.forbidden();
    await this.workspaces.deleteMember(member._id);
    await this.audit.record(actor.user._id, 'member.removed', 'workspace_member', member._id.toHexString(), workspaceId);
  }
  async createDomain(actor: Actor, workspaceId: ObjectId, hostnameValue: string) {
    await this.authorization.workspace(actor, workspaceId, 'workspace:admin');
    const hostname = normalizeHost(hostnameValue);
    if (isReservedHost(hostname) || hostname.includes('/')) throw errors.validation();
    const token = randomToken(24);
    const now = new Date();
    try {
      const domain = await this.workspaces.createDomain({
        workspace_id: workspaceId,
        hostname,
        kind: 'custom',
        status: 'pending',
        verification_token: hashToken(token),
        created_at: now,
        updated_at: now,
      });
      await this.audit.record(actor.user._id, 'domain.created', 'domain', domain._id.toHexString(), workspaceId);
      return { domain, token };
    } catch (error) {
      if (isDuplicateKey(error)) throw errors.conflict();
      throw error;
    }
  }
  async listDomains(actor: Actor, workspaceId: ObjectId) {
    await this.authorization.workspace(actor, workspaceId, 'workspace:read');
    return this.workspaces.listDomains(workspaceId);
  }
  async verifyDomain(actor: Actor, domainId: ObjectId, token: string) {
    const domain = await this.workspaces.findDomain(domainId);
    if (!domain) throw errors.notFound();
    await this.authorization.workspace(actor, domain.workspace_id, 'workspace:admin');
    if (hashToken(token) !== domain.verification_token) throw errors.forbidden();
    domain.status = 'active';
    domain.verified_at = new Date();
    domain.verification_token = undefined;
    domain.updated_at = new Date();
    await this.workspaces.updateDomain(domain);
    await this.audit.record(actor.user._id, 'domain.verified', 'domain', domain._id.toHexString(), domain.workspace_id);
    return domain;
  }
  async deleteDomain(actor: Actor, domainId: ObjectId) {
    const domain = await this.workspaces.findDomain(domainId);
    if (!domain) throw errors.notFound();
    await this.authorization.workspace(actor, domain.workspace_id, 'workspace:admin');
    await this.workspaces.deleteDomain(domainId);
    await this.audit.record(actor.user._id, 'domain.deleted', 'domain', domainId.toHexString(), domain.workspace_id);
  }
}
