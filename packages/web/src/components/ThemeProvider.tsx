'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  resolvedTheme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'studium-theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [resolvedTheme, setResolvedTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    const nextTheme = savedTheme === 'light' ? 'light' : 'dark';
    setResolvedTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const setTheme = (theme: ThemeMode) => {
    setResolvedTheme(theme);
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const value = useMemo(
    () => ({
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === null) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}

function applyTheme(theme: ThemeMode) {
  const rootElement = document.documentElement;
  rootElement.dataset.theme = theme;
  rootElement.style.colorScheme = theme;
}
