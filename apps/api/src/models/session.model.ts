import type { ObjectId } from 'mongodb';
import type { BaseDocument } from './base.model.js';

export type SessionDocument = BaseDocument & {
  user_id: ObjectId;
  token_hash: string;
  family_id: string;
  device_label?: string;
  user_agent?: string;
  ip_hash?: string;
  last_used_at: Date;
  expires_at: Date;
  revoked_at?: Date;
};
