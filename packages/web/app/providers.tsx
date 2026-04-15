'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type ThemeType = 'dark' | 'light' | 'purple' | 'ocean';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const isThemeType = (value: string | null): value is ThemeType => {
  return value === 'dark' || value === 'light' || value === 'purple' || value === 'ocean';
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>('dark');

  useEffect(() => {
    const storedTheme = localStorage.getItem('app-theme');
    const initialTheme = isThemeType(storedTheme) ? storedTheme : 'dark';
    setThemeState(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);
    applyTheme(newTheme);
  };

  const applyTheme = (themeToApply: ThemeType) => {
    if (themeToApply === 'dark') {
      document.documentElement.removeAttribute('data-theme');
      return;
    }

    document.documentElement.setAttribute('data-theme', themeToApply);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
