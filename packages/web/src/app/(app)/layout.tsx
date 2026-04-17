'use client';

import type { AuthenticatedUser } from '@ai-tutor-pwa/shared';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  Upload,
  UserCircle2,
  Zap,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useToast, useTheme } from '@/components';

interface NavItemConfig {
  href: string;
  icon: ReactNode;
  label: string;
  badge?: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  { href: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { href: '/session', icon: <Zap size={18} />, label: 'Study Session' },
  { href: '/upload', icon: <Upload size={18} />, label: 'Upload' },
  { href: '/courses', icon: <GraduationCap size={18} />, label: 'Courses' },
  { href: '/settings', icon: <Settings size={18} />, label: 'Settings' },
];

function SidebarNavItem({
  href,
  icon,
  label,
  active,
  collapsed,
}: NavItemConfig & { active: boolean; collapsed: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'nav-item',
        active && 'active',
        collapsed && 'justify-center px-3',
      )}
      title={collapsed ? label : undefined}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    api.getSession()
      .then((session) => setUser(session.user))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push('/signin');
        }
      });
  }, [router]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await api.signOut();
      showToast({
        title: 'Signed out',
        description: 'Your session ended safely.',
        variant: 'success',
      });
      router.push('/');
    } catch (error) {
      showToast({
        title: 'Could not sign out',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setLoggingOut(false);
    }
  }

  const sidebarContent = (
    <aside
      className={cn(
        'flex flex-col h-full bg-surface border-r border-surface-border transition-all duration-200',
        collapsed ? 'w-16' : 'w-56',
      )}
    >
      <div className="shrink-0 border-b border-surface-border px-2 py-2">
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-cream-muted transition-colors hover:bg-surface-hover hover:text-cream',
            collapsed && 'justify-center',
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          type="button"
        >
          <ChevronLeft
            size={16}
            className={cn('transition-transform', collapsed && 'rotate-180')}
          />
          {!collapsed && <span className="label-mono text-xs">Collapse</span>}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.href}
            {...item}
            active={
              item.href === '/session'
                ? pathname.startsWith('/session')
                : pathname === item.href
            }
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* User + collapse toggle */}
      <div className="shrink-0 border-t border-surface-border">
        <div className="px-2 py-3 space-y-2">
          <button
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border border-surface-border bg-ink/20 px-3 py-3 text-left transition-all hover:border-amber/40 hover:bg-surface-hover',
              collapsed && 'justify-center px-2',
            )}
            onClick={() => router.push('/settings')}
            title="Open settings"
            type="button"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber to-amber-600/80 text-ink">
              <UserCircle2 size={18} />
            </div>
            {!collapsed && user !== null && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-cream">
                  {user.username ?? user.email.split('@')[0]}
                </p>
                <p className="truncate text-xs text-cream-muted">{user.email}</p>
              </div>
            )}
          </button>

          <div className={cn('flex gap-2', collapsed && 'flex-col')}>
            <button
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-cream-muted transition-colors hover:bg-surface-hover hover:text-cream',
                collapsed ? 'w-full' : 'flex-1',
              )}
              onClick={toggleTheme}
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              type="button"
            >
              {resolvedTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              {!collapsed && (
                <span className="label-mono text-xs">
                  {resolvedTheme === 'dark' ? 'Light' : 'Dark'}
                </span>
              )}
            </button>

            <button
              onClick={() => void handleLogout()}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-cream-muted transition-colors hover:bg-red-500/10 hover:text-red-300',
                collapsed ? 'w-full' : 'flex-1',
              )}
              title="Sign out"
              type="button"
            >
              {loggingOut ? (
                <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                <LogOut size={15} />
              )}
              {!collapsed && (
                <span className="label-mono text-xs">
                  {loggingOut ? 'Signing out...' : 'Sign out'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-ink overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">{sidebarContent}</div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" />
          <div className="absolute left-0 inset-y-0 flex" onClick={(e) => e.stopPropagation()}>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-surface-border bg-surface shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-cream-muted hover:text-cream hover:bg-surface-hover rounded-lg transition-colors"
            type="button"
          >
            <Menu size={20} />
          </button>
          <span className="label-mono text-xs text-cream-muted">Navigation</span>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
