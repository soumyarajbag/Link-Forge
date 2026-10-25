'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';
import type { AnalyticsSummary, LinkItem } from '@/lib/types';
import { useDashboardContext } from './dashboard-shell';
import { Icon } from '@/components/icons';
import { Badge, Button, SectionLabel } from '@/components/ui';

const emptyAnalytics: AnalyticsSummary = { clicks: 0, unique_clicks: 0, by_day: [], by_country: [], by_device: [], by_referrer: [] };

export function AnalyticsView() {
  const { workspace } = useDashboardContext();
  const [analytics, setAnalytics] = useState<AnalyticsSummary>(emptyAnalytics);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 86_400_000);
    const formatDate = (date: Date) => date.toISOString().slice(0, 10);
    apiRequest<{ links: LinkItem[] }>(`/v1/workspaces/${workspace.id}/links?page_size=100`)
      .then(async (linkData) => {
        const summaries = await Promise.all(
          linkData.links
            .slice(0, 20)
            .map((link) => apiRequest<AnalyticsSummary>(`/v1/links/${link.id}/analytics?from=${formatDate(from)}&to=${formatDate(to)}`)),
        );
        if (!mounted) return;
        setLinks(linkData.links);
        setAnalytics(mergeAnalytics(summaries));
      })
      .catch((cause: unknown) => {
        if (mounted) setError(cause instanceof Error ? cause.message : 'Unable to load analytics.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [workspace.id]);

  const max = Math.max(1, ...analytics.by_day.map((item) => item.clicks));
  const deviceTotal = Math.max(
    1,
    analytics.by_device.reduce((sum, item) => sum + item.count, 0),
  );
  const exportAnalytics = () => {
    const rows = [
      ['metric', 'name', 'count'],
      ['total', 'clicks', String(analytics.clicks)],
      ['total', 'unique_clicks', String(analytics.unique_clicks)],
      ...analytics.by_country.map((item) => ['country', item.name, String(item.count)]),
      ...analytics.by_device.map((item) => ['device', item.name, String(item.count)]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${workspace.slug}-analytics.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-slide-up">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionLabel eyebrow="Read the room" title="Analytics" detail="Live click analytics from the links in this workspace." />
        <div className="flex gap-2">
          <Button variant="secondary" disabled={loading || analytics.clicks === 0} onClick={exportAnalytics}>
            <Icon name="arrowUp" size={15} /> Export CSV
          </Button>
          <span className="inline-flex items-center rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white">Last 7 days</span>
        </div>
      </div>
      {error && <div className="mb-5 rounded-2xl border border-coral/20 bg-coral-50 px-4 py-3 text-sm text-coral-600">{error}</div>}
      {loading ? (
        <div className="grid gap-5">
          <div className="h-28 animate-pulse rounded-3xl bg-white" />
          <div className="h-72 animate-pulse rounded-3xl bg-white" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Total clicks" value={analytics.clicks.toLocaleString()} />
            <Metric label="Unique clicks" value={analytics.unique_clicks.toLocaleString()} />
            <Metric label="Links analyzed" value={String(Math.min(20, links.length))} />
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
            <div className="rounded-3xl border border-ink/[.08] bg-white p-5 sm:p-7">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Traffic over time</p>
                  <p className="mt-1 text-xs text-ink/40">Last seven days · UTC</p>
                </div>
                <Badge tone="green">
                  <Icon name="check" size={10} /> Live
                </Badge>
              </div>
              {analytics.by_day.length ? (
                <>
                  <div className="flex h-64 items-end gap-2 border-b border-ink/[.08] px-1">
                    {analytics.by_day.map((item) => (
                      <div key={item.date} className="group flex h-full flex-1 flex-col justify-end">
                        <div
                          className="relative w-full rounded-t-xl bg-coral/70 transition duration-300 hover:bg-coral"
                          style={{ height: `${Math.max(4, (item.clicks / max) * 100)}%` }}
                        >
                          <span className="absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-[10px] font-semibold text-white group-hover:block">
                            {item.clicks}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between text-[10px] text-ink/30">
                    {analytics.by_day.map((item) => (
                      <span key={item.date}>{item.date.slice(5)}</span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="grid h-64 place-items-center rounded-2xl bg-paper text-sm text-ink/40">No click events in this period.</div>
              )}
            </div>
            <div className="rounded-3xl border border-ink/[.08] bg-white p-5 sm:p-7">
              <div className="mb-7">
                <p className="text-sm font-semibold">Device mix</p>
                <p className="mt-1 text-xs text-ink/40">How people reach you</p>
              </div>
              {analytics.by_device.length ? (
                <>
                  <div
                    className="mx-auto mb-7 grid h-40 w-40 place-items-center rounded-full"
                    style={{ background: deviceGradient(analytics.by_device, deviceTotal) }}
                  >
                    <div className="grid h-24 w-24 place-items-center rounded-full bg-white">
                      <div className="text-center">
                        <p className="text-2xl font-semibold tracking-[-.05em]">{analytics.clicks.toLocaleString()}</p>
                        <p className="text-[10px] text-ink/40">clicks</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {analytics.by_device.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-3 text-xs">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${index === 0 ? 'bg-coral' : index === 1 ? 'bg-[#9A87EA]' : 'bg-mint'}`}
                        />
                        <span className="capitalize text-ink/55">{item.name}</span>
                        <span className="ml-auto font-semibold">{Math.round((item.count / deviceTotal) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="grid h-56 place-items-center rounded-2xl bg-paper text-sm text-ink/40">No device data yet.</div>
              )}
            </div>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <Breakdown
              title="Top countries"
              icon="globe"
              items={analytics.by_country.map((item) => ({ label: item.name, value: item.count.toLocaleString() }))}
            />
            <Breakdown
              title="Top referrers"
              icon="external"
              items={analytics.by_referrer.map((item) => ({ label: item.name, value: item.count.toLocaleString() }))}
            />
            <Breakdown
              title="Top links"
              icon="link"
              items={links
                .slice()
                .sort((left, right) => right.click_count - left.click_count)
                .slice(0, 4)
                .map((item) => ({ label: `/${item.slug}`, value: item.click_count.toLocaleString() }))}
            />
          </div>
        </>
      )}
    </div>
  );
}

function mergeAnalytics(summaries: AnalyticsSummary[]): AnalyticsSummary {
  const byDay = new Map<string, number>();
  const byCountry = new Map<string, number>();
  const byDevice = new Map<string, number>();
  const byReferrer = new Map<string, number>();
  for (const summary of summaries) {
    for (const item of summary.by_day) byDay.set(item.date, (byDay.get(item.date) || 0) + item.clicks);
    for (const item of summary.by_country) byCountry.set(item.name, (byCountry.get(item.name) || 0) + item.count);
    for (const item of summary.by_device) byDevice.set(item.name, (byDevice.get(item.name) || 0) + item.count);
    for (const item of summary.by_referrer) byReferrer.set(item.name, (byReferrer.get(item.name) || 0) + item.count);
  }
  const breakdown = (values: Map<string, number>) =>
    [...values.entries()].map(([name, count]) => ({ name, count })).sort((left, right) => right.count - left.count);
  return {
    clicks: summaries.reduce((sum, item) => sum + item.clicks, 0),
    unique_clicks: summaries.reduce((sum, item) => sum + item.unique_clicks, 0),
    by_day: [...byDay.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, clicks]) => ({ date, clicks })),
    by_country: breakdown(byCountry),
    by_device: breakdown(byDevice),
    by_referrer: breakdown(byReferrer),
  };
}
function deviceGradient(items: Array<{ name: string; count: number }>, total: number) {
  let start = 0;
  const colors = ['#FF6B61', '#9A87EA', '#CBEBDD', '#55A7C2'];
  const stops = items.map((item, index) => {
    const end = start + (item.count / total) * 100;
    const segment = `${colors[index % colors.length]} ${start}% ${end}%`;
    start = end;
    return segment;
  });
  return `conic-gradient(${stops.join(', ')})`;
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-ink/[.08] bg-white p-5">
      <p className="text-xs text-ink/45">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-.06em]">{value}</p>
    </div>
  );
}
function Breakdown({
  title,
  icon,
  items,
}: {
  title: string;
  icon: 'globe' | 'external' | 'link';
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="rounded-3xl border border-ink/[.08] bg-white p-5">
      <div className="mb-5 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-paper text-ink/55">
          <Icon name={icon} size={15} />
        </span>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {items.length ? (
        <div className="space-y-3">
          {items.slice(0, 5).map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-ink/50">{item.label}</span>
              <span className="font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink/40">No data yet.</p>
      )}
    </div>
  );
}
