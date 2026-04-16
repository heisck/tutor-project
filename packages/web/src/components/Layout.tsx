'use client';

import type { AuthenticatedUser } from '@ai-tutor-pwa/shared';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LogOut } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  minimal?: boolean;
}

export function Header({ title, subtitle, action, minimal }: HeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', !minimal && 'py-6 border-b border-ink-700')}>
      <div>
        <h1 className="text-3xl font-bold text-cream-50 font-fraunces">{title}</h1>
        {subtitle && <p className="text-cream-400 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface NavbarProps {
  user?: Pick<AuthenticatedUser, 'email' | 'username'> & { avatar?: string };
  onLogout?: () => void;
}

export function Navbar({ user, onLogout }: NavbarProps) {
  return (
    <nav className="bg-gradient-to-r from-ink-900 to-ink-800 border-b border-ink-700 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <span className="text-ink font-bold text-sm font-fraunces">S</span>
          </div>
          <span className="text-xl font-bold text-cream-50 font-fraunces hidden sm:inline">Studium</span>
        </Link>

        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-cream-50">
                  {user.username || user.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-cream-500">Active</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-ai-blue-400 to-mastery-400 flex items-center justify-center text-ink font-bold">
                {(user.username || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 text-cream-400 hover:text-cream-50 hover:bg-ink-700 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export function Message({ role, content, timestamp }: MessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex gap-4 mb-4', isUser && 'justify-end')}>
      <div
        className={cn(
          'max-w-md rounded-lg p-4 shadow-md transition-all hover:shadow-lg',
          isUser
            ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-ink rounded-bl-none'
            : 'bg-gradient-to-br from-ink-700 to-ink-800 text-cream-50 rounded-tl-none border border-ink-600'
        )}
      >
        <p className="text-sm leading-relaxed">{content}</p>
        {timestamp && (
          <p
            className={cn(
              'text-xs mt-2 font-dm-mono',
              isUser ? 'text-ink-700' : 'text-cream-500'
            )}
          >
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}

interface TabsProps {
  tabs: { label: string; id: string }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="border-b border-ink-700 flex gap-1 -mb-px">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px',
            activeTab === tab.id
              ? 'border-amber-500 text-amber-300'
              : 'border-transparent text-cream-500 hover:text-cream-300'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  icon?: ReactNode;
}

export function Toast({ message, type = 'info', icon }: ToastProps) {
  const bgClasses = {
    success: 'bg-mastery-500/20 border-mastery-500/50',
    error: 'bg-red-500/20 border-red-500/50',
    info: 'bg-ai-blue-500/20 border-ai-blue-500/50',
    warning: 'bg-amber-500/20 border-amber-500/50',
  };

  const textClasses = {
    success: 'text-mastery-300',
    error: 'text-red-300',
    info: 'text-ai-blue-300',
    warning: 'text-amber-300',
  };

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 px-4 py-3 rounded-lg border flex items-center gap-3',
        bgClasses[type],
        textClasses[type]
      )}
    >
      {icon}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
