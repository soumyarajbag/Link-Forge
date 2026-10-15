import type { ObjectId } from 'mongodb';
import type { BaseDocument } from './base.model.js';

export type ApiKeyDocument = BaseDocument & {
  workspace_id: ObjectId;
  created_by: ObjectId;
  name: string;
  prefix: string;
  secret_hash: string;
  scopes: string[];
  expires_at?: Date;
  last_used_at?: Date;
  revoked_at?: Date;
};
