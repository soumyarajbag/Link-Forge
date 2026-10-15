import type { ObjectId } from 'mongodb';
import type { BaseDocument } from './base.model.js';

export type DomainDocument = BaseDocument & {
  workspace_id: ObjectId;
  hostname: string;
  kind: 'platform' | 'custom';
  status: 'pending' | 'active' | 'disabled';
  verification_token?: string;
  verified_at?: Date;
};
