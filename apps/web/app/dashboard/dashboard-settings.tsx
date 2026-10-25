'use client';

import { useEffect, useState } from 'react';
import { apiDocsURL, apiMutation, apiRequest, ApiError } from '@/lib/api';
import type { Domain, WorkspaceInvitation, WorkspaceMember } from '@/lib/types';
import { useDashboardContext } from './dashboard-shell';
import { Icon } from '@/components/icons';
import { Badge, Button, SectionLabel } from '@/components/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const memberRoles: Array<WorkspaceMember['role']> = ['admin', 'editor', 'analyst', 'viewer'];

export function SettingsView() {
  const { user, workspace, workspaces, setWorkspace } = useDashboardContext();
  const [name, setName] = useState(workspace.name);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [domains, setDomains] = useState<Domain[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [newHostname, setNewHostname] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<WorkspaceMember['role']>('editor');
  const [verification, setVerification] = useState<{ hostname: string; value: string } | null>(null);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [memberBusyId, setMemberBusyId] = useState('');
  const [invitationLink, setInvitationLink] = useState('');
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setName(workspace.name);
    setDomains([]);
    setMembers([]);
    setInvitations([]);
    setInvitationLink('');
    setVerification(null);
    setTokens({});
    setError('');
    setMessage('');

    Promise.all([
      apiRequest<{ domains: Domain[] }>(`/v1/workspaces/${workspace.id}/domains`),
      apiRequest<{ members: WorkspaceMember[] }>(`/v1/workspaces/${workspace.id}/members`),
    ])
      .then(async ([domainData, memberData]) => {
        if (!mounted) return;
        setDomains(domainData.domains);
        setMembers(memberData.members);
        const role = memberData.members.find((member) => member.user_id === user.id)?.role;
        if (role !== 'owner' && role !== 'admin') return;
        const invitationData = await apiRequest<{ invitations: WorkspaceInvitation[] }>(`/v1/workspaces/${workspace.id}/invitations`);
        if (mounted) setInvitations(invitationData.invitations);
      })
      .catch((cause: unknown) => {
        if (mounted) setError(cause instanceof Error ? cause.message : 'Unable to load workspace management data.');
      });
    return () => {
      mounted = false;
    };
  }, [workspace.id, workspace.name, user.id]);

  const currentMember = members.find((member) => member.user_id === user.id);
  const canManage = currentMember?.role === 'owner' || currentMember?.role === 'admin';

  async function saveWorkspace() {
    if (!name.trim()) return;
    setBusy(true);
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
      setBusy(false);
    }
  }

  async function createWorkspace() {
    if (!newWorkspaceName.trim()) return;
    setBusy(true);
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
      setBusy(false);
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
    if (!window.confirm(`Revoke the invitation for ${invitation.email}?`)) return;
    setMemberBusyId(invitation.id);
    setError('');
    setMessage('');
    try {
      await apiMutation(`/v1/workspaces/${workspace.id}/invitations/${invitation.id}`, undefined, 'DELETE');
      await loadInvitations();
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
    if (!window.confirm(`Remove ${member.user?.display_name || member.user?.email || 'this member'} from the workspace?`)) return;
    setMemberBusyId(member.user_id);
    setError('');
    setMessage('');
    try {
      await apiMutation(`/v1/workspaces/${workspace.id}/members/${member.user_id}`, undefined, 'DELETE');
      await loadMembers();
      setMessage('Member removed from this workspace.');
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to remove member.');
    } finally {
      setMemberBusyId('');
    }
  }

  async function addDomain() {
    if (!newHostname.trim()) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await apiMutation<{ domain: Domain; verification: { hostname: string; value: string } }>(
        `/v1/workspaces/${workspace.id}/domains`,
        { hostname: newHostname.trim() },
        'POST',
      );
      setDomains((current) => [...current, data.domain]);
      setVerification(data.verification);
      setNewHostname('');
      setMessage('Domain added. Complete the DNS verification step.');
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to add domain.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyDomain(domainId: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await apiMutation<{ domain: Domain }>(`/v1/domains/${domainId}/verify`, { token: tokens[domainId] }, 'POST');
      setDomains((current) => current.map((domain) => (domain.id === domainId ? data.domain : domain)));
      setMessage('Domain verified.');
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to verify domain.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-slide-up max-w-5xl">
      <SectionLabel
        eyebrow="Make it yours"
        title="Workspace settings"
        detail="Create and switch workspaces, manage team access, and configure custom domains through the API."
      />
      {error && <div className="mb-5 rounded-2xl border border-coral/20 bg-coral-50 px-4 py-3 text-sm text-coral-600">{error}</div>}
      {message && <div className="mb-5 rounded-2xl border border-[#47B77A]/30 bg-mint px-4 py-3 text-sm text-[#2C8350]">{message}</div>}
      <Tabs defaultValue="workspace" className="w-full">
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max min-w-full justify-start sm:min-w-0">
            <TabsTrigger value="workspace">Workspace</TabsTrigger>
            <TabsTrigger value="team">Team access</TabsTrigger>
            <TabsTrigger value="domains">Domains</TabsTrigger>
            <TabsTrigger value="security">Security & defaults</TabsTrigger>
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
              <Button disabled={busy || !newWorkspaceName.trim()} onClick={createWorkspace}>
                Create workspace
              </Button>
            </div>
          </SettingsCard>
          <SettingsCard
            icon="users"
            title="Your workspaces"
            detail={`${workspaces.length} ${workspaces.length === 1 ? 'workspace' : 'workspaces'} available. Select one to manage its links, members, and domains.`}
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
              <Button disabled={busy || !canManage} onClick={saveWorkspace}>
                {saved ? (
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
                      onClick={() => removeMember(member)}
                      className="rounded-xl px-3 py-2 text-xs font-semibold text-coral-600 hover:bg-coral-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
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
                    Send invitation
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
                            onClick={() => revokeInvitation(invitation)}
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
        <TabsContent value="domains" className="space-y-5">
          <SettingsCard icon="globe" title="Branded domains" detail="Use a domain that already feels like you.">
            <div className="space-y-3">
              {domains.map((domain) => (
                <div key={domain.id} className="rounded-2xl border border-ink/[.08] bg-paper p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{domain.hostname}</p>
                      <p className="mt-1 text-[11px] text-ink/40">{domain.kind === 'custom' ? 'Custom domain' : 'Platform domain'}</p>
                    </div>
                    <Badge tone={domain.status === 'active' ? 'green' : domain.status === 'pending' ? 'orange' : 'neutral'}>
                      {domain.status}
                    </Badge>
                  </div>
                  {domain.status === 'pending' && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={tokens[domain.id] || ''}
                        onChange={(event) => setTokens((current) => ({ ...current, [domain.id]: event.target.value }))}
                        placeholder="DNS verification token"
                        className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs outline-none"
                      />
                      <Button
                        disabled={busy || !tokens[domain.id] || !canManage}
                        onClick={() => verifyDomain(domain.id)}
                        className="px-3 py-2"
                      >
                        Verify
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {domains.length === 0 && <p className="rounded-2xl bg-paper p-4 text-sm text-ink/45">No domains configured yet.</p>}
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input
                value={newHostname}
                onChange={(event) => setNewHostname(event.target.value)}
                placeholder="go.example.com"
                disabled={!canManage}
                className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-paper px-3.5 py-3 text-sm outline-none disabled:opacity-50"
              />
              <Button disabled={busy || !newHostname.trim() || !canManage} onClick={addDomain}>
                Add domain
              </Button>
            </div>
            {verification && (
              <div className="mt-4 rounded-2xl border border-coral/15 bg-coral-50 p-4 text-xs text-coral-700">
                <p className="font-semibold">Add this DNS TXT record before verifying:</p>
                <p className="mt-2 break-all">Host: {verification.hostname}</p>
                <p className="mt-1 break-all">Value: {verification.value}</p>
              </div>
            )}
          </SettingsCard>
        </TabsContent>
        <TabsContent value="security" className="space-y-5">
          <SettingsCard icon="shield" title="Security" detail="Keep your account and workspace protected.">
            <SettingRow
              title="Two-step verification"
              copy="Add another layer when signing in."
              action={<Badge tone="orange">Coming soon</Badge>}
            />
            <SettingRow
              title="API keys"
              copy="Scoped API key management is available through the backend API and Swagger documentation."
              action={
                <a href={apiDocsURL()} target="_blank" rel="noreferrer" className="text-xs font-semibold text-coral-600">
                  Open API docs
                </a>
              }
            />
          </SettingsCard>
          <SettingsCard icon="link" title="Link defaults" detail="Defaults currently enforced by the backend.">
            <SettingRow
              title="Default redirect"
              copy="Temporary redirects keep destinations editable."
              action={<Badge tone="blue">302</Badge>}
            />
            <SettingRow
              title="Analytics retention"
              copy="Click events are retained according to backend configuration."
              action={<span className="text-xs font-semibold text-ink/60">Configured on API</span>}
            />
          </SettingsCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingsCard({
  icon,
  title,
  detail,
  children,
}: {
  icon: 'users' | 'globe' | 'shield' | 'link' | 'settings';
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
function SettingRow({ title, copy, action }: { title: string; copy: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-ink/[.07] py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-ink/40">{copy}</p>
      </div>
      {action}
    </div>
  );
}
