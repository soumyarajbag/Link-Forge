import type { ObjectId } from 'mongodb';
import type { BaseDocument } from './base.model.js';

export type BlockedDestinationDocument = BaseDocument & {
  pattern: string;
  reason?: string;
  created_by: ObjectId;
};
