import { Badge, CopyButton } from './ui';
import { Icon } from './icons';

export function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[500px] animate-float-slow lg:ml-auto">
      <div className="absolute -right-4 -top-8 h-28 w-28 rounded-full bg-lilac/70 blur-2xl" />
      <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-mint/80 blur-3xl" />
      <div className="relative overflow-hidden rounded-[26px] border border-ink/10 bg-white shadow-lift">
        <div className="flex items-center justify-between border-b border-ink/[.07] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#FF8C82]" />
            <span className="h-2 w-2 rounded-full bg-[#F5C265]" />
            <span className="h-2 w-2 rounded-full bg-[#78D7A1]" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-ink/30">Overview</span>
        </div>
        <div className="bg-paper/50 p-5">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-[.16em] text-ink/35">Total clicks</p>
              <p className="text-3xl font-semibold tracking-[-.06em]">12,684</p>
            </div>
            <Badge tone="green">
              <Icon name="arrowUp" size={11} /> 18.4%
            </Badge>
          </div>
          <div className="mb-5 flex h-28 items-end gap-2 rounded-2xl bg-white px-4 pb-3 pt-4 shadow-sm">
            {[30, 46, 36, 60, 51, 74, 63, 87, 74, 96, 79, 100, 92].map((height, index) => (
              <span
                key={index}
                className={`flex-1 rounded-t-md ${index > 9 ? 'bg-coral' : 'bg-coral/20'}`}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <div className="overflow-hidden rounded-2xl border border-ink/[.07] bg-white">
            <div className="flex items-center justify-between border-b border-ink/[.07] px-4 py-3">
              <span className="text-xs font-semibold">Recent links</span>
              <span className="text-[10px] text-ink/35">This week</span>
            </div>
            <div className="space-y-1 p-2">
              <PreviewRow slug="launch" clicks="1,248" color="bg-coral" />
              <PreviewRow slug="read-this" clicks="864" color="bg-[#9A87EA]" />
              <PreviewRow slug="join-us" clicks="431" color="bg-[#5DB5A3]" />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 -right-8 hidden items-center gap-3 rounded-2xl border border-ink/10 bg-white p-3 shadow-soft sm:flex">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-mint text-[#31875C]">
          <Icon name="click" size={17} />
        </span>
        <div>
          <p className="text-[10px] text-ink/40">Live performance</p>
          <p className="text-xs font-semibold">Your links are moving</p>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ slug, clicks, color }: { slug: string; clicks: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-paper">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="flex-1 text-xs font-medium text-ink">lnk.linkforge.dev/{slug}</span>
      <span className="text-[11px] text-ink/40">{clicks}</span>
      <CopyButton value={`https://lnk.linkforge.dev/${slug}`} />
    </div>
  );
}
