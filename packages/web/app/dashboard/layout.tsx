'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import { useTheme } from '../providers';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, setTheme } = useTheme();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: '📊' },
    { label: 'My Courses', href: '/dashboard/courses', icon: '📚' },
    { label: 'Upload Material', href: '/dashboard/upload', icon: '📤' },
    { label: 'Learning Streaks', href: '/dashboard/streaks', icon: '🔥' },
    { label: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <motion.aside
        animate={{ x: sidebarOpen ? 0 : -280 }}
        transition={{ duration: 0.3 }}
        className="w-72 border-r border-border bg-background/80 backdrop-blur-sm p-6 fixed left-0 top-0 h-screen overflow-y-auto lg:relative lg:x-0"
      >
        <div className="space-y-8">
          {/* Logo */}
          <Link href="/dashboard" className="text-2xl font-bold text-primary block">
            TutorAI
          </Link>

          {/* Navigation */}
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-foreground hover:bg-muted transition-colors group"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Divider */}
          <div className="h-px bg-border"></div>

          {/* Theme Selector */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Theme
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['dark', 'light', 'purple', 'ocean'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                    theme === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* User Profile */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                JD
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">John Doe</p>
                <p className="text-xs text-muted-foreground">Premium</p>
              </div>
            </div>
            <button className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-2xl text-foreground hover:text-primary transition-colors"
            >
              ☰
            </button>
            <div className="text-foreground font-semibold">Learning Center</div>
            <div className="flex gap-2">
              <button className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground">
                🔔
              </button>
              <button className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground">
                🔍
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-6 max-w-7xl"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
        />
      )}
    </div>
  );
}
