export type LinkState = 'active' | 'paused' | 'expired' | 'quarantined' | 'deleted';

export type LinkItem = {
  id: string;
  slug: string;
  hostname: string;
  destination_url: string;
  title?: string;
  description?: string;
  state: LinkState;
  click_count: number;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  tags?: string[];
  campaign?: string;
};

export type Workspace = { id: string; name: string; slug: string; plan: string; status: string };
export type User = { id: string; email: string; display_name: string; status: string; is_platform_admin: boolean };
export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'analyst' | 'viewer';
  permissions: string[];
  user?: { id: string; email: string; display_name: string; status: string };
};
export type WorkspaceInvitation = {
  id: string;
  workspace_id: string;
  email: string;
  role: 'admin' | 'editor' | 'analyst' | 'viewer';
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  invited_by: string;
  expires_at: string;
};
export type ApiKey = {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  prefix: string;
  scopes: string[];
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
};

export type AnalyticsSummary = {
  clicks: number;
  unique_clicks: number;
  by_day: Array<{ date: string; clicks: number }>;
  by_country: Array<{ name: string; count: number }>;
  by_device: Array<{ name: string; count: number }>;
  by_referrer: Array<{ name: string; count: number }>;
};

export type AdminOverview = {
  users: number;
  workspaces: number;
  links: number;
  click_events: number;
  abuse_reports: number;
};

export type AdminUser = User & {
  email_verified_at?: string;
  created_at: string;
  updated_at?: string;
};

export type AdminWorkspace = Workspace & {
  created_at: string;
  updated_at?: string;
};

export type AdminLink = LinkItem & {
  workspace_id: string;
  created_by: string;
  redirect_status: number;
};

export type AuditLog = {
  id: string;
  actor_id: string;
  workspace_id?: string;
  action: string;
  resource: string;
  resource_id: string;
  request_id?: string;
  metadata?: Record<string, unknown>;
  actor?: { display_name: string; email: string };
  workspace?: { name: string; slug: string };
  created_at: string;
};

export type AbuseReport = {
  id: string;
  link_id: string;
  reason: string;
  details?: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
  updated_at?: string;
};

export type BlockedDestination = {
  id: string;
  pattern: string;
  reason?: string;
  created_by: string;
  created_at: string;
};
