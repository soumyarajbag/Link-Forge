import { ObjectId } from 'mongodb';
import type { ApiKeyRepository } from '../repositories/api-key.repository.js';
import type { Actor } from '../models/actor.model.js';
import { AuthorizationService } from './authorization.service.js';
import { AuditService } from './audit.service.js';
import { errors } from '../utils/app-error.js';
import { hashToken, randomToken } from '../utils/crypto.js';

export class ApiKeyService {
  constructor(
    private readonly keys: ApiKeyRepository,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
  ) {}
  async create(actor: Actor, workspaceId: ObjectId, name: string, scopes: string[], expiresAt?: Date) {
    await this.authorization.workspace(actor, workspaceId, 'workspace:admin');
    if (!name.trim() || name.length > 80) throw errors.validation();
    const prefix = randomToken(6);
    const secret = `lf_${prefix}_${randomToken(32)}`;
    const key = await this.keys.create({
      workspace_id: workspaceId,
      created_by: actor.user._id,
      name: name.trim(),
      prefix: `lf_${prefix}`,
      secret_hash: hashToken(secret),
      scopes: [...new Set(scopes.map((scope) => scope.trim()).filter(Boolean))],
      expires_at: expiresAt,
      created_at: new Date(),
    });
    await this.audit.record(actor.user._id, 'api_key.created', 'api_key', key._id.toHexString(), workspaceId);
    return { key, secret };
  }
  list(actor: Actor, workspaceId: ObjectId) {
    return this.authorization.workspace(actor, workspaceId, 'workspace:admin').then(() => this.keys.list(workspaceId));
  }
  async revoke(actor: Actor, workspaceId: ObjectId, keyId: ObjectId) {
    await this.authorization.workspace(actor, workspaceId, 'workspace:admin');
    const keys = await this.keys.list(workspaceId);
    if (!keys.some((key) => key._id.equals(keyId))) throw errors.notFound();
    await this.keys.revoke(keyId);
    await this.audit.record(actor.user._id, 'api_key.revoked', 'api_key', keyId.toHexString(), workspaceId);
  }
}
