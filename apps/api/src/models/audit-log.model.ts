import type { ObjectId } from 'mongodb';
import type { BaseDocument } from './base.model.js';

export type AuditLogDocument = BaseDocument & {
  actor_id: ObjectId;
  workspace_id?: ObjectId;
  action: string;
  resource: string;
  resource_id: string;
  request_id?: string;
  metadata?: Record<string, unknown>;
};
