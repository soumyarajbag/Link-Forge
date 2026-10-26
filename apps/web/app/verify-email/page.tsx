'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError, apiMutation, apiRequest } from '@/lib/api';
import type { Workspace } from '@/lib/types';
import { Icon } from '@/components/icons';
import { Button, Logo } from '@/components/ui';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLoader } from '@/components/app-loader';

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  const [invitation, setInvitation] = useState('');
  const [code, setCode] = useState('');
  const [developmentCode, setDevelopmentCode] = useState('');
  const [loadingInvitation, setLoadingInvitation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invitationToken = params.get('invitation') || '';
    setEmail(params.get('email') || '');
    setInvitation(invitationToken);
    setDevelopmentCode(sessionStorage.getItem('linkforge_dev_verification_code') || '');
    if (invitationToken) {
      setLoadingInvitation(true);
      apiRequest<{ invitation: { email: string } }>(`/v1/invitations/${encodeURIComponent(invitationToken)}`)
        .then((data) => setEmail(data.invitation.email))
        .catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : 'Unable to load this invitation.'))
        .finally(() => setLoadingInvitation(false));
    }
  }, []);

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit verification code.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await apiMutation<{ workspace?: Workspace }>('/v1/auth/verify-email', {
        email,
        code,
        ...(invitation ? { invitation_token: invitation } : {}),
      });
      if (data.workspace) window.localStorage.setItem('linkforge_workspace_id', data.workspace.id);
      sessionStorage.removeItem('linkforge_dev_verification_code');
      window.location.replace(getSafeNextPath());
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to verify your email. Please try again.');
      setBusy(false);
    }
  }

  async function resend() {
    if (!email) {
      setError('Enter your email address before requesting a new code.');
      return;
    }
    setResending(true);
    setError('');
    setMessage('');
    try {
      const data = await apiMutation<{ development_verification_code?: string }>('/v1/auth/verify-email/resend', { email });
      if (data.development_verification_code) {
        sessionStorage.setItem('linkforge_dev_verification_code', data.development_verification_code);
        setDevelopmentCode(data.development_verification_code);
      }
      setMessage('If the account exists, a new verification code has been sent.');
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to resend the verification code.');
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="ambient-surface grid min-h-screen place-items-center bg-background/50 px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-10 flex items-center justify-between">
          <Logo />
          <Link href="/login" className="text-sm text-ink/50">
            Back to sign in
          </Link>
        </div>
        <Card className="shine-border p-6 sm:p-8">
          <div className="mb-7">
            <span className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-coral-50 text-coral-600">
              <Icon name="check" size={20} />
            </span>
            <h1 className="text-3xl font-semibold tracking-[-.06em]">Verify your email.</h1>
            <p className="mt-3 text-sm leading-6 text-ink/50">
              Enter the six-digit code we sent to finish creating your LinkForge account.
            </p>
          </div>
          {loadingInvitation ? (
            <AppLoader
              variant="panel"
              size="md"
              label="Loading invitation…"
              className="min-h-52 rounded-2xl border-coral/15 bg-coral-50/60"
            />
          ) : (
            <>
              <form onSubmit={verify} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-foreground/65">Email address</Label>
                  <Input
                    required
                    type="email"
                    value={email}
                    readOnly={Boolean(invitation)}
                    aria-readonly={Boolean(invitation)}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className={invitation ? 'cursor-not-allowed bg-muted text-muted-foreground' : 'bg-background/70'}
                  />
                  {invitation && (
                    <span className="mt-1.5 block text-[11px] text-ink/40">This email is fixed by your workspace invitation.</span>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-foreground/65">Verification code</Label>
                  <Input
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="h-14 bg-background/70 text-center text-2xl font-semibold tracking-[.35em]"
                  />
                </div>
                {developmentCode && (
                  <div className="rounded-xl border border-[#F5A543]/30 bg-[#FFF8EC] px-3 py-2 text-xs text-[#8D5A20]">
                    <p className="font-semibold">Development OTP</p>
                    <p className="mt-1 font-mono text-lg tracking-[.3em]">{developmentCode}</p>
                  </div>
                )}
                {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm text-coral-600">{error}</p>}
                {message && <p className="rounded-xl bg-mint px-3 py-2 text-sm text-[#2C8350]">{message}</p>}
                <Button type="submit" disabled={busy} className="w-full py-3">
                  {busy ? (
                    <AppLoader size="xs" label="Verifying…" />
                  ) : (
                    <>
                      Verify email <Icon name="arrow" size={16} />
                    </>
                  )}
                </Button>
              </form>
              <button
                type="button"
                onClick={resend}
                disabled={resending}
                className="mt-5 w-full text-center text-xs font-semibold text-coral-600 hover:text-coral disabled:opacity-50"
              >
                {resending ? <AppLoader size="xs" label="Sending…" className="justify-center" /> : 'Didn’t receive a code? Send again'}
              </button>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}

function getSafeNextPath() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}
