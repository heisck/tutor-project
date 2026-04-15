'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { useTheme } from '../providers';

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Courses', href: '/dashboard/courses' },
  { label: 'Upload', href: '/dashboard/upload' },
  { label: 'Streaks', href: '/dashboard/streaks' },
  { label: 'Settings', href: '/dashboard/settings' },
];

const themeOptions = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'purple', label: 'Purple' },
  { value: 'ocean', label: 'Ocean' },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1440px]">
        <motion.aside
          initial={false}
          animate={{ x: sidebarOpen ? 0 : -280 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border/70 bg-background/95 px-6 py-8 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"
        >
          <div className="flex h-full flex-col">
            <div className="mb-10">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">TutorAI</p>
              <h1 className="mt-2 text-2xl font-semibold">Learning HQ</h1>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex items-center justify-between rounded-xl px-4 py-3 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isActive
                        ? 'bg-primary/10 text-foreground ring-1 ring-primary/25'
                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="font-medium">{item.label}</span>
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        isActive ? 'bg-primary' : 'bg-transparent group-hover:bg-muted-foreground/50'
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>

            <div className="mt-10 rounded-2xl border border-border/70 bg-muted/40 p-4">
              <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Theme</p>
              <div className="grid grid-cols-2 gap-2">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      theme === option.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto rounded-2xl border border-border/70 bg-muted/30 p-4">
              <p className="text-sm font-medium">Jordan Diaz</p>
              <p className="text-xs text-muted-foreground">Premium plan</p>
              <button className="mt-3 text-xs text-muted-foreground transition-colors hover:text-foreground">
                Sign out
              </button>
            </div>
          </div>
        </motion.aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
              <button
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
              >
                Menu
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dashboard</p>
                <p className="text-sm font-medium">Progress overview</p>
              </div>
              <button className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                New Session
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="mx-auto w-full max-w-6xl"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}
    </div>
  );
}
