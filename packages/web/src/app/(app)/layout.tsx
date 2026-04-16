'use client';

import type { AuthenticatedUser } from '@ai-tutor-pwa/shared';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  ChevronLeft,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Upload,
  Zap,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
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
    await api.signOut();
    router.push('/');
  }

  const sidebarContent = (
    <aside
      className={cn(
        'flex flex-col h-full bg-surface border-r border-surface-border transition-all duration-200',
        collapsed ? 'w-16' : 'w-56',
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex items-center border-b border-surface-border shrink-0',
          collapsed ? 'justify-center h-14 px-2' : 'gap-3 h-14 px-4',
        )}
      >
        <div className="shrink-0 w-8 h-8 rounded-lg bg-amber flex items-center justify-center">
          <BookOpen size={16} className="text-ink" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <span className="font-display text-base font-700 text-cream truncate">
            Studium
          </span>
        )}
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
        {user !== null && !collapsed && (
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-amber to-amber-600/80 flex items-center justify-center text-ink text-xs font-bold shrink-0">
              {(user.username ?? user.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="label-mono text-xs text-cream truncate">
                {user.username ?? user.email.split('@')[0]}
              </p>
              <p className="label-mono text-xs text-cream-muted truncate">
                {user.email}
              </p>
            </div>
            <button
              onClick={() => void handleLogout()}
              className="shrink-0 p-1 text-cream-muted hover:text-cream transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}

        <div
          className={cn(
            'px-2 pb-3',
            collapsed && 'flex flex-col items-center gap-1',
          )}
        >
          {collapsed && user !== null && (
            <button
              onClick={() => void handleLogout()}
              className="p-2 text-cream-muted hover:text-cream hover:bg-surface-hover rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          )}
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className={cn(
              'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-cream-muted hover:text-cream hover:bg-surface-hover transition-colors label-mono text-xs',
              collapsed && 'justify-center',
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              size={14}
              className={cn('transition-transform', collapsed && 'rotate-180')}
            />
            {!collapsed && 'Collapse'}
          </button>
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
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-amber flex items-center justify-center">
              <BookOpen size={14} className="text-ink" strokeWidth={2.5} />
            </div>
            <span className="font-display text-sm font-700 text-cream">Studium</span>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
