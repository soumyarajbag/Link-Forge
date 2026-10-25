'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiMutation, apiRequest } from '@/lib/api';
import type { LinkItem } from '@/lib/types';
import { CreateLinkDialog } from './dashboard-create-link-dialog';
import { LinkTable } from './dashboard-link-table';
import { Icon } from '@/components/icons';
import { Badge, Button, SectionLabel } from '@/components/ui';
import { useDashboardContext } from './dashboard-shell';

export function LinksView() {
  const { workspace } = useDashboardContext();
  const searchParams = useSearchParams();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (searchParams.get('create') === '1') setOpen(true);
  }, [searchParams]);
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

  const visible = filter === 'all' ? links : links.filter((link) => link.state === filter);
  function addLink(link: LinkItem) {
    setLinks((current) => [link, ...current]);
  }
  async function togglePause(id: string) {
    const current = links.find((link) => link.id === id);
    if (!current) return;
    const nextState = current.state === 'paused' ? 'active' : 'paused';
    setLinks((items) => items.map((link) => (link.id === id ? { ...link, state: nextState } : link)));
    try {
      await apiMutation(`/v1/links/${id}`, { state: nextState }, 'PATCH');
    } catch (cause: unknown) {
      setLinks((items) => items.map((link) => (link.id === id ? { ...link, state: current.state } : link)));
      setError(cause instanceof Error ? cause.message : 'Unable to update the link.');
    }
  }

  return (
    <div className="animate-slide-up">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionLabel eyebrow="Your library" title="All links" detail="Organize the little paths that carry your biggest ideas." />
        <Button onClick={() => setOpen(true)}>
          <Icon name="plus" size={16} /> Create link
        </Button>
      </div>
      {error && <div className="mb-5 rounded-2xl border border-coral/20 bg-coral-50 px-4 py-3 text-sm text-coral-600">{error}</div>}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Filter active={filter === 'all'} onClick={() => setFilter('all')}>
          All links <span>{links.length}</span>
        </Filter>
        <Filter active={filter === 'active'} onClick={() => setFilter('active')}>
          Active <span>{links.filter((link) => link.state === 'active').length}</span>
        </Filter>
        <Filter active={filter === 'paused'} onClick={() => setFilter('paused')}>
          Paused <span>{links.filter((link) => link.state === 'paused').length}</span>
        </Filter>
        <div className="ml-auto hidden items-center gap-2 text-xs text-ink/40 sm:flex">
          <Badge tone="green">Live sync</Badge>
        </div>
      </div>
      {loading ? (
        <div className="h-96 animate-pulse rounded-3xl bg-white/60" />
      ) : (
        <LinkTable links={visible} onCreate={() => setOpen(true)} onPause={togglePause} />
      )}
      <CreateLinkDialog
        open={open}
        onClose={() => setOpen(false)}
        onCreated={addLink}
        workspaceId={workspace.id}
        initialUrl={searchParams.get('destination') || ''}
      />
    </div>
  );
}

function Filter({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${active ? 'bg-ink text-white' : 'bg-white text-ink/45 hover:bg-ink/[.05] hover:text-ink'}`}
    >
      {children}
    </button>
  );
}
