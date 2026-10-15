import type { ObjectId } from 'mongodb';
import type { BaseDocument } from './base.model.js';

export type AbuseReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export type AbuseReportDocument = BaseDocument & {
  link_id: ObjectId;
  reason: string;
  details?: string;
  status: AbuseReportStatus;
};
