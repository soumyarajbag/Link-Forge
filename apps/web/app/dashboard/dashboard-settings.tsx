'use client';

import { useEffect, useState } from 'react';
import { apiMutation, apiRequest, ApiError } from '@/lib/api';
import type { WorkspaceInvitation, WorkspaceMember } from '@/lib/types';
import { useDashboardContext } from './dashboard-shell';
import { Icon } from '@/components/icons';
import { Badge, Button, SectionLabel } from '@/components/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiKeysSettings } from './dashboard-api-keys';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { AppLoader } from '@/components/app-loader';

const memberRoles: Array<WorkspaceMember['role']> = ['admin', 'editor', 'analyst', 'viewer'];

export function SettingsView() {
  const { user, workspace, workspaces, setWorkspace } = useDashboardContext();
  const [activeTab, setActiveTab] = useState('workspace');
  const [name, setName] = useState(workspace.name);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<WorkspaceMember['role']>('editor');
  const [busyAction, setBusyAction] = useState<'create' | 'save' | ''>('');
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [memberBusyId, setMemberBusyId] = useState('');
  const [invitationToRevoke, setInvitationToRevoke] = useState<WorkspaceInvitation | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null);
  const [invitationLink, setInvitationLink] = useState('');
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    if (['workspace', 'team', 'developer'].includes(requestedTab || '')) setActiveTab(requestedTab!);
  }, []);

  useEffect(() => {
    let mounted = true;
    setName(workspace.name);
    setMembers([]);
    setInvitations([]);
    setInvitationLink('');
    setError('');
    setMessage('');
    setLoadingWorkspace(true);

    apiRequest<{ members: WorkspaceMember[] }>(`/v1/workspaces/${workspace.id}/members`)
      .then(async (memberData) => {
        if (!mounted) return;
        setMembers(memberData.members);
        const role = memberData.members.find((member) => member.user_id === user.id)?.role;
        if (role !== 'owner' && role !== 'admin') return;
        const invitationData = await apiRequest<{ invitations: WorkspaceInvitation[] }>(`/v1/workspaces/${workspace.id}/invitations`);
        if (mounted) setInvitations(invitationData.invitations);
      })
      .catch((cause: unknown) => {
        if (mounted) setError(cause instanceof Error ? cause.message : 'Unable to load workspace management data.');
      })
      .finally(() => {
        if (mounted) setLoadingWorkspace(false);
      });
    return () => {
      mounted = false;
    };
  }, [workspace.id, workspace.name, user.id]);

  const currentMember = members.find((member) => member.user_id === user.id);
  const canManage = currentMember?.role === 'owner' || currentMember?.role === 'admin';

  function changeTab(value: string) {
    setActiveTab(value);
    const url = new URL(window.location.href);
    if (value === 'workspace') url.searchParams.delete('tab');
    else url.searchParams.set('tab', value);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  async function saveWorkspace() {
    if (!name.trim()) return;
    setBusyAction('save');
    setError('');
    setMessage('');
    try {
      const data = await apiMutation<{ workspace: typeof workspace }>(`/v1/workspaces/${workspace.id}`, { name: name.trim() }, 'PATCH');
      setWorkspace(data.workspace);
      setSaved(true);
      setMessage('Workspace name updated.');
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to save workspace.');
    } finally {
      setBusyAction('');
    }
  }

  async function createWorkspace() {
    if (!newWorkspaceName.trim()) return;
    setBusyAction('create');
    setError('');
    setMessage('');
    try {
      const data = await apiMutation<{ workspace: typeof workspace }>('/v1/workspaces', { name: newWorkspaceName.trim() });
      setWorkspace(data.workspace);
      setNewWorkspaceName('');
      setMessage('Workspace created and selected.');
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to create workspace.');
    } finally {
      setBusyAction('');
    }
  }

  async function loadMembers() {
    const data = await apiRequest<{ members: WorkspaceMember[] }>(`/v1/workspaces/${workspace.id}/members`);
    setMembers(data.members);
  }

  async function loadInvitations() {
    const data = await apiRequest<{ invitations: WorkspaceInvitation[] }>(`/v1/workspaces/${workspace.id}/invitations`);
    setInvitations(data.invitations);
  }

  async function addMember() {
    if (!newMemberEmail.trim()) return;
    setMemberBusyId('new');
    setError('');
    setMessage('');
    try {
      const data = await apiMutation<{ invitation: WorkspaceInvitation; development_invitation_token?: string }>(
        `/v1/workspaces/${workspace.id}/invitations`,
        { email: newMemberEmail.trim(), role: newMemberRole },
        'POST',
      );
      await loadInvitations();
      setNewMemberEmail('');
      if (data.development_invitation_token)
        setInvitationLink(`${window.location.origin}/accept-invitation?token=${encodeURIComponent(data.development_invitation_token)}`);
      setMessage('Invitation sent. The recipient can register or sign in to join.');
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to send invitation.');
    } finally {
      setMemberBusyId('');
    }
  }

  async function revokeInvitation(invitation: WorkspaceInvitation) {
    setMemberBusyId(invitation.id);
    setError('');
    setMessage('');
    try {
      await apiMutation(`/v1/workspaces/${workspace.id}/invitations/${invitation.id}`, undefined, 'DELETE');
      await loadInvitations();
      setInvitationToRevoke(null);
      setMessage('Invitation revoked.');
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to revoke invitation.');
    } finally {
      setMemberBusyId('');
    }
  }

  async function updateMember(member: WorkspaceMember, role: WorkspaceMember['role']) {
    setMemberBusyId(member.user_id);
    setError('');
    setMessage('');
    try {
      await apiMutation(`/v1/workspaces/${workspace.id}/members/${member.user_id}`, { role, permissions: member.permissions }, 'PATCH');
      await loadMembers();
      setMessage('Member role updated.');
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to update member.');
    } finally {
      setMemberBusyId('');
    }
  }

  async function removeMember(member: WorkspaceMember) {
    setMemberBusyId(member.user_id);
    setError('');
    setMessage('');
    try {
      await apiMutation(`/v1/workspaces/${workspace.id}/members/${member.user_id}`, undefined, 'DELETE');
      await loadMembers();
      setMemberToRemove(null);
      setMessage('Member removed from this workspace.');
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to remove member.');
    } finally {
      setMemberBusyId('');
    }
  }

  if (loadingWorkspace) {
    return (
      <div className="animate-slide-up max-w-5xl">
        <SectionLabel
          eyebrow="Make it yours"
          title="Workspace settings"
          detail="Create and switch workspaces, manage team access, and configure developer credentials."
        />
        <AppLoader variant="panel" size="md" label="Loading workspace settings…" className="min-h-[28rem]" />
      </div>
    );
  }

  return (
    <div className="animate-slide-up max-w-5xl">
      <SectionLabel
        eyebrow="Make it yours"
        title="Workspace settings"
        detail="Create and switch workspaces, manage team access, and configure developer credentials."
      />
      {error && <div className="mb-5 rounded-2xl border border-coral/20 bg-coral-50 px-4 py-3 text-sm text-coral-600">{error}</div>}
      {message && <div className="mb-5 rounded-2xl border border-[#47B77A]/30 bg-mint px-4 py-3 text-sm text-[#2C8350]">{message}</div>}
      <Tabs value={activeTab} onValueChange={changeTab} className="w-full">
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max min-w-full justify-start sm:min-w-0">
            <TabsTrigger value="workspace">Workspace</TabsTrigger>
            <TabsTrigger value="team">Team access</TabsTrigger>
            {canManage && <TabsTrigger value="developer">Developer</TabsTrigger>}
          </TabsList>
        </div>
        <TabsContent value="workspace" className="space-y-5">
          <SettingsCard icon="users" title="Create a workspace" detail="Keep different brands, clients, or projects separated.">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={newWorkspaceName}
                onChange={(event) => setNewWorkspaceName(event.target.value)}
                placeholder="e.g. Acme marketing"
                className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-paper px-3.5 py-3 text-sm outline-none focus:border-coral/50"
              />
              <Button disabled={Boolean(busyAction) || !newWorkspaceName.trim()} onClick={createWorkspace}>
                {busyAction === 'create' ? <AppLoader size="xs" label="Creating…" /> : 'Create workspace'}
              </Button>
            </div>
          </SettingsCard>
          <SettingsCard
            icon="users"
            title="Your workspaces"
            detail={`${workspaces.length} ${workspaces.length === 1 ? 'workspace' : 'workspaces'} available. Select one to manage its links, members, and settings.`}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {workspaces.map((item) => {
                const selected = item.id === workspace.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setWorkspace(item)}
                    aria-pressed={selected}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${selected ? 'border-coral/35 bg-coral-50 shadow-sm' : 'border-ink/[.08] bg-paper hover:border-ink/20 hover:bg-white'}`}
                  >
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-bold ${selected ? 'bg-coral text-white' : 'bg-white text-coral-600'}`}
                    >
                      {item.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{item.name}</span>
                      <span className="mt-1 block truncate text-xs text-ink/40">
                        /{item.slug} · {item.plan} plan
                      </span>
                    </span>
                    {selected ? <Badge tone="green">Active</Badge> : <span className="text-xs font-semibold text-coral-600">Open</span>}
                  </button>
                );
              })}
            </div>
          </SettingsCard>
          <SettingsCard icon="settings" title="Workspace profile" detail={`Editing ${workspace.name}. Rename it for everyone on the team.`}>
            <label className="block max-w-md">
              <span className="mb-2 block text-xs font-semibold text-ink/55">Workspace name</span>
              <Input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaved(false);
                }}
                className="focus-ring w-full rounded-xl border border-ink/10 bg-paper px-3.5 py-3 text-sm outline-none focus:border-coral/50"
              />
            </label>
            <div className="mt-5 flex items-center gap-3">
              <Button disabled={Boolean(busyAction) || !canManage} onClick={saveWorkspace}>
                {busyAction === 'save' ? (
                  <AppLoader size="xs" label="Saving…" />
                ) : saved ? (
                  <>
                    <Icon name="check" size={15} /> Saved
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
              {!canManage && <span className="text-xs text-ink/40">Only workspace admins can rename it.</span>}
            </div>
          </SettingsCard>
        </TabsContent>
        <TabsContent value="team" className="space-y-5">
          <SettingsCard
            icon="users"
            title="Team access"
            detail="Invite anyone by email. They can register or sign in, then the invitation is applied automatically."
          >
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 rounded-2xl border border-ink/[.08] bg-paper p-3 sm:flex-row sm:items-center"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-coral-50 text-sm font-bold text-coral-600">
                    {(member.user?.display_name || member.user?.email || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {member.user?.display_name || 'Unknown user'}
                      {member.user_id === user.id && (
                        <span className="ml-2 text-[10px] font-normal uppercase tracking-[.12em] text-ink/35">You</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-ink/45">{member.user?.email || member.user_id}</p>
                  </div>
                  {member.role === 'owner' ? (
                    <Badge tone="purple">Owner</Badge>
                  ) : (
                    <select
                      disabled={!canManage || memberBusyId === member.user_id}
                      value={member.role}
                      onChange={(event) => updateMember(member, event.target.value as WorkspaceMember['role'])}
                      className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-coral/50"
                    >
                      {memberRoles.map((role) => (
                        <option key={role} value={role}>
                          {role[0]?.toUpperCase()}
                          {role.slice(1)}
                        </option>
                      ))}
                    </select>
                  )}
                  {member.role !== 'owner' && canManage && (
                    <button
                      type="button"
                      disabled={memberBusyId === member.user_id}
                      onClick={() => setMemberToRemove(member)}
                      className="rounded-xl px-3 py-2 text-xs font-semibold text-coral-600 hover:bg-coral-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                  {memberBusyId === member.user_id && <AppLoader variant="icon" size="xs" label="Updating member…" />}
                </div>
              ))}
            </div>
            {canManage ? (
              <>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="email"
                    value={newMemberEmail}
                    onChange={(event) => setNewMemberEmail(event.target.value)}
                    placeholder="teammate@example.com"
                    className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-paper px-3.5 py-3 text-sm outline-none focus:border-coral/50"
                  />
                  <select
                    value={newMemberRole}
                    onChange={(event) => setNewMemberRole(event.target.value as WorkspaceMember['role'])}
                    className="rounded-xl border border-ink/10 bg-paper px-3 py-3 text-sm outline-none focus:border-coral/50"
                  >
                    {memberRoles.map((role) => (
                      <option key={role} value={role}>
                        {role[0]?.toUpperCase()}
                        {role.slice(1)}
                      </option>
                    ))}
                  </select>
                  <Button disabled={memberBusyId === 'new' || !newMemberEmail.trim()} onClick={addMember}>
                    {memberBusyId === 'new' ? <AppLoader size="xs" label="Sending…" /> : 'Send invitation'}
                  </Button>
                </div>
                {invitations.length > 0 && (
                  <div className="mt-5 border-t border-ink/[.07] pt-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-ink/40">Pending invitations</p>
                    <div className="space-y-2">
                      {invitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex flex-col gap-2 rounded-2xl border border-ink/[.08] bg-paper p-3 sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{invitation.email}</p>
                            <p className="mt-1 text-xs text-ink/45">
                              <span className="capitalize">{invitation.role}</span> · expires{' '}
                              {new Date(invitation.expires_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={memberBusyId === invitation.id}
                            onClick={() => setInvitationToRevoke(invitation)}
                            className="self-start rounded-xl px-3 py-2 text-xs font-semibold text-coral-600 hover:bg-coral-50 disabled:opacity-50 sm:self-auto"
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {invitationLink && (
                  <div className="mt-4 rounded-2xl border border-[#F5A543]/30 bg-[#FFF8EC] p-4 text-xs text-[#8D5A20]">
                    <p className="font-semibold">Development invitation link</p>
                    <p className="mt-1 leading-5">SMTP is not configured, so use this link locally or copy it to the recipient.</p>
                    <a href={invitationLink} className="mt-2 block break-all font-mono underline">
                      {invitationLink}
                    </a>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-4 text-xs text-ink/40">You have read-only access to this workspace’s members.</p>
            )}
          </SettingsCard>
        </TabsContent>
        {canManage && (
          <TabsContent value="developer" className="space-y-5">
            <ApiKeysSettings workspaceId={workspace.id} workspaceName={workspace.name} />
          </TabsContent>
        )}
      </Tabs>
      <ConfirmDialog
        open={Boolean(invitationToRevoke)}
        onOpenChange={(open) => {
          if (!open) setInvitationToRevoke(null);
        }}
        title="Revoke this invitation?"
        description={`${invitationToRevoke?.email || 'This recipient'} will no longer be able to use the invitation to join ${workspace.name}.`}
        confirmLabel="Revoke invitation"
        pendingLabel="Revoking…"
        busy={Boolean(invitationToRevoke && memberBusyId === invitationToRevoke.id)}
        onConfirm={() => {
          if (invitationToRevoke) return revokeInvitation(invitationToRevoke);
        }}
      />
      <ConfirmDialog
        open={Boolean(memberToRemove)}
        onOpenChange={(open) => {
          if (!open) setMemberToRemove(null);
        }}
        title="Remove this member?"
        description={`${memberToRemove?.user?.display_name || memberToRemove?.user?.email || 'This member'} will lose access to ${workspace.name} and its links, analytics, and settings.`}
        confirmLabel="Remove member"
        pendingLabel="Removing…"
        busy={Boolean(memberToRemove && memberBusyId === memberToRemove.user_id)}
        onConfirm={() => {
          if (memberToRemove) return removeMember(memberToRemove);
        }}
      />
    </div>
  );
}

function SettingsCard({
  icon,
  title,
  detail,
  children,
}: {
  icon: 'users' | 'settings';
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="group overflow-hidden hover:-translate-y-0.5 hover:border-primary/15 hover:shadow-lift">
      <CardHeader className="flex-row items-start gap-3 space-y-0 p-5 sm:p-7">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-secondary to-accent text-foreground/60 shadow-sm transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105">
          <Icon name={icon} size={18} />
        </span>
        <div className="space-y-1">
          <CardTitle className="text-sm">{title}</CardTitle>
          <CardDescription className="text-xs">{detail}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0 sm:p-7 sm:pt-0">{children}</CardContent>
    </Card>
  );
}
