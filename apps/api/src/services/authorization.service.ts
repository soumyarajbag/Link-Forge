import { ObjectId } from 'mongodb';
import { errors } from '../utils/app-error.js';
import type { Actor } from '../models/actor.model.js';
import type { MemberDocument } from '../models/member.model.js';
import type { WorkspaceDocument } from '../models/workspace.model.js';
import type { WorkspaceRepository } from '../repositories/workspace.repository.js';

export class AuthorizationService {
  constructor(private readonly workspaces: WorkspaceRepository) {}

  async workspace(
    actor: Actor,
    workspaceId: ObjectId,
    permission: string,
  ): Promise<{ workspace: WorkspaceDocument; member: MemberDocument }> {
    const workspace = await this.workspaces.findWorkspace(workspaceId);
    if (!workspace) throw errors.notFound();
    if (workspace.status !== 'active') throw errors.forbidden();
    if (actor.apiKey) {
      if (!actor.workspaceId?.equals(workspaceId) || !scopeAllows(actor.apiKey.scopes, permission)) throw errors.forbidden();
      return {
        workspace,
        member: {
          _id: new ObjectId(),
          workspace_id: workspaceId,
          user_id: actor.user._id,
          role: 'admin',
          permissions: [],
          created_at: new Date(),
        },
      };
    }
    const member = await this.workspaces.findMember(workspaceId, actor.user._id);
    if (!member || !userCan(member, permission)) throw errors.forbidden();
    return { workspace, member };
  }

  requirePlatformAdmin(actor: Actor): void {
    if (!actor.user.is_platform_admin) throw errors.forbidden();
  }
}

function userCan(member: MemberDocument, permission: string): boolean {
  if (member.role === 'owner' || member.role === 'admin') return true;
  if (permission === 'workspace:read' && ['editor', 'analyst', 'viewer'].includes(member.role)) return true;
  if (permission === 'link:read' && Boolean(member.role)) return true;
  if (permission === 'analytics:read' && ['editor', 'analyst', 'viewer'].includes(member.role)) return true;
  if (permission === 'link:write' && member.role === 'editor') return true;
  return member.permissions.includes(permission);
}

function scopeAllows(scopes: string[], permission: string): boolean {
  return (
    scopes.length === 0 ||
    scopes.includes('*') ||
    scopes.includes(permission) ||
    (permission === 'link:read' && scopes.includes('links:read')) ||
    (permission === 'link:write' && scopes.includes('links:write'))
  );
}
