'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiMutation, apiRequest } from '@/lib/api';
import type { LinkItem } from '@/lib/types';
import { Icon } from '@/components/icons';
import { CreateLinkDialog } from './dashboard-create-link-dialog';
import { LinkTable } from './dashboard-link-table';
import { StatCard } from './dashboard-stat-card';
import { Badge, Button, SectionLabel } from '@/components/ui';
import { useDashboardContext } from './dashboard-shell';
import { AppLoader } from '@/components/app-loader';

export function DashboardOverview() {
  const { workspace, user } = useDashboardContext();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingLinkId, setPendingLinkId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    apiRequest<{ links: LinkItem[] }>(`/v1/workspaces/${workspace.id}/links?page_size=100`)
      .then((data) => {
        if (mounted) setLinks(data.links);
      })
      .catch((cause: unknown) => {
        if (mounted) setError(cause instanceof Error ? cause.message : 'Unable to load links.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [workspace.id]);

  const totalClicks = links.reduce((sum, link) => sum + link.click_count, 0);
  const activeCount = links.filter((link) => link.state === 'active').length;
  const activity = useMemo(
    () =>
      links
        .slice()
        .sort((left, right) => right.click_count - left.click_count)
        .slice(0, 7),
    [links],
  );
  const maxClicks = Math.max(1, ...activity.map((link) => link.click_count));

  function addLink(link: LinkItem) {
    setLinks((current) => [link, ...current]);
  }

  async function togglePause(id: string) {
    const current = links.find((link) => link.id === id);
    if (!current) return;
    setPendingLinkId(id);
    const nextState = current.state === 'paused' ? 'active' : 'paused';
    setLinks((items) => items.map((link) => (link.id === id ? { ...link, state: nextState } : link)));
    try {
      await apiMutation(`/v1/links/${id}`, { state: nextState }, 'PATCH');
    } catch (cause: unknown) {
      setLinks((items) => items.map((link) => (link.id === id ? { ...link, state: current.state } : link)));
      setError(cause instanceof Error ? cause.message : 'Unable to update the link.');
    } finally {
      setPendingLinkId('');
    }
  }

  return (
    <div className="animate-slide-up">
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-ink/40">
            <span className="h-1.5 w-1.5 rounded-full bg-[#47B77A]" /> Welcome back, {user.display_name}
          </div>
          <h1 className="gradient-text text-3xl font-semibold tracking-[-.06em] md:text-4xl">Make today count.</h1>
          <p className="mt-2 text-sm text-ink/45">Here&apos;s the pulse of {workspace.name.toLowerCase()}.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="green">Live data</Badge>
          <Button onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={16} /> New link
          </Button>
        </div>
      </div>
      {error && <div className="mb-5 rounded-2xl border border-coral/20 bg-coral-50 px-4 py-3 text-sm text-coral-600">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total clicks" value={totalClicks.toLocaleString()} change="Live" tone="coral" icon="click" />
        <StatCard label="Active links" value={String(activeCount).padStart(2, '0')} change="Live" tone="mint" icon="link" />
        <StatCard label="Unique visitors" value="—" change="Analytics" tone="lilac" icon="users" />
        <StatCard label="Top location" value="—" change="Analytics" tone="sky" icon="globe" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.36fr_.64fr]">
        <div className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-soft backdrop-blur-xl">
          <div className="mb-7 flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold">Click activity</p>
              <p className="mt-1 text-xs text-ink/40">Current click totals by link.</p>
            </div>
            <Link
              href="/dashboard/analytics"
              className="rounded-xl border border-ink/10 px-3 py-2 text-xs font-semibold text-ink/55 transition hover:border-ink/20 hover:text-ink"
            >
              Full analytics <Icon name="arrow" size={13} />
            </Link>
          </div>
          {loading ? (
            <AppLoader variant="panel" size="md" label="Loading workspace activity…" className="min-h-52 rounded-2xl bg-paper" />
          ) : activity.length ? (
            <>
              <div className="flex h-52 items-end gap-2 border-b border-ink/[.08] px-1 pb-0">
                {activity.map((link, index) => (
                  <div key={link.id} className="group flex h-full flex-1 flex-col justify-end">
                    <div
                      className={`relative w-full rounded-t-lg transition duration-300 group-hover:bg-coral ${index === 0 ? 'bg-coral' : 'bg-coral/20'}`}
                      style={{ height: `${Math.max(12, (link.click_count / maxClicks) * 100)}%` }}
                    >
                      <span className="absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-md bg-ink px-1.5 py-1 text-[10px] font-semibold text-white shadow-sm group-hover:block">
                        {link.click_count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between px-1 text-[10px] text-ink/30">
                {activity.map((link) => (
                  <span key={link.id} className="max-w-16 truncate">
                    /{link.slug}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="grid h-52 place-items-center rounded-2xl bg-paper text-sm text-ink/40">Create a link to see activity.</div>
          )}
        </div>
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-ink via-ink to-[#39315E] p-5 text-white shadow-lift">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold">Workspace</p>
              <p className="mt-1 text-xs text-white/40">{workspace.plan} plan</p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-coral">
              <Icon name="spark" size={17} />
            </span>
          </div>
          <div className="mt-11">
            <p className="text-4xl font-semibold tracking-[-.06em]">{links.length}</p>
            <p className="mt-1 text-xs text-white/40">links in this workspace</p>
            <div className="mt-5 h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-coral to-[#FFB19F]"
                style={{ width: `${Math.min(100, links.length)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-white/35">
              <span>{activeCount} active</span>
              <span>{links.length - activeCount} paused or other</span>
            </div>
          </div>
          <Link
            href="/dashboard/settings"
            className="mt-8 inline-flex items-center gap-2 text-xs font-semibold text-coral transition hover:text-white"
          >
            Manage workspace <Icon name="arrow" size={13} />
          </Link>
        </div>
      </div>
      <div className="mt-5">
        <LinkTable links={links.slice(0, 4)} onCreate={() => setCreateOpen(true)} onPause={togglePause} pendingLinkId={pendingLinkId} />
      </div>
      <CreateLinkDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={addLink} workspaceId={workspace.id} />
    </div>
  );
}
