'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError, apiMutation } from '@/lib/api';
import { Icon } from '@/components/icons';
import { Button, Logo } from '@/components/ui';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 12) {
      setError('Use a password with at least 12 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await apiMutation('/v1/auth/password-reset/confirm', { token, password });
      setComplete(true);
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to reset your password.');
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
            <Icon name="shield" size={20} />
          </span>
          <h1 className="text-3xl font-semibold tracking-[-.06em]">Choose a new password.</h1>
          <p className="mt-3 text-sm leading-6 text-ink/50">Use at least 12 characters. Your existing sessions will be signed out.</p>
          {complete ? (
            <div className="mt-7 space-y-4">
              <p className="rounded-xl bg-mint px-3 py-3 text-sm text-[#2C8350]">Your password has been updated.</p>
              <Link href="/login" className="block text-center text-sm font-semibold text-coral-600">
                Continue to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-foreground/65">Reset token</Label>
                <Input
                  required
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="Paste your reset token"
                  className="bg-background/70"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-foreground/65">New password</Label>
                <Input
                  required
                  minLength={12}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="12+ characters"
                  className="bg-background/70"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-foreground/65">Confirm password</Label>
                <Input
                  required
                  minLength={12}
                  type="password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="Repeat your password"
                  className="bg-background/70"
                />
              </div>
              {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm text-coral-600">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full py-3">
                {busy ? 'Updating…' : 'Update password'}
                <Icon name="arrow" size={16} />
              </Button>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
