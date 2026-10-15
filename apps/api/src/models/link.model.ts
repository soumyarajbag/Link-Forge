import type { ObjectId } from 'mongodb';
import type { BaseDocument } from './base.model.js';

export type RoutingRule = {
  id: string;
  priority: number;
  country_codes?: string[];
  device_classes?: string[];
  os_names?: string[];
  language_codes?: string[];
  destination: string;
  enabled: boolean;
};

export type LinkState = 'active' | 'paused' | 'expired' | 'quarantined' | 'deleted';
export type RedirectStatus = 301 | 302 | 307 | 308;

export type LinkDocument = BaseDocument & {
  workspace_id: ObjectId;
  domain_id?: ObjectId;
  hostname: string;
  slug: string;
  destination_url: string;
  redirect_status: RedirectStatus;
  state: LinkState;
  title?: string;
  description?: string;
  tags: string[];
  folder?: string;
  campaign?: string;
  expires_at?: Date;
  max_clicks: number;
  click_count: number;
  routing_rules: RoutingRule[];
  password_hash?: string;
  qr: { foreground: string; background: string; size: number };
  created_by: ObjectId;
  last_clicked_at?: Date;
  deleted_at?: Date;
};
