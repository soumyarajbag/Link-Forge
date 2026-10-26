'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { BookOpen, Check, Copy, KeyRound, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiMutation, apiRequest, ApiError } from '@/lib/api';
import type { ApiKey } from '@/lib/types';
import { ConfirmDialog } from '@/components/confirm-dialog';

const availableScopes = [
  { value: 'links:read', label: 'Read links', detail: 'List links and inspect their configuration.' },
  { value: 'links:write', label: 'Manage links', detail: 'Create, update, pause, restore, and delete links.' },
  { value: 'analytics:read', label: 'Read analytics', detail: 'Access click totals and traffic breakdowns.' },
  { value: 'workspace:read', label: 'Read workspace', detail: 'Read workspace and member information.' },
] as const;

const scopeLabels = Object.fromEntries(availableScopes.map((scope) => [scope.value, scope.label])) as Record<string, string>;

export function ApiKeysSettings({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [scopes, setScopes] = useState<string[]>(['links:read']);
  const [secret, setSecret] = useState('');
  const [createdPrefix, setCreatedPrefix] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revokingId, setRevokingId] = useState('');
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    setMessage('');
    setKeys([]);
    apiRequest<{ api_keys: ApiKey[] }>(`/v1/workspaces/${workspaceId}/api-keys`)
      .then((data) => {
        if (mounted) setKeys(data.api_keys);
      })
      .catch((cause: unknown) => {
        if (mounted) setError(cause instanceof ApiError ? cause.message : 'Unable to load API keys.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [workspaceId]);

  function toggleScope(scope: string) {
    setScopes((current) => (current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]));
  }

  async function createKey(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || scopes.length === 0) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await apiMutation<{ api_key: ApiKey; secret: string; warning: string }>(`/v1/workspaces/${workspaceId}/api-keys`, {
        name: name.trim(),
        scopes,
        expires_at: expiresOn ? new Date(`${expiresOn}T23:59:59.999`).toISOString() : undefined,
      });
      setKeys((current) => [data.api_key, ...current]);
      setSecret(data.secret);
      setCreatedPrefix(data.api_key.prefix);
      setName('');
      setExpiresOn('');
      setScopes(['links:read']);
      setMessage('API key created. Save its secret before closing the dialog.');
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to create the API key.');
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey(key: ApiKey) {
    setRevokingId(key.id);
    setError('');
    setMessage('');
    try {
      await apiMutation(`/v1/workspaces/${workspaceId}/api-keys/${key.id}`, undefined, 'DELETE');
      setKeys((current) => current.filter((item) => item.id !== key.id));
      setKeyToRevoke(null);
      setMessage(`${key.name} was revoked.`);
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to revoke the API key.');
    } finally {
      setRevokingId('');
    }
  }

  async function copySecret() {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}

      <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-violet-200/70 bg-gradient-to-r from-violet-50/90 via-card to-sky-50/70 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Connect your applications</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            View authentication examples, scope requirements, supported routes, and API key security guidance.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link href="/dashboard/api-docs">
            <BookOpen className="h-4 w-4" />
            Open API documentation
          </Link>
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <span className="mb-2 grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-lilac to-violet-100 text-violet-700">
              <KeyRound className="h-5 w-5" />
            </span>
            <CardTitle>Create an API key</CardTitle>
            <CardDescription>
              Generate a workspace-scoped credential for scripts and integrations. Choose only the access it needs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createKey} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="api-key-name">Key name</Label>
                <Input
                  id="api-key-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Production automation"
                  maxLength={80}
                />
                <p className="text-[11px] text-muted-foreground">Use a name that identifies the application or environment.</p>
              </div>

              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium">Permissions</legend>
                {availableScopes.map((scope) => {
                  const selected = scopes.includes(scope.value);
                  return (
                    <button
                      type="button"
                      key={scope.value}
                      onClick={() => toggleScope(scope.value)}
                      aria-pressed={selected}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all ${selected ? 'border-primary/30 bg-primary/5 shadow-sm' : 'border-border/70 bg-background/50 hover:border-primary/20 hover:bg-secondary/30'}`}
                    >
                      <span
                        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card'}`}
                      >
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{scope.label}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{scope.detail}</span>
                      </span>
                    </button>
                  );
                })}
                {scopes.length === 0 && <p className="text-xs text-destructive">Select at least one permission.</p>}
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="api-key-expiry">Expiration date</Label>
                <Input
                  id="api-key-expiry"
                  type="date"
                  value={expiresOn}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setExpiresOn(event.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Optional. Short-lived keys reduce risk if a secret is exposed.</p>
              </div>

              <Button type="submit" className="w-full" disabled={busy || !name.trim() || scopes.length === 0}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {busy ? 'Generating…' : 'Generate API key'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Active API keys</CardTitle>
              <CardDescription className="mt-1.5">Credentials that can access {workspaceName} through the API.</CardDescription>
            </div>
            <Badge variant="secondary">{keys.length} active</Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid min-h-52 place-items-center text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading API keys…
                </span>
              </div>
            ) : keys.length ? (
              <div className="space-y-3">
                {keys.map((key) => {
                  const expired = Boolean(key.expires_at && new Date(key.expires_at) < new Date());
                  return (
                    <div key={key.id} className="rounded-2xl border border-border/70 bg-background/55 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{key.name}</p>
                            <Badge variant={expired ? 'warning' : 'success'}>{expired ? 'Expired' : 'Active'}</Badge>
                          </div>
                          <p className="mt-2 font-mono text-xs text-muted-foreground">{key.prefix}••••••••••••</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={revokingId === key.id}
                          onClick={() => setKeyToRevoke(key)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          {revokingId === key.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          Revoke
                        </Button>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {key.scopes.length ? (
                          key.scopes.map((scope) => (
                            <Badge key={scope} variant="outline">
                              {scopeLabels[scope] || scope}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="warning">Legacy full access</Badge>
                        )}
                      </div>
                      <div className="mt-4 grid gap-2 border-t border-border/60 pt-3 text-[11px] text-muted-foreground sm:grid-cols-3">
                        <span>Created {formatDate(key.created_at)}</span>
                        <span>Last used {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}</span>
                        <span>Expires {key.expires_at ? formatDate(key.expires_at) : 'Never'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-border bg-secondary/15 p-6 text-center">
                <div>
                  <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-semibold">No active API keys</p>
                  <p className="mt-1 text-xs text-muted-foreground">Generate one when an integration needs programmatic access.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(secret)}
        onOpenChange={(open) => {
          if (!open) {
            setSecret('');
            setCreatedPrefix('');
            setCopied(false);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <span className="mb-2 grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <DialogTitle>Save your API key now</DialogTitle>
            <DialogDescription>
              This secret is shown only once. Store it in a password manager or secrets vault—LinkForge cannot display it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-api-secret">API key secret</Label>
            <div className="flex gap-2">
              <Input id="new-api-secret" readOnly value={secret} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={copySecret} aria-label="Copy API key secret">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Key prefix: {createdPrefix}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
            Never commit this key to source control or expose it in frontend code. Send it only from a trusted server using the X-API-Key
            header.
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setSecret('')}>
              I’ve saved the key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(keyToRevoke)}
        onOpenChange={(open) => {
          if (!open) setKeyToRevoke(null);
        }}
        title="Revoke this API key?"
        description={`Applications using “${keyToRevoke?.name || 'this key'}” will immediately lose access to ${workspaceName}. This action cannot be undone.`}
        confirmLabel="Revoke API key"
        pendingLabel="Revoking…"
        busy={Boolean(keyToRevoke && revokingId === keyToRevoke.id)}
        onConfirm={() => {
          if (keyToRevoke) return revokeKey(keyToRevoke);
        }}
      />
    </>
  );
}

function Notice({ children, tone }: { children: React.ReactNode; tone: 'error' | 'success' }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${tone === 'error' ? 'border-destructive/20 bg-destructive/10 text-destructive' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
    >
      {children}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}
