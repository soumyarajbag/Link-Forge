'use client';

import { useMemo, useState } from 'react';
import type { LinkItem } from '@/lib/types';
import { shortURL } from '@/lib/api';
import { Icon } from '@/components/icons';
import { Badge, Button, CopyButton } from '@/components/ui';
import { AppLoader } from '@/components/app-loader';

export function LinkTable({
  links,
  onCreate,
  onPause,
  pendingLinkId = '',
}: {
  links: LinkItem[];
  onCreate: () => void;
  onPause: (id: string) => void;
  pendingLinkId?: string;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => links.filter((link) => `${link.title} ${link.slug} ${link.destination_url}`.toLowerCase().includes(search.toLowerCase())),
    [links, search],
  );
  return (
    <div className="overflow-hidden rounded-3xl border border-ink/[.08] bg-white">
      <div className="flex flex-col gap-3 border-b border-ink/[.07] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Your links</h3>
          <p className="mt-1 text-xs text-ink/40">Every destination, in one calm view.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-ink/10 bg-paper px-3 py-2 text-xs text-ink/40">
            <Icon name="search" size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search links"
              className="w-24 bg-transparent outline-none placeholder:text-ink/30 sm:w-32"
            />
          </label>
          <Button onClick={onCreate} className="px-3 py-2">
            <Icon name="plus" size={15} /> <span className="hidden sm:inline">New link</span>
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left">
          <thead className="bg-paper/60 text-[10px] font-bold uppercase tracking-[.15em] text-ink/30">
            <tr>
              <th className="px-5 py-3">Link</th>
              <th className="px-5 py-3">Campaign</th>
              <th className="px-5 py-3">Clicks</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[.06]">
            {filtered.map((link) => (
              <tr key={link.id} className="group transition hover:bg-paper/50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-xl ${link.state === 'paused' ? 'bg-sand text-ink/40' : 'bg-coral-50 text-coral-600'}`}
                    >
                      <Icon name={link.state === 'paused' ? 'pause' : 'link'} size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="max-w-[210px] truncate text-sm font-semibold">{link.title || link.slug}</p>
                      <div className="mt-1 flex items-center gap-1 text-xs text-ink/40">
                        <span>
                          {link.hostname}/{link.slug}
                        </span>
                        <CopyButton value={shortURL(link.slug, link.hostname)} />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-xs text-ink/50">{link.campaign || '—'}</td>
                <td className="px-5 py-4">
                  <span className="text-sm font-semibold">{link.click_count.toLocaleString()}</span>
                  <span className="ml-1 text-[11px] text-ink/35">clicks</span>
                </td>
                <td className="px-5 py-4">
                  {link.state === 'paused' ? (
                    <Badge tone="orange">Paused</Badge>
                  ) : (
                    <Badge tone="green">{link.state === 'active' ? 'Active' : link.state}</Badge>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  <div
                    className={`flex justify-end gap-1 transition ${pendingLinkId === link.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  >
                    <button
                      disabled={pendingLinkId === link.id || (link.state !== 'active' && link.state !== 'paused')}
                      onClick={() => onPause(link.id)}
                      className="rounded-lg p-2 text-ink/35 hover:bg-ink/[.05] hover:text-ink disabled:opacity-30"
                      aria-label={link.state === 'paused' ? 'Resume link' : 'Pause link'}
                    >
                      {pendingLinkId === link.id ? (
                        <AppLoader variant="icon" size="xs" label="Updating link…" />
                      ) : (
                        <Icon name={link.state === 'paused' ? 'check' : 'pause'} size={15} />
                      )}
                    </button>
                    <a
                      href={shortURL(link.slug, link.hostname)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg p-2 text-ink/35 hover:bg-ink/[.05] hover:text-ink"
                      aria-label="Open link"
                    >
                      <Icon name="external" size={15} />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <div className="px-5 py-12 text-center text-sm text-ink/45">No links match that search.</div>}
      <div className="flex items-center justify-between border-t border-ink/[.07] px-5 py-3 text-xs text-ink/35">
        <span>
          Showing {filtered.length} of {links.length} links
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#47B77A]" /> Live sync on
        </span>
      </div>
    </div>
  );
}
