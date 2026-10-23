'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, apiMutation, apiRequest } from '@/lib/api';
import type { User, Workspace, WorkspaceInvitation } from '@/lib/types';
import { Logo } from '@/components/ui';
import { Card } from '@/components/ui/card';

type InvitationDetails = {
  invitation: Pick<WorkspaceInvitation, 'id' | 'email' | 'role' | 'expires_at'>;
  workspace: Workspace;
  account_exists: boolean;
};

export default function AcceptInvitationPage() {
  const [token, setToken] = useState('');
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const invitationToken = new URLSearchParams(window.location.search).get('token') || '';
    setToken(invitationToken);
    if (!invitationToken) {
      setError('This invitation link is missing its token.');
      return;
    }
    apiRequest<InvitationDetails>(`/v1/invitations/${encodeURIComponent(invitationToken)}`)
      .then(setDetails)
      .catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : 'This invitation is no longer available.'));
  }, []);

  async function continueAsSignedInUser() {
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      const data = await apiMutation<{ workspace: Workspace }>('/v1/invitations/accept', { token });
      window.localStorage.setItem('linkforge_workspace_id', data.workspace.id);
      window.location.replace('/dashboard');
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to accept this invitation.');
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!details || !token) return;
    apiRequest<{ user: User }>('/v1/auth/me')
      .then(() => continueAsSignedInUser())
      .catch(() => undefined);
    // The public invitation page deliberately remains usable when there is no session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details, token]);

  return (
    <main className="ambient-surface grid min-h-screen place-items-center bg-background/50 px-5 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-10 flex items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-ink/50">
            Back home
          </Link>
        </div>
        <Card className="shine-border p-6 sm:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-coral-600">Workspace invitation</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.06em]">You’ve been invited.</h1>
          {details ? (
            <>
              <p className="mt-3 text-sm leading-6 text-ink/55">
                <strong className="text-ink">{details.workspace.name}</strong> invited{' '}
                <strong className="text-ink">{details.invitation.email}</strong> to join with the{' '}
                <strong className="text-ink">{details.invitation.role}</strong> role.
              </p>
              <div className="mt-7 space-y-3">
                {details.account_exists ? (
                  <Link
                    href={`/login?mode=login&invitation=${encodeURIComponent(token)}&email=${encodeURIComponent(details.invitation.email)}`}
                    className="block rounded-xl border border-coral/20 bg-coral-50 px-4 py-3 text-center text-sm font-semibold text-coral-700 hover:bg-coral-100"
                  >
                    Sign in to accept
                  </Link>
                ) : (
                  <Link
                    href={`/login?mode=register&invitation=${encodeURIComponent(token)}&email=${encodeURIComponent(details.invitation.email)}`}
                    className="block rounded-xl border border-coral/20 bg-coral-50 px-4 py-3 text-center text-sm font-semibold text-coral-700 hover:bg-coral-100"
                  >
                    Create an account
                  </Link>
                )}
              </div>
              <p className="mt-5 text-center text-xs leading-5 text-ink/40">
                {details.account_exists
                  ? 'Sign in with the invited email and the invitation will be applied automatically.'
                  : 'Create your account and verify the invited email to join this workspace.'}
              </p>
            </>
          ) : (
            <div className="mt-6 rounded-2xl bg-coral-50 px-4 py-3 text-sm text-coral-700">{error || 'Loading invitation…'}</div>
          )}
          {error && details && <p className="mt-4 rounded-xl bg-coral-50 px-3 py-2 text-sm text-coral-600">{error}</p>}
        </Card>
      </div>
    </main>
  );
}
