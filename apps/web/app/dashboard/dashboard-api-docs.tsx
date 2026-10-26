'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Copy, KeyRound, LockKeyhole, Route, Server, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui';
import { apiBaseURL } from '@/lib/api';
import { useDashboardContext } from './dashboard-shell';

const endpointGroups = [
  {
    scope: 'links:read',
    title: 'Read links',
    description: 'Read links and download their QR codes.',
    endpoints: [
      ['GET', '/v1/workspaces/:workspaceID/links', 'List workspace links'],
      ['GET', '/v1/links/:linkID', 'Get one link'],
      ['GET', '/v1/links/:linkID/qr', 'Download its QR code as a PNG'],
    ],
  },
  {
    scope: 'links:write',
    title: 'Manage links',
    description: 'Create links and manage their lifecycle.',
    endpoints: [
      ['POST', '/v1/workspaces/:workspaceID/links', 'Create a short link'],
      ['PATCH', '/v1/links/:linkID', 'Update a link'],
      ['DELETE', '/v1/links/:linkID', 'Delete a link'],
      ['POST', '/v1/links/:linkID/pause', 'Pause redirects'],
      ['POST', '/v1/links/:linkID/restore', 'Restore redirects'],
    ],
  },
  {
    scope: 'analytics:read',
    title: 'Read analytics',
    description: 'Read click totals and traffic analytics.',
    endpoints: [['GET', '/v1/links/:linkID/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD', 'Get analytics for a date range']],
  },
  {
    scope: 'workspace:read',
    title: 'Read workspace',
    description: 'Read workspace metadata and member information.',
    endpoints: [
      ['GET', '/v1/workspaces/:workspaceID', 'Get workspace details'],
      ['GET', '/v1/workspaces/:workspaceID/members', 'List workspace members'],
    ],
  },
] as const;

const contents = [
  ['getting-started', 'Getting started'],
  ['authentication', 'Authentication'],
  ['examples', 'Request examples'],
  ['reference', 'API reference'],
  ['responses', 'Responses & errors'],
  ['security', 'Security'],
] as const;

export function ApiDocumentationView() {
  const { workspace } = useDashboardContext();
  const baseURL = apiBaseURL();
  const [copied, setCopied] = useState('');
  const examples = useMemo(
    () => ({
      list: `curl "${baseURL}/v1/workspaces/${workspace.id}/links?page=1&page_size=20" \\\n+  -H "X-API-Key: YOUR_API_KEY"`,
      create: `curl -X POST "${baseURL}/v1/workspaces/${workspace.id}/links" \\\n+  -H "X-API-Key: YOUR_API_KEY" \\\n+  -H "Content-Type: application/json" \\\n+  -d '{
    "destination_url": "https://example.com/product",
    "slug": "product-launch",
    "title": "Product launch",
    "tags": ["automation"],
    "campaign": "product-launch"
  }'`,
      response: `{
  "data": {
    "link": {
      "id": "...",
      "slug": "product-launch",
      "destination_url": "https://example.com/product",
      "state": "active"
    },
    "short_url": "https://your-short-domain/product-launch"
  },
  "request_id": "..."
}`,
    }),
    [baseURL, workspace.id],
  );

  async function copy(value: string, id: string) {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    window.setTimeout(() => setCopied((current) => (current === id ? '' : current)), 1600);
  }

  return (
    <div className="animate-slide-up max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionLabel
          eyebrow="Developer resources"
          title="LinkForge API documentation"
          detail={`Build server-side integrations for ${workspace.name} with workspace-scoped API keys.`}
        />
        <Button asChild variant="outline" className="shrink-0">
          <Link href="/dashboard/settings?tab=developer">
            <ArrowLeft className="h-4 w-4" />
            Manage API keys
          </Link>
        </Button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="glass hidden rounded-3xl border-border/70 p-3 lg:sticky lg:top-24 lg:block">
          <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">On this page</p>
          <nav aria-label="API documentation sections" className="space-y-1">
            {contents.map(([id, label], index) => (
              <a
                key={id}
                href={`#${id}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <span className="grid h-5 w-5 place-items-center rounded-md bg-secondary font-mono text-[9px] text-foreground">
                  {index + 1}
                </span>
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          <section
            id="getting-started"
            className="scroll-mt-28 overflow-hidden rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-card to-sky-50 shadow-soft"
          >
            <div className="grid gap-6 p-6 sm:p-8 xl:grid-cols-[1.15fr_.85fr] xl:items-center">
              <div>
                <Badge variant="purple">REST API · JSON</Badge>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-.04em] text-foreground">Start with one authenticated request</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Generate a key from Settings, store its secret on your server, then send it with every request. Each key works only with
                  the workspace that created it.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href="/dashboard/settings?tab=developer">
                      <KeyRound className="h-4 w-4" /> Generate an API key
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <a href="#examples">View examples</a>
                  </Button>
                </div>
              </div>
              <div className="grid gap-3">
                <InfoCard label="API base URL" value={baseURL} onCopy={() => copy(baseURL, 'base')} copied={copied === 'base'} />
                <InfoCard
                  label="Current workspace ID"
                  value={workspace.id}
                  onCopy={() => copy(workspace.id, 'workspace')}
                  copied={copied === 'workspace'}
                />
              </div>
            </div>
          </section>

          <DocCard
            id="authentication"
            icon={<KeyRound className="h-5 w-5" />}
            step="01"
            title="Authentication"
            description="How every API request proves its identity."
          >
            <p className="text-sm leading-6 text-muted-foreground">
              Send the full API key secret—not the visible prefix—in the{' '}
              <code className="rounded bg-secondary px-1.5 py-0.5 text-xs text-foreground">X-API-Key</code> header. Bearer authentication is
              also supported.
            </p>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold">Recommended</p>
                <CodeBlock
                  value="X-API-Key: YOUR_API_KEY"
                  onCopy={() => copy('X-API-Key: YOUR_API_KEY', 'api-key-header')}
                  copied={copied === 'api-key-header'}
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold">Alternative</p>
                <CodeBlock
                  value="Authorization: Bearer YOUR_API_KEY"
                  onCopy={() => copy('Authorization: Bearer YOUR_API_KEY', 'bearer-header')}
                  copied={copied === 'bearer-header'}
                />
              </div>
            </div>
            <Callout>
              API-key requests are server-to-server requests and do not need a CSRF token. Browser session requests still use the normal
              cookie and CSRF flow.
            </Callout>
          </DocCard>

          <DocCard
            id="examples"
            icon={<Server className="h-5 w-5" />}
            step="02"
            title="Request examples"
            description="Copy these commands and replace only the key secret or request data."
          >
            <Example number="1" title="List workspace links" detail="Requires the links:read scope.">
              <CodeBlock value={examples.list} onCopy={() => copy(examples.list, 'list')} copied={copied === 'list'} />
            </Example>
            <Example number="2" title="Create a short link" detail="Requires the links:write scope. Only destination_url is required.">
              <CodeBlock value={examples.create} onCopy={() => copy(examples.create, 'create')} copied={copied === 'create'} />
            </Example>
            <div className="mt-5 overflow-hidden rounded-2xl border border-border/70">
              <div className="border-b border-border/60 bg-secondary/25 px-4 py-3">
                <p className="text-sm font-semibold">Common create-link fields</p>
              </div>
              <div className="divide-y divide-border/60 text-xs">
                <Field name="destination_url" requirement="Required" detail="The HTTPS or HTTP URL that visitors should reach." />
                <Field name="slug" requirement="Optional" detail="A custom short path, up to 50 characters. Generated when omitted." />
                <Field name="title" requirement="Optional" detail="A human-readable label, up to 200 characters." />
                <Field name="tags" requirement="Optional" detail="Labels used to organize and filter links." />
                <Field name="campaign" requirement="Optional" detail="A campaign name used for reporting and grouping." />
                <Field name="expires_at" requirement="Optional" detail="An ISO 8601 date-time after which the link expires." />
              </div>
            </div>
          </DocCard>

          <DocCard
            id="reference"
            icon={<Route className="h-5 w-5" />}
            step="03"
            title="API reference"
            description="Routes available to API keys, grouped by the required scope."
          >
            <Callout>
              Replace <code>:workspaceID</code> with the current workspace ID and <code>:linkID</code> with a link ID returned by the API. A
              key cannot access resources from another workspace.
            </Callout>
            <div className="mt-5 space-y-4">
              {endpointGroups.map((group) => (
                <section key={group.scope} className="overflow-hidden rounded-2xl border border-border/70 bg-background/55">
                  <div className="flex flex-col gap-2 border-b border-border/60 bg-secondary/20 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{group.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
                    </div>
                    <Badge variant="outline" className="w-fit font-mono text-[10px]">
                      {group.scope}
                    </Badge>
                  </div>
                  <div className="divide-y divide-border/60">
                    {group.endpoints.map(([method, path, description]) => (
                      <div
                        key={`${method}-${path}`}
                        className="grid gap-2 px-4 py-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_13rem] sm:items-center"
                      >
                        <Method value={method} />
                        <code className="break-all text-[11px] text-foreground">{path}</code>
                        <span className="text-xs text-muted-foreground sm:text-right">{description}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </DocCard>

          <DocCard
            id="responses"
            icon={<Server className="h-5 w-5" />}
            step="04"
            title="Responses and errors"
            description="Understand the response envelope and the failures your integration should handle."
          >
            <p className="text-sm leading-6 text-muted-foreground">
              Successful JSON responses put their result inside{' '}
              <code className="rounded bg-secondary px-1.5 py-0.5 text-xs text-foreground">data</code> and include a request ID for
              troubleshooting.
            </p>
            <div className="mt-4">
              <CodeBlock value={examples.response} onCopy={() => copy(examples.response, 'response')} copied={copied === 'response'} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Status code="400" text="Request parameters or JSON body are invalid." />
              <Status code="401" text="Key is missing, invalid, revoked, or expired." />
              <Status code="403" text="Scope is missing or the resource belongs to another workspace." />
              <Status code="404" text="The requested resource was not found." />
              <Status code="409" text="A unique value, such as a custom slug, already exists." />
              <Status code="429" text="Rate limit exceeded; retry with exponential backoff." />
            </div>
          </DocCard>

          <DocCard
            id="security"
            icon={<ShieldCheck className="h-5 w-5" />}
            step="05"
            title="Security checklist"
            description="Treat API keys like passwords with direct access to workspace data."
          >
            <div className="grid gap-3 md:grid-cols-3">
              <SecurityItem
                icon={<LockKeyhole className="h-4 w-4" />}
                title="Keep keys server-side"
                description="Never expose a key in browser code, mobile apps, public repositories, screenshots, or support messages."
              />
              <SecurityItem
                icon={<Route className="h-4 w-4" />}
                title="Limit every key"
                description="Create separate keys per integration and grant only the scopes that integration requires."
              />
              <SecurityItem
                icon={<KeyRound className="h-4 w-4" />}
                title="Rotate and revoke"
                description="Replace old keys regularly and revoke one immediately when it may have been exposed."
              />
            </div>
          </DocCard>
        </div>
      </div>
    </div>
  );
}

function DocCard({
  id,
  icon,
  step,
  title,
  description,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-28 overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-secondary/10 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-foreground to-foreground/80 text-background shadow-md">
            {icon}
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Step {step}</p>
            <CardTitle className="mt-1 text-lg">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 sm:p-7">{children}</CardContent>
    </Card>
  );
}

function InfoCard({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate text-xs">{value}</code>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={onCopy} aria-label={`Copy ${label}`}>
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function CodeBlock({ value, onCopy, copied }: { value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-slate-950 p-4 text-slate-100 shadow-inner">
      <pre className="overflow-x-auto pr-9 text-[11px] leading-5">
        <code>{value}</code>
      </pre>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute right-2 top-2 h-8 w-8 text-slate-300 hover:bg-white/10 hover:text-white"
        onClick={onCopy}
        aria-label="Copy example"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs leading-5 text-sky-900">{children}</div>;
}

function Example({ number, title, detail, children }: { number: string; title: string; detail: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 first:mt-0">
      <div className="mb-2 flex items-start gap-2">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-secondary font-mono text-[9px] font-bold">{number}</span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ name, requirement, detail }: { name: string; requirement: string; detail: string }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_5rem_minmax(0,1fr)] sm:items-center">
      <code className="text-[11px] font-semibold text-foreground">{name}</code>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">{requirement}</span>
      <span className="text-muted-foreground">{detail}</span>
    </div>
  );
}

function Method({ value }: { value: string }) {
  const tone =
    value === 'GET'
      ? 'bg-sky-100 text-sky-700'
      : value === 'DELETE'
        ? 'bg-rose-100 text-rose-700'
        : value === 'PATCH'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-emerald-100 text-emerald-700';
  return <span className={`w-fit rounded-lg px-2 py-1 font-mono text-[10px] font-bold ${tone}`}>{value}</span>;
}

function Status({ code, text }: { code: string; text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <Badge variant="outline" className="font-mono text-[10px]">
        {code}
      </Badge>
      <span className="text-xs leading-5 text-muted-foreground">{text}</span>
    </div>
  );
}

function SecurityItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-foreground">{icon}</span>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}
