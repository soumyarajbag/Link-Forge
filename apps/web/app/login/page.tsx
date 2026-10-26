'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError, apiMutation, apiRequest } from '@/lib/api';
import { Icon } from '@/components/icons';
import { Button, Logo } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLoader } from '@/components/app-loader';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [invitationMode, setInvitationMode] = useState(false);
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invitation = params.get('invitation');
    if (params.get('mode') === 'register') setMode('register');
    if (params.get('email')) setEmail(params.get('email') || '');
    if (!invitation) return;

    setInvitationMode(true);
    setInvitationLoading(true);
    apiRequest<{ invitation: { email: string } }>(`/v1/invitations/${encodeURIComponent(invitation)}`)
      .then((data) => setEmail(data.invitation.email))
      .catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : 'Unable to load this invitation.'))
      .finally(() => setInvitationLoading(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === 'register' && password.length < 12) {
      setError('Use a password with at least 12 characters.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const data = await apiMutation<{ development_verification_code?: string }>(
        mode === 'login' ? '/v1/auth/login' : '/v1/auth/register',
        mode === 'login'
          ? { email, password }
          : { email, password, display_name: name, ...(getInvitationToken() ? { invitation_token: getInvitationToken() } : {}) },
      );
      if (mode === 'register') {
        if (data.development_verification_code)
          sessionStorage.setItem('linkforge_dev_verification_code', data.development_verification_code);
        window.location.replace(getVerificationPath(email));
        return;
      }
      const invitation = getInvitationToken();
      window.location.replace(invitation ? `/accept-invitation?token=${encodeURIComponent(invitation)}` : getSafeNextPath());
    } catch (cause: unknown) {
      if (cause instanceof ApiError && cause.code === 'email_verification_required') {
        window.location.replace(getVerificationPath(email));
        return;
      }
      setError(cause instanceof ApiError ? cause.message : 'The API is unavailable. Please try again.');
      setBusy(false);
    }
  }

  return (
    <main className="ambient-surface grid min-h-screen bg-background/50 lg:grid-cols-[.85fr_1.15fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-ink via-ink to-[#342E58] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-36 -top-20 h-96 w-96 rounded-full bg-coral/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-[#6C61B4]/30 blur-3xl" />
        <Logo dark />
        <div className="relative z-10 max-w-md pb-16">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[.2em] text-coral">A calmer link stack</p>
          <h1 className="text-5xl font-semibold leading-[1.02] tracking-[-.06em]">The place your links come to life.</h1>
          <p className="mt-6 text-base leading-7 text-white/50">Create a workspace for every idea, campaign, and story worth sharing.</p>
          <div className="mt-10 flex items-center gap-3 text-xs text-white/50">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-mint">
              <Icon name="check" size={15} />
            </span>{' '}
            Built for clarity, not clutter
          </div>
        </div>
        <p className="relative z-10 text-xs text-white/30">LinkForge · 2026</p>
      </section>
      <section className="flex items-center justify-center px-5 py-10">
        <div className="glass w-full max-w-lg rounded-[2rem] p-6 sm:p-10 lg:border-white/70">
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <Logo />
            <Link href="/" className="text-sm text-ink/50">
              Back home
            </Link>
          </div>
          <div className="mb-8">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-coral-600">
              {invitationMode ? 'Workspace invitation' : mode === 'login' ? 'Welcome back' : 'Start fresh'}
            </p>
            <h2 className="text-4xl font-semibold tracking-[-.06em]">
              {mode === 'login' ? 'Sign in to accept.' : invitationMode ? 'Create your account.' : 'Create your workspace.'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink/50">
              {invitationMode
                ? 'Continue with the email address that received this invitation.'
                : mode === 'login'
                  ? 'Pick up exactly where you left off.'
                  : 'Verify your email before opening your workspace.'}
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && <Field label="Your name" value={name} onChange={setName} placeholder="Avery Chen" />}
            <Field
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              readOnly={invitationMode}
              hint={invitationMode ? 'This email is fixed by your workspace invitation.' : undefined}
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="12+ characters"
              minLength={mode === 'register' ? 12 : 1}
            />
            <Button type="submit" disabled={busy || invitationLoading || !email} className="mt-3 w-full py-3">
              {busy || invitationLoading ? (
                <AppLoader
                  size="xs"
                  label={
                    invitationLoading
                      ? 'Loading invitation…'
                      : mode === 'register'
                        ? 'Sending verification code…'
                        : 'Opening your workspace…'
                  }
                />
              ) : (
                <>
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                  <Icon name="arrow" size={16} />
                </>
              )}
            </Button>
            {mode === 'login' && (
              <div className="text-right">
                <Link href="/forgot-password" className="text-xs font-semibold text-coral-600 hover:text-coral">
                  Forgot password?
                </Link>
              </div>
            )}
            {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm text-coral-600">{error}</p>}
          </form>
          {!invitationMode && (
            <>
              <div className="my-7 flex items-center gap-3 text-[11px] text-ink/30">
                <span className="h-px flex-1 bg-ink/10" /> or <span className="h-px flex-1 bg-ink/10" />
              </div>
              <button
                disabled
                className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm font-medium text-ink/40"
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-white">G</span> Google
                sign-in coming soon
              </button>
              <p className="mt-7 text-center text-sm text-ink/45">
                {mode === 'login' ? 'New to LinkForge?' : 'Already have an account?'}{' '}
                <button
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    setError('');
                  }}
                  className="font-semibold text-coral-600 hover:text-coral-600"
                >
                  {mode === 'login' ? 'Create an account' : 'Sign in'}
                </button>
              </p>
            </>
          )}
          <p className="mt-10 text-center text-[11px] leading-5 text-ink/30">
            By continuing, you agree to keep your links trustworthy and your destinations safe.
          </p>
        </div>
      </section>
    </main>
  );
}

function getSafeNextPath() {
  const params = new URLSearchParams(window.location.search);
  const requestedNext = params.get('next');
  const destination = params.get('destination');
  const next =
    requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//')
      ? requestedNext
      : destination && /^https?:\/\/[^\s]+$/i.test(destination)
        ? '/dashboard/links?create=1'
        : '/dashboard';
  if (!destination || !/^https?:\/\/[^\s]+$/i.test(destination)) return next;
  return `${next}${next.includes('?') ? '&' : '?'}destination=${encodeURIComponent(destination)}`;
}

function getVerificationPath(email: string) {
  const params = new URLSearchParams({ email });
  const next = getSafeNextPath();
  if (next !== '/dashboard') params.set('next', next);
  const invitation = getInvitationToken();
  if (invitation) params.set('invitation', invitation);
  return `/verify-email?${params.toString()}`;
}

function getInvitationToken() {
  return new URLSearchParams(window.location.search).get('invitation');
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  minLength,
  readOnly = false,
  hint,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minLength?: number;
  readOnly?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-foreground/65">{label}</Label>
      <Input
        required
        minLength={minLength}
        value={value}
        type={type}
        readOnly={readOnly}
        aria-readonly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={readOnly ? 'cursor-not-allowed bg-muted text-muted-foreground' : 'bg-card/80'}
      />
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
