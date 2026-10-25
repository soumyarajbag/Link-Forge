'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Activity,
  Ban,
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Link2,
  Loader2,
  MousePointerClick,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiMutation, apiRequest, ApiError, shortURL } from '@/lib/api';
import type { AbuseReport, AdminLink, AdminOverview, AdminUser, AdminWorkspace, AuditLog, BlockedDestination } from '@/lib/types';
import { useDashboardContext } from './dashboard-shell';

type AdminTab = 'overview' | 'users' | 'workspaces' | 'links' | 'activity' | 'moderation';
type StatusVariant = 'secondary' | 'success' | 'warning' | 'destructive' | 'purple' | 'info';

const PAGE_SIZE = 20;
const tabs: Array<{ id: AdminTab; label: string; icon: LucideIcon }> = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'workspaces', label: 'Workspaces', icon: Building2 },
  { id: 'links', label: 'All links', icon: Link2 },
  { id: 'activity', label: 'Audit activity', icon: ShieldCheck },
  { id: 'moderation', label: 'Moderation', icon: ShieldAlert },
];

export function PlatformAdminView() {
  const { user } = useDashboardContext();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [links, setLinks] = useState<AdminLink[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [blockedDestinations, setBlockedDestinations] = useState<BlockedDestination[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [linkState, setLinkState] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user.is_platform_admin) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError('');

    async function load() {
      const searchParams = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (query) searchParams.set('search', query);

      if (tab === 'overview') {
        const [counts, recentActivity, recentReports] = await Promise.all([
          apiRequest<AdminOverview>('/v1/admin/overview'),
          apiRequest<{ audit_logs: AuditLog[]; total: number }>('/v1/admin/audit-logs?page=1&page_size=8'),
          apiRequest<{ reports: AbuseReport[]; total: number }>('/v1/admin/abuse-reports?page=1&page_size=5'),
        ]);
        if (!mounted) return;
        setOverview(counts);
        setAuditLogs(recentActivity.audit_logs);
        setReports(recentReports.reports);
        setTotal(0);
        return;
      }

      if (tab === 'users') {
        const data = await apiRequest<{ users: AdminUser[]; total: number }>(`/v1/admin/users?${searchParams}`);
        if (!mounted) return;
        setUsers(data.users);
        setTotal(data.total);
        return;
      }

      if (tab === 'workspaces') {
        const data = await apiRequest<{ workspaces: AdminWorkspace[]; total: number }>(`/v1/admin/workspaces?${searchParams}`);
        if (!mounted) return;
        setWorkspaces(data.workspaces);
        setTotal(data.total);
        return;
      }

      if (tab === 'links') {
        if (linkState) searchParams.set('state', linkState);
        const data = await apiRequest<{ links: AdminLink[]; total: number }>(`/v1/admin/links?${searchParams}`);
        if (!mounted) return;
        setLinks(data.links);
        setTotal(data.total);
        return;
      }

      if (tab === 'activity') {
        const data = await apiRequest<{ audit_logs: AuditLog[]; total: number }>(`/v1/admin/audit-logs?${searchParams}`);
        if (!mounted) return;
        setAuditLogs(data.audit_logs);
        setTotal(data.total);
        return;
      }

      const [reportData, blockedData] = await Promise.all([
        apiRequest<{ reports: AbuseReport[]; total: number }>(`/v1/admin/abuse-reports?${searchParams}`),
        apiRequest<{ blocked_destinations: BlockedDestination[] }>('/v1/admin/blocked-destinations'),
      ]);
      if (!mounted) return;
      setReports(reportData.reports);
      setBlockedDestinations(blockedData.blocked_destinations);
      setTotal(reportData.total);
    }

    load()
      .catch((cause: unknown) => {
        if (!mounted) return;
        setError(cause instanceof ApiError ? cause.message : 'Unable to load platform administration data.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [linkState, page, query, refreshKey, tab, user.is_platform_admin]);

  function selectTab(next: AdminTab) {
    setTab(next);
    setPage(1);
    setSearch('');
    setQuery('');
    setLinkState('');
    setError('');
    setMessage('');
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuery(search.trim());
  }

  async function quarantine(link: AdminLink) {
    if (!window.confirm(`Quarantine ${link.hostname}/${link.slug}? It will stop redirecting immediately.`)) return;
    setActionId(link.id);
    setError('');
    setMessage('');
    try {
      await apiMutation(`/v1/admin/links/${link.id}/quarantine`);
      setMessage(`/${link.slug} has been quarantined.`);
      setRefreshKey((value) => value + 1);
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to quarantine this link.');
    } finally {
      setActionId('');
    }
  }

  async function updateReport(report: AbuseReport, status: AbuseReport['status']) {
    setActionId(report.id);
    setError('');
    setMessage('');
    try {
      await apiMutation(`/v1/admin/abuse-reports/${report.id}`, { status }, 'PATCH');
      setReports((current) => current.map((item) => (item.id === report.id ? { ...item, status } : item)));
      setMessage('Abuse report status updated.');
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to update the abuse report.');
    } finally {
      setActionId('');
    }
  }

  if (!user.is_platform_admin) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-5 text-2xl font-semibold">Platform administrator access required</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Your account is authenticated, but it does not have the platform administrator flag.
        </p>
      </Card>
    );
  }

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="purple">
              <ShieldCheck className="mr-1 h-3 w-3" /> Platform administrator
            </Badge>
          </div>
          <h1 className="gradient-text text-3xl font-semibold tracking-[-.055em] md:text-4xl">Platform control center</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Monitor every user, workspace, link, security event, and moderation signal across LinkForge.
          </p>
        </div>
        <Button variant="outline" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
          Refresh data
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-card/70 p-1.5 shadow-sm backdrop-blur-xl">
        {tabs.map((item) => {
          const TabIcon = item.icon;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => selectTab(item.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${tab === item.id ? 'bg-foreground text-background shadow-md' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
            >
              <TabIcon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}

      {(['users', 'workspaces', 'links'] as AdminTab[]).includes(tab) && (
        <form onSubmit={submitSearch} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tab === 'users' ? 'Search name or email' : tab === 'workspaces' ? 'Search name or slug' : 'Search links'}
              className="bg-card/80 pl-10"
            />
          </div>
          {tab === 'links' && (
            <select
              value={linkState}
              onChange={(event) => {
                setLinkState(event.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-input bg-card/80 px-3.5 text-sm outline-none focus:ring-4 focus:ring-ring/15"
            >
              <option value="">All states</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="expired">Expired</option>
              <option value="quarantined">Quarantined</option>
              <option value="deleted">Deleted</option>
            </select>
          )}
          <Button type="submit">Search</Button>
        </form>
      )}

      {loading ? (
        <LoadingPanel />
      ) : tab === 'overview' ? (
        <OverviewPanel overview={overview} auditLogs={auditLogs} reports={reports} onNavigate={selectTab} />
      ) : tab === 'users' ? (
        <UsersPanel users={users} />
      ) : tab === 'workspaces' ? (
        <WorkspacesPanel workspaces={workspaces} />
      ) : tab === 'links' ? (
        <LinksPanel links={links} actionId={actionId} onQuarantine={quarantine} />
      ) : tab === 'activity' ? (
        <ActivityPanel logs={auditLogs} />
      ) : (
        <ModerationPanel
          reports={reports}
          blockedDestinations={blockedDestinations}
          actionId={actionId}
          onUpdateReport={updateReport}
          onChanged={() => setRefreshKey((value) => value + 1)}
          setError={setError}
          setMessage={setMessage}
          setActionId={setActionId}
        />
      )}

      {tab !== 'overview' && (
        <Pagination
          page={page}
          total={total}
          onPage={setPage}
          noun={tab === 'activity' ? 'events' : tab === 'moderation' ? 'reports' : tab}
        />
      )}
    </div>
  );
}

function OverviewPanel({
  overview,
  auditLogs,
  reports,
  onNavigate,
}: {
  overview: AdminOverview | null;
  auditLogs: AuditLog[];
  reports: AbuseReport[];
  onNavigate: (tab: AdminTab) => void;
}) {
  const cards: Array<{ label: string; value: number; icon: LucideIcon; tone: string; tab: AdminTab }> = [
    { label: 'Users', value: overview?.users || 0, icon: Users, tone: 'from-coral-50 to-orange-50 text-coral-600', tab: 'users' },
    {
      label: 'Workspaces',
      value: overview?.workspaces || 0,
      icon: Building2,
      tone: 'from-lilac/70 to-violet-50 text-violet-700',
      tab: 'workspaces',
    },
    { label: 'Links', value: overview?.links || 0, icon: Link2, tone: 'from-sky to-cyan-50 text-sky-700', tab: 'links' },
    {
      label: 'Click events',
      value: overview?.click_events || 0,
      icon: MousePointerClick,
      tone: 'from-mint to-emerald-50 text-emerald-700',
      tab: 'links',
    },
    {
      label: 'Abuse reports',
      value: overview?.abuse_reports || 0,
      icon: ShieldAlert,
      tone: 'from-amber-50 to-orange-50 text-amber-700',
      tab: 'moderation',
    },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((item) => {
          const CardIcon = item.icon;
          return (
            <button key={item.label} type="button" onClick={() => onNavigate(item.tab)} className="text-left">
              <Card className="h-full p-5 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lift">
                <span className={`grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br ${item.tone}`}>
                  <CardIcon className="h-5 w-5" />
                </span>
                <p className="mt-5 text-3xl font-semibold tracking-[-.055em]">{item.value.toLocaleString()}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
              </Card>
            </button>
          );
        })}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent platform activity</CardTitle>
            <CardDescription>Latest security and business events across every workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityRows logs={auditLogs.slice(0, 8)} />
            <Button variant="ghost" className="mt-4 px-0" onClick={() => onNavigate('activity')}>
              View complete audit log <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Moderation queue</CardTitle>
            <CardDescription>Recent reports requiring a platform-level decision.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {reports.length ? (
              reports.map((report) => (
                <div key={report.id} className="rounded-2xl border border-border/70 bg-background/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold">{report.reason}</p>
                    <StatusBadge value={report.status} />
                  </div>
                  <p className="mt-2 truncate text-xs text-muted-foreground">Link {report.link_id}</p>
                </div>
              ))
            ) : (
              <EmptyState icon={ShieldCheck} text="No abuse reports have been submitted." />
            )}
            <Button variant="outline" className="w-full" onClick={() => onNavigate('moderation')}>
              Open moderation center
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UsersPanel({ users }: { users: AdminUser[] }) {
  return (
    <TableCard title="All platform users" detail="Account status, verification, and platform administrator access.">
      <table className="w-full min-w-[760px] text-left">
        <TableHead columns={['User', 'Status', 'Email verification', 'Access', 'Joined']} />
        <tbody className="divide-y divide-border/70">
          {users.map((item) => (
            <tr key={item.id} className="transition-colors hover:bg-secondary/25">
              <td className="px-5 py-4">
                <p className="text-sm font-semibold">{item.display_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.email}</p>
              </td>
              <td className="px-5 py-4">
                <StatusBadge value={item.status} />
              </td>
              <td className="px-5 py-4 text-xs text-muted-foreground">
                {item.email_verified_at ? formatDate(item.email_verified_at) : 'Pending verification'}
              </td>
              <td className="px-5 py-4">
                {item.is_platform_admin ? <Badge variant="purple">Platform admin</Badge> : <Badge variant="secondary">User</Badge>}
              </td>
              <td className="px-5 py-4 text-xs text-muted-foreground">{formatDate(item.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!users.length && <EmptyState icon={Users} text="No users match this search." />}
    </TableCard>
  );
}

function WorkspacesPanel({ workspaces }: { workspaces: AdminWorkspace[] }) {
  return (
    <TableCard title="All workspaces" detail="Every active or suspended workspace registered on the platform.">
      <table className="w-full min-w-[680px] text-left">
        <TableHead columns={['Workspace', 'Plan', 'Status', 'Workspace ID', 'Created']} />
        <tbody className="divide-y divide-border/70">
          {workspaces.map((item) => (
            <tr key={item.id} className="transition-colors hover:bg-secondary/25">
              <td className="px-5 py-4">
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">/{item.slug}</p>
              </td>
              <td className="px-5 py-4">
                <Badge variant="info">{item.plan}</Badge>
              </td>
              <td className="px-5 py-4">
                <StatusBadge value={item.status} />
              </td>
              <td className="px-5 py-4 font-mono text-[11px] text-muted-foreground">{item.id}</td>
              <td className="px-5 py-4 text-xs text-muted-foreground">{formatDate(item.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!workspaces.length && <EmptyState icon={Building2} text="No workspaces match this search." />}
    </TableCard>
  );
}

function LinksPanel({ links, actionId, onQuarantine }: { links: AdminLink[]; actionId: string; onQuarantine: (link: AdminLink) => void }) {
  return (
    <TableCard title="All platform links" detail="Inspect links from every workspace and quarantine unsafe destinations.">
      <table className="w-full min-w-[980px] text-left">
        <TableHead columns={['Short link', 'Destination', 'Workspace', 'Clicks', 'State', 'Created', '']} />
        <tbody className="divide-y divide-border/70">
          {links.map((item) => (
            <tr key={item.id} className="transition-colors hover:bg-secondary/25">
              <td className="px-5 py-4">
                <p className="max-w-48 truncate text-sm font-semibold">{item.title || `/${item.slug}`}</p>
                <a
                  href={shortURL(item.slug, item.hostname)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex max-w-56 items-center gap-1 truncate text-xs text-primary hover:underline"
                >
                  {item.hostname}/{item.slug} <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </td>
              <td className="px-5 py-4">
                <p className="max-w-72 truncate text-xs text-muted-foreground">{item.destination_url}</p>
              </td>
              <td className="px-5 py-4 font-mono text-[11px] text-muted-foreground">{item.workspace_id}</td>
              <td className="px-5 py-4 text-sm font-semibold">{item.click_count.toLocaleString()}</td>
              <td className="px-5 py-4">
                <StatusBadge value={item.state} />
              </td>
              <td className="px-5 py-4 text-xs text-muted-foreground">{formatDate(item.created_at)}</td>
              <td className="px-5 py-4 text-right">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionId === item.id || item.state === 'quarantined' || item.state === 'deleted'}
                  onClick={() => onQuarantine(item)}
                >
                  {actionId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                  Quarantine
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!links.length && <EmptyState icon={Link2} text="No links match the selected filters." />}
    </TableCard>
  );
}

function ActivityPanel({ logs }: { logs: AuditLog[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform audit activity</CardTitle>
        <CardDescription>Immutable business and security events recorded by the backend.</CardDescription>
      </CardHeader>
      <CardContent>
        <ActivityRows logs={logs} />
      </CardContent>
    </Card>
  );
}

function ActivityRows({ logs }: { logs: AuditLog[] }) {
  if (!logs.length) return <EmptyState icon={Activity} text="No audit activity has been recorded yet." />;
  return (
    <div className="divide-y divide-border/70">
      {logs.map((item) => (
        <div key={item.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-secondary to-accent text-sm font-bold text-secondary-foreground">
            {auditActorName(item).slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              <span className="text-foreground">{auditActorName(item)}</span>{' '}
              <span className="font-medium text-foreground/75">{auditOperation(item.action)}</span>
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{auditContext(item)}</p>
          </div>
          <p className="shrink-0 text-left text-xs text-muted-foreground sm:text-right">{formatDateTime(item.created_at)}</p>
        </div>
      ))}
    </div>
  );
}

function ModerationPanel({
  reports,
  blockedDestinations,
  actionId,
  onUpdateReport,
  onChanged,
  setError,
  setMessage,
  setActionId,
}: {
  reports: AbuseReport[];
  blockedDestinations: BlockedDestination[];
  actionId: string;
  onUpdateReport: (report: AbuseReport, status: AbuseReport['status']) => void;
  onChanged: () => void;
  setError: (value: string) => void;
  setMessage: (value: string) => void;
  setActionId: (value: string) => void;
}) {
  const [pattern, setPattern] = useState('');
  const [reason, setReason] = useState('');

  async function blockDestination(event: FormEvent) {
    event.preventDefault();
    if (!pattern.trim()) return;
    setActionId('block');
    setError('');
    setMessage('');
    try {
      await apiMutation('/v1/admin/blocked-destinations', { pattern: pattern.trim(), reason: reason.trim() });
      setPattern('');
      setReason('');
      setMessage('Destination pattern added to the platform blocklist.');
      onChanged();
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to block this destination pattern.');
    } finally {
      setActionId('');
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
      <Card>
        <CardHeader>
          <CardTitle>Abuse reports</CardTitle>
          <CardDescription>Review user-submitted safety reports and track their resolution.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{report.reason}</p>
                    <StatusBadge value={report.status} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{report.details || 'No additional details were provided.'}</p>
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">Link {report.link_id}</p>
                </div>
                <select
                  aria-label="Update abuse report status"
                  disabled={actionId === report.id}
                  value={report.status}
                  onChange={(event) => onUpdateReport(report, event.target.value as AbuseReport['status'])}
                  className="h-10 rounded-xl border border-input bg-card px-3 text-xs font-semibold outline-none focus:ring-4 focus:ring-ring/15"
                >
                  <option value="open">Open</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
            </div>
          ))}
          {!reports.length && <EmptyState icon={ShieldCheck} text="There are no abuse reports in this page." />}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Blocked destinations</CardTitle>
          <CardDescription>Prevent matching destinations from being added or updated.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={blockDestination} className="space-y-3 rounded-2xl border border-border/70 bg-secondary/25 p-4">
            <Input value={pattern} onChange={(event) => setPattern(event.target.value)} placeholder="malicious.example" />
            <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason (optional)" />
            <Button type="submit" className="w-full" disabled={!pattern.trim() || actionId === 'block'}>
              {actionId === 'block' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Block destination
            </Button>
          </form>
          <div className="mt-5 space-y-2">
            {blockedDestinations.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/60 px-3 py-3">
                <p className="break-all font-mono text-xs font-semibold">{item.pattern}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.reason || 'No reason provided'}</p>
              </div>
            ))}
            {!blockedDestinations.length && <p className="py-6 text-center text-sm text-muted-foreground">The blocklist is empty.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TableCard({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{detail}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">{children}</div>
      </CardContent>
    </Card>
  );
}

function TableHead({ columns }: { columns: string[] }) {
  return (
    <thead className="border-y border-border/70 bg-secondary/35 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">
      <tr>
        {columns.map((column, index) => (
          <th key={`${column}-${index}`} className="px-5 py-3">
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function Pagination({ page, total, onPage, noun }: { page: number; total: number; onPage: (page: number) => void; noun: string }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        {total.toLocaleString()} {noun} · page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const variant: StatusVariant =
    value === 'active' || value === 'resolved'
      ? 'success'
      : value === 'pending' || value === 'paused' || value === 'reviewing' || value === 'open'
        ? 'warning'
        : value === 'quarantined' || value === 'suspended' || value === 'deleted'
          ? 'destructive'
          : value === 'dismissed'
            ? 'secondary'
            : 'info';
  return (
    <Badge variant={variant} className="capitalize">
      {value.replaceAll('_', ' ')}
    </Badge>
  );
}

function EmptyState({ icon: EmptyIcon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="grid min-h-36 place-items-center p-6 text-center">
      <div>
        <EmptyIcon className="mx-auto h-7 w-7 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="grid min-h-80 place-items-center rounded-3xl border border-border/70 bg-card/70">
      <div className="text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-primary" /> Loading platform data…
      </div>
    </div>
  );
}

function Notice({ children, tone }: { children: React.ReactNode; tone: 'error' | 'success' }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-2xl border px-4 py-3 text-sm ${tone === 'error' ? 'border-destructive/20 bg-destructive/10 text-destructive' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
    >
      {children}
    </div>
  );
}

function auditActorName(item: AuditLog) {
  return item.actor?.display_name || item.actor?.email || 'A deleted user';
}

function auditOperation(action: string) {
  const operations: Record<string, string> = {
    'workspace.created': 'created a workspace',
    'workspace.updated': 'updated the workspace profile',
    'workspace.invitation.created': 'invited someone to the workspace',
    'workspace.invitation.accepted': 'accepted a workspace invitation',
    'workspace.invitation.revoked': 'revoked a workspace invitation',
    'member.added': 'added a workspace member',
    'member.updated': "changed a member's role or permissions",
    'member.removed': 'removed a workspace member',
    'domain.created': 'added a custom domain',
    'domain.verified': 'verified a custom domain',
    'domain.deleted': 'removed a custom domain',
    'link.created': 'created a short link',
    'link.updated': 'updated a short link',
    'link.deleted': 'deleted a short link',
    'link.quarantined': 'quarantined a short link',
    'api_key.created': 'created an API key',
    'api_key.revoked': 'revoked an API key',
    'destination.blocked': 'blocked a destination pattern',
    'abuse_report.updated': 'updated an abuse report',
  };
  return operations[action] || 'performed an administrative action';
}

function auditContext(item: AuditLog) {
  const context: string[] = [];
  if (item.workspace?.name) context.push(item.workspace.name);
  if (item.actor?.email && item.actor.email !== item.actor.display_name) context.push(item.actor.email);
  return context.length ? context.join(' · ') : 'Platform-wide activity';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
