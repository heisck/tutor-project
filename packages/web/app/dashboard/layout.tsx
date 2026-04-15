'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type IconProps = {
  className?: string;
};

const navItems = [
  { label: 'Home', href: '/dashboard', note: 'Overview', icon: HomeIcon },
  { label: 'Courses', href: '/dashboard/courses', note: 'Guided tracks', icon: GroupIcon },
  { label: 'Upload', href: '/dashboard/upload', note: 'Documents', icon: FolderIcon },
  { label: 'Streaks', href: '/dashboard/streaks', note: 'Calendar', icon: CalendarIcon },
  { label: 'Settings', href: '/dashboard/settings', note: 'Preferences', icon: SheetIcon },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeNavItem =
    navItems.find((item) => isDashboardItemActive(pathname, item.href)) ?? {
      label: 'Home',
      href: '/dashboard',
      note: 'Overview',
      icon: HomeIcon,
    };

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#090f1c] px-3 py-3 text-[#eef4ff] sm:px-4 lg:px-5">
      <div className="mx-auto max-w-[1460px] overflow-hidden rounded-[20px] border border-[#243047] bg-[#101828] shadow-[0_32px_110px_rgba(1,5,16,0.48)]">
        <div className="flex min-h-[calc(100vh-1.5rem)]">
          <aside className="hidden w-20 shrink-0 flex-col border-r border-[#243047] bg-[#0f1727] lg:flex">
            <div className="flex h-16 items-center justify-center border-b border-[#243047]">
              <LogoMark className="h-8 w-8 text-[#6c63ff]" />
            </div>

            <nav className="flex flex-1 flex-col items-center gap-4 px-3 py-6">
              {navItems.map((item) => {
                const isActive = isDashboardItemActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`flex h-12 w-12 items-center justify-center rounded-[14px] border transition-all duration-200 ${
                      isActive
                        ? 'border-[#2f3c55] bg-[#1d2738] text-white shadow-[0_12px_24px_rgba(0,0,0,0.2)]'
                        : 'border-transparent text-[#8b97ad] hover:border-[#273248] hover:bg-[#162032] hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0 flex-1">
            <header className="flex h-16 items-center gap-3 border-b border-[#243047] bg-[#121b2c] px-4 sm:px-5 lg:px-6">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[#273248] bg-[#162032] text-[#dfe7f3] transition-colors hover:bg-[#1a2538] lg:hidden"
              >
                <MenuIcon className="h-5 w-5" />
              </button>

              <div className="relative hidden max-w-xl flex-1 lg:block">
                <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#7d8aa3]" />
                <input
                  type="text"
                  placeholder="Search"
                  className="h-11 w-full rounded-full border border-transparent bg-[#111a2a] pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-[#73809b] focus:border-[#2e3a51]"
                />
              </div>

              <div className="min-w-0 flex-1 lg:hidden">
                <p className="text-sm font-semibold text-white">{activeNavItem.label}</p>
                <p className="text-xs text-[#7d8aa3]">{activeNavItem.note}</p>
              </div>

              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Notifications"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#91a0bb] transition-colors hover:bg-[#182336] hover:text-white"
                >
                  <BellIcon className="h-5 w-5" />
                </button>

                <div className="hidden h-8 w-px bg-[#2a354b] sm:block" />

                <button
                  type="button"
                  className="flex items-center gap-3 rounded-full px-1 py-1 transition-colors hover:bg-[#172132]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#f2d29b] to-[#caa56c] text-xs font-bold text-[#101828]">
                    JD
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block text-sm font-semibold text-white">Jordan Diaz</span>
                  </span>
                  <ChevronDownIcon className="hidden h-4 w-4 text-[#8f9db8] sm:block" />
                </button>
              </div>
            </header>

            <main className="min-w-0 bg-[#111a2a] p-4 sm:p-5 lg:p-6">{children}</main>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
          />

          <aside className="fixed inset-y-3 left-3 z-50 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-[18px] border border-[#243047] bg-[#0f1727] shadow-[0_22px_70px_rgba(1,5,16,0.55)] lg:hidden">
            <div className="flex h-16 items-center justify-between border-b border-[#243047] px-4">
              <div className="flex items-center gap-3">
                <LogoMark className="h-7 w-7 text-[#6c63ff]" />
                <span className="text-sm font-semibold text-white">TutorAI</span>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#263248] bg-[#162032] text-[#dfe7f3]"
              >
                <CloseIcon className="h-4.5 w-4.5" />
              </button>
            </div>

            <nav className="space-y-2 p-4">
              {navItems.map((item) => {
                const isActive = isDashboardItemActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-[16px] border px-3 py-3 transition-colors ${
                      isActive
                        ? 'border-[#2f3c55] bg-[#1d2738] text-white'
                        : 'border-transparent text-[#93a1b8] hover:border-[#263248] hover:bg-[#162032] hover:text-white'
                    }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#141d2d]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="block text-xs text-[#7d8aa3]">{item.note}</span>
                    </span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </>
      )}
    </div>
  );
}

function isDashboardItemActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function LogoMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 20.5c2.8-4.3 6.1-6.4 9.9-6.4 4 0 6.4 2.9 9.6 2.9 2.1 0 4-1 5.8-3"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M6.8 11.8c2.2-3 4.8-4.5 7.8-4.5 3.4 0 5.4 2.2 8 2.2 1.8 0 3.5-.8 5.1-2.4"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.88"
      />
    </svg>
  );
}

function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 11.5L12 4l8 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 10.5V20h11V10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GroupIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.5" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 18.5c.8-2.7 2.8-4 6-4s5.2 1.3 6 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14.8 18.2c.5-1.7 1.8-2.6 4-2.6 1.1 0 2 .2 2.7.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function FolderIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3.5 7.5A2.5 2.5 0 016 5h4l1.8 2H18a2.5 2.5 0 012.5 2.5v7A2.5 2.5 0 0118 19H6a2.5 2.5 0 01-2.5-2.5v-9z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3.8v3.4M16 3.8v3.4M4.5 9.5h15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SheetIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M7 3.5h7l5 5V20a1.5 1.5 0 01-1.5 1.5H7A2.5 2.5 0 014.5 19V6A2.5 2.5 0 017 3.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 3.8v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M7.5 16.5h9c-.8-1-1.3-2.4-1.3-4.1V11a3.2 3.2 0 10-6.4 0v1.4c0 1.7-.5 3.1-1.3 4.1z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10.4 18.5a1.8 1.8 0 003.2 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 7.5h14M5 12h14M5 16.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
