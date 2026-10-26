'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, LogOut, Settings2 } from 'lucide-react';
import { apiMutation, apiRequest, ApiError } from '@/lib/api';
import type { User, Workspace } from '@/lib/types';
import { Icon } from '@/components/icons';
import { Logo } from '@/components/ui';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const nav = [
  { href: '/dashboard', label: 'Overview', icon: 'barChart' as const },
  { href: '/dashboard/links', label: 'All links', icon: 'link' as const },
  { href: '/dashboard/analytics', label: 'Analytics', icon: 'click' as const },
  { href: '/dashboard/settings', label: 'Settings', icon: 'settings' as const },
];
const adminNavItem = { href: '/dashboard/admin', label: 'Platform admin', icon: 'shield' as const };

type DashboardContextValue = { user: User; workspace: Workspace; workspaces: Workspace[]; setWorkspace: (workspace: Workspace) => void };
const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboardContext must be used inside DashboardShell');
  return context;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([apiRequest<{ user: User }>('/v1/auth/me'), apiRequest<{ workspaces: Workspace[] }>('/v1/workspaces')])
      .then(([session, workspaceResponse]) => {
        if (!mounted) return;
        const available = workspaceResponse.workspaces;
        const rememberedId = window.localStorage.getItem('linkforge_workspace_id');
        const currentWorkspace = available.find((item) => item.id === rememberedId) || available[0];
        if (!currentWorkspace) {
          setError('Your account does not have an active workspace yet.');
          return;
        }
        setUser(session.user);
        setWorkspaces(available);
        setCurrentWorkspace(currentWorkspace);
      })
      .catch((cause: unknown) => {
        if (!mounted) return;
        if (cause instanceof ApiError && cause.status === 401) {
          const next = `${window.location.pathname}${window.location.search}`;
          window.location.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
        setError(cause instanceof Error ? cause.message : 'Unable to load your workspaces.');
      });
    return () => {
      mounted = false;
    };
  }, []);

  const initials = useMemo(() => {
    if (!user) return '';
    return user.display_name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  function setWorkspace(next: Workspace) {
    setCurrentWorkspace(next);
    setWorkspaces((current) =>
      current.some((item) => item.id === next.id) ? current.map((item) => (item.id === next.id ? next : item)) : [next, ...current],
    );
    window.localStorage.setItem('linkforge_workspace_id', next.id);
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await apiMutation('/v1/auth/logout');
    } catch {
      /* Redirect still removes the protected dashboard from view. */
    }
    window.location.replace('/login');
  }

  if (error)
    return (
      <main className="grid min-h-screen place-items-center bg-paper px-5 text-center">
        <div className="max-w-md rounded-3xl border border-ink/[.08] bg-white p-8">
          <Logo />
          <h1 className="mt-8 text-2xl font-semibold">Workspace unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-ink/50">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white">
            Try again
          </button>
        </div>
      </main>
    );
  if (!user || !workspace)
    return (
      <main className="grid min-h-screen place-items-center bg-paper">
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-coral/30" aria-label="Loading workspaces" />
      </main>
    );

  const navigation = user.is_platform_admin ? [...nav, adminNavItem] : nav;

  return (
    <DashboardContext.Provider value={{ user, workspace, workspaces, setWorkspace }}>
      <div className="ambient-surface min-h-screen bg-background/60 text-ink">
        <aside className="glass fixed inset-y-0 left-0 z-30 hidden w-[244px] border-y-0 border-l-0 px-4 py-5 lg:block">
          <Logo />
          <div className="mt-10 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-ink/30">Workspace</div>
          <div className="mt-3">
            <WorkspacePicker workspace={workspace} workspaces={workspaces} onSelect={setWorkspace} />
          </div>
          <nav className="mt-8 space-y-1">
            {navigation.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${active ? 'bg-gradient-to-r from-ink to-ink/90 text-white shadow-md' : 'text-ink/50 hover:translate-x-0.5 hover:bg-secondary/70 hover:text-ink'}`}
                >
                  <Icon name={item.icon} size={17} />
                  <span>{item.label}</span>
                  {item.href === '/dashboard/admin' && (
                    <span className="ml-auto rounded-full bg-coral/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-coral-600">
                      Admin
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="absolute bottom-5 left-4 right-4">
            <button
              disabled={loggingOut}
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/75 px-3 py-2.5 text-sm font-semibold text-muted-foreground shadow-sm transition-all hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </aside>
        <div className="lg:pl-[244px]">
          <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/70 px-5 backdrop-blur-2xl lg:px-10">
            <div className="flex items-center gap-3 lg:hidden">
              <Logo />
              <WorkspacePicker compact workspace={workspace} workspaces={workspaces} onSelect={setWorkspace} />
            </div>
            <div className="hidden items-center gap-3 lg:flex">
              <WorkspacePicker compact workspace={workspace} workspaces={workspaces} onSelect={setWorkspace} />
              <span className="h-7 w-px bg-ink/10" />
              <span className="font-medium text-ink">
                {pathname.includes('/api-docs')
                  ? 'API Documentation'
                  : pathname.includes('/admin')
                    ? 'Platform Admin'
                    : pathname.includes('analytics')
                      ? 'Analytics'
                      : pathname.includes('links')
                        ? 'All links'
                        : pathname.includes('settings')
                          ? 'Settings'
                          : 'Overview'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/links?create=1"
                className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-coral to-[#EF5B75] text-white shadow-[0_8px_20px_rgba(255,107,97,.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(255,107,97,.36)]"
                aria-label="Create link"
              >
                <Icon name="plus" size={17} />
              </Link>
              <Link
                href="/dashboard/settings"
                className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-lilac to-violet-200 text-xs font-bold text-[#6652BC] shadow-sm ring-2 ring-transparent transition-all hover:-translate-y-0.5 hover:ring-violet-200 focus:outline-none focus:ring-4 focus:ring-ring/20"
                aria-label="Open profile and settings"
                title="Profile and settings"
              >
                {initials}
              </Link>
            </div>
          </header>
          <nav className="flex gap-1 overflow-x-auto border-b border-border/70 bg-background/80 px-5 py-2 backdrop-blur-xl lg:hidden">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${pathname === item.href ? 'bg-ink text-white' : 'text-ink/50'}`}
              >
                <Icon name={item.icon} size={14} />
                {item.label}
              </Link>
            ))}
          </nav>
          <main className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10 lg:py-10">{children}</main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}

function WorkspacePicker({
  workspace,
  workspaces,
  onSelect,
  compact = false,
}: {
  workspace: Workspace;
  workspaces: Workspace[];
  onSelect: (workspace: Workspace) => void;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={`Switch workspace. Current workspace: ${workspace.name}`}
          className={`group h-auto justify-start gap-3 rounded-2xl border border-transparent bg-secondary/55 px-3 text-left shadow-none hover:translate-y-0 hover:border-border hover:bg-card data-[state=open]:border-primary/20 data-[state=open]:bg-card data-[state=open]:shadow-soft ${compact ? 'w-[min(210px,48vw)] py-2' : 'w-full py-3'}`}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-coral to-[#8D76E8] text-sm font-bold text-white shadow-sm">
            {workspace.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-foreground">{workspace.name}</span>
            <span className="block text-[10px] font-normal text-muted-foreground">
              {workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72" sideOffset={8}>
        <DropdownMenuLabel className="flex items-center justify-between text-muted-foreground">
          <span>Switch workspace</span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">{workspaces.length}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((item) => {
          const selected = item.id === workspace.id;
          return (
            <DropdownMenuItem key={item.id} onSelect={() => onSelect(item)} className="gap-3 py-2.5">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold ${selected ? 'bg-gradient-to-br from-coral to-[#8D76E8] text-white' : 'bg-secondary text-secondary-foreground'}`}
              >
                {item.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{item.name}</span>
                <span className="block text-[10px] capitalize text-muted-foreground">{item.plan} plan</span>
              </span>
              {selected && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings" className="gap-3 text-muted-foreground">
            <Settings2 className="h-4 w-4" />
            Manage workspaces
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
