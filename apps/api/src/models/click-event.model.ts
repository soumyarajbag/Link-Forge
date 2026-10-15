import type { ObjectId } from 'mongodb';
import type { BaseDocument } from './base.model.js';

export type ClickEventDocument = BaseDocument & {
  link_id: ObjectId;
  workspace_id: ObjectId;
  domain_id?: ObjectId;
  occurred_at: Date;
  event_type: 'redirect' | 'qr_scan';
  unique_key: string;
  is_unique: boolean;
  bot_class: string;
  country?: string;
  device_class?: string;
  os?: string;
  browser?: string;
  language?: string;
  referrer_host?: string;
  retention_until: Date;
};
