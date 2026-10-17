import { ObjectId } from 'mongodb';
import type { AdminRepository } from '../repositories/admin.repository.js';

export class AuditService {
  constructor(private readonly admin: AdminRepository) {}
  async record(
    actorId: ObjectId,
    action: string,
    resource: string,
    resourceId: string,
    workspaceId?: ObjectId,
    requestId?: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.admin.createAudit({
      actor_id: actorId,
      workspace_id: workspaceId,
      action,
      resource,
      resource_id: resourceId,
      request_id: requestId,
      metadata,
      created_at: new Date(),
    });
  }
}
