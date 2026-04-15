'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTheme } from '../providers';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary">
            TutorAI
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('dark')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                theme === 'dark'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                theme === 'light'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setTheme('purple')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                theme === 'purple'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Purple
            </button>
            <button
              onClick={() => setTheme('ocean')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                theme === 'ocean'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Ocean
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex items-center justify-center px-4 py-12"
      >
        {children}
      </motion.main>
    </div>
  );
}
