import type { ObjectId } from 'mongodb';
import type { BaseDocument } from './base.model.js';

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'analyst' | 'viewer';

export type MemberDocument = BaseDocument & {
  workspace_id: ObjectId;
  user_id: ObjectId;
  role: WorkspaceRole;
  permissions: string[];
};
