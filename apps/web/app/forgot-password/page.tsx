'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ApiError, apiMutation } from '@/lib/api';
import { Icon } from '@/components/icons';
import { Button, Logo } from '@/components/ui';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLoader } from '@/components/app-loader';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [developmentLink, setDevelopmentLink] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await apiMutation<{ development_reset_token?: string }>('/v1/auth/password-reset/request', { email });
      if (data.development_reset_token) setDevelopmentLink(`/reset-password?token=${encodeURIComponent(data.development_reset_token)}`);
      setSent(true);
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to request a password reset.');
    } finally {
      setBusy(false);
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
          <span className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-coral-50 text-coral-600">
            <Icon name="link" size={20} />
          </span>
          <h1 className="text-3xl font-semibold tracking-[-.06em]">Reset your password.</h1>
          <p className="mt-3 text-sm leading-6 text-ink/50">Enter your email and we’ll send a secure reset link if an account exists.</p>
          {sent ? (
            <div className="mt-7 space-y-4">
              <p className="rounded-xl bg-mint px-3 py-3 text-sm text-[#2C8350]">
                If the account exists, reset instructions have been sent.
              </p>
              {developmentLink && (
                <Link
                  href={developmentLink}
                  className="block rounded-xl border border-[#F5A543]/30 bg-[#FFF8EC] px-3 py-3 text-sm font-semibold text-[#8D5A20]"
                >
                  Open development reset link <Icon name="arrow" size={14} />
                </Link>
              )}
              <Link href="/login" className="block text-center text-sm font-semibold text-coral-600">
                Return to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-foreground/65">Email address</Label>
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="bg-background/70"
                />
              </div>
              {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm text-coral-600">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full py-3">
                {busy ? (
                  <AppLoader size="xs" label="Sending…" />
                ) : (
                  <>
                    Send reset link <Icon name="arrow" size={16} />
                  </>
                )}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
