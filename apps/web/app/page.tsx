import Link from 'next/link';
import { DashboardPreview } from '@/components/dashboard-preview';
import { Icon } from '@/components/icons';
import { MarketingHeader } from '@/components/marketing-header';
import { ShortenForm } from '@/components/shorten-form';
import { Button, Logo, SectionLabel } from '@/components/ui';

export default function HomePage() {
  return (
    <main className="ambient-surface overflow-hidden">
      <section className="relative min-h-[720px] bg-transparent">
        <div className="pointer-events-none absolute -left-32 top-[-180px] h-[500px] w-[500px] rounded-full bg-coral-100/70 blur-3xl" />
        <div className="pointer-events-none absolute right-[-160px] top-[80px] h-[440px] w-[440px] rounded-full bg-lilac/50 blur-3xl" />
        <MarketingHeader />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 pb-20 pt-16 lg:grid-cols-[1.02fr_.98fr] lg:px-8 lg:pb-32 lg:pt-24">
          <div className="animate-slide-up">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-coral/20 bg-white/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-coral-600 shadow-sm">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[#47B77A]" /> Calm control for every click
            </div>
            <h1 className="max-w-2xl text-balance text-[clamp(3.25rem,7vw,6.2rem)] font-semibold leading-[.92] tracking-[-.075em] text-ink">
              Make every link feel{' '}
              <span className="relative inline-block bg-gradient-to-r from-coral-600 via-[#EE6678] to-[#7965D0] bg-clip-text text-transparent">
                intentional
                <span className="absolute -bottom-2 left-1/4 h-2 w-1/2 rounded-full bg-coral/25" />
              </span>
              .
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-ink/55">
              Shorten, share, and understand your links without the noise. LinkForge gives every campaign a home, a pulse, and a little more
              clarity.
            </p>
            <div className="mt-9">
              <ShortenForm />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink/40">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="check" size={13} /> HTTPS by default
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="check" size={13} /> Team-ready from day one
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="check" size={13} /> No clutter
              </span>
            </div>
          </div>
          <DashboardPreview />
        </div>
        <div className="absolute bottom-0 left-1/2 hidden -translate-x-1/2 items-center gap-5 text-[10px] font-bold uppercase tracking-[.2em] text-ink/30 lg:flex">
          <span className="h-px w-14 bg-ink/15" /> Scroll to explore <span className="h-px w-14 bg-ink/15" />
        </div>
      </section>

      <section id="why" className="bg-card/75 px-5 py-24 backdrop-blur-sm lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionLabel
            eyebrow="Less busywork"
            title="A better place for your links."
            detail="Everything you need to make a link useful after the click—not just shorter before it."
          />
          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              tone="coral"
              icon="spark"
              title="Make it memorable"
              copy="Give every destination a clean, human-friendly path your audience can actually remember."
            />
            <FeatureCard
              tone="mint"
              icon="barChart"
              title="See the signal"
              copy="Know what resonates with live click trends, devices, locations, and campaign context."
            />
            <FeatureCard
              tone="lilac"
              icon="users"
              title="Move as a team"
              copy="Organize workspaces, share responsibility, and keep every brand safely separated."
            />
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-gradient-to-br from-background via-secondary/25 to-accent/25 px-5 py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <SectionLabel
              eyebrow="The good flow"
              title="From long link to clear signal."
              detail="LinkForge keeps the simple stuff fast and puts the powerful stuff exactly where you need it."
            />
            <Link href="/dashboard">
              <Button variant="dark">
                Explore the dashboard <Icon name="arrow" size={16} />
              </Button>
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Step number="01" title="Create" copy="Paste a destination, choose your path, and share." />
            <Step number="02" title="Shape" copy="Add campaigns, QR codes, expiry, and routing." />
            <Step number="03" title="Learn" copy="Follow the click trail and make your next move." />
          </div>
        </div>
      </section>

      <section id="analytics" className="bg-gradient-to-br from-ink via-ink to-[#332B59] px-5 py-24 text-white lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[.18em] text-coral">Clarity, in motion</p>
            <h2 className="max-w-xl text-4xl font-semibold leading-[1.05] tracking-[-.06em] md:text-6xl">
              Your links have a story. See the whole thing.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/50">
              Spot the campaign that keeps climbing, the channel that needs help, and the moment your audience decided to click.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Pill icon="globe" text="Location-aware" />
              <Pill icon="click" text="Click trends" />
              <Pill icon="shield" text="Privacy-minded" />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[.06] p-5 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-xs text-white/40">Clicks this month</p>
                <p className="mt-1 text-3xl font-semibold tracking-[-.05em]">24,892</p>
              </div>
              <span className="rounded-full bg-mint px-2.5 py-1 text-[11px] font-bold text-[#2D7951]">+22.8%</span>
            </div>
            <div className="flex h-48 items-end gap-2 border-b border-white/10 px-2">
              {[28, 40, 36, 58, 51, 74, 64, 81, 75, 92, 84, 100].map((height, index) => (
                <div
                  key={index}
                  className="group relative flex-1 rounded-t-lg bg-gradient-to-t from-coral to-[#FF9D8F] opacity-80 transition hover:opacity-100"
                  style={{ height: `${height}%` }}
                >
                  <span className="absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-md bg-white px-1.5 py-1 text-[9px] font-bold text-ink shadow-sm group-hover:block">
                    {Math.round(height * 23)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between text-[10px] text-white/30">
              <span>01 Oct</span>
              <span>07 Oct</span>
              <span>14 Oct</span>
              <span>21 Oct</span>
              <span>Today</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-paper px-5 py-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 border-t border-ink/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <div className="flex items-center gap-5 text-xs text-ink/45">
            <a href="#why" className="hover:text-ink">
              Product
            </a>
            <a href="/dashboard" className="hover:text-ink">
              Dashboard
            </a>
            <a href="/login" className="hover:text-ink">
              Sign in
            </a>
            <span>© 2026 LinkForge</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  tone,
  icon,
  title,
  copy,
}: {
  tone: 'coral' | 'mint' | 'lilac';
  icon: 'spark' | 'barChart' | 'users';
  title: string;
  copy: string;
}) {
  const colors = { coral: 'bg-coral-50 text-coral-600', mint: 'bg-mint text-[#31875C]', lilac: 'bg-lilac text-[#6652BC]' };
  return (
    <div className="group rounded-3xl border border-ink/[.08] bg-paper/55 p-7 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-soft">
      <span className={`mb-10 grid h-11 w-11 place-items-center rounded-2xl ${colors[tone]} transition duration-300 group-hover:rotate-6`}>
        <Icon name={icon} size={20} />
      </span>
      <h3 className="text-lg font-semibold tracking-[-.03em]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-ink/50">{copy}</p>
    </div>
  );
}
function Step({ number, title, copy }: { number: string; title: string; copy: string }) {
  return (
    <div className="rounded-3xl border border-ink/10 bg-white p-6 transition hover:-translate-y-1 hover:shadow-soft">
      <span className="text-[11px] font-bold tracking-[.16em] text-coral-600">{number}</span>
      <h3 className="mt-12 text-lg font-semibold tracking-[-.03em]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-ink/50">{copy}</p>
    </div>
  );
}
function Pill({ icon, text }: { icon: 'globe' | 'click' | 'shield'; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.07] px-3 py-2 text-xs text-white/65">
      <Icon name={icon} size={14} /> {text}
    </span>
  );
}
