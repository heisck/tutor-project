import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Manrope } from 'next/font/google';
import 'katex/dist/katex.min.css';

import './globals.css';
import { ThemeProvider } from './providers';

const APP_NAME = 'TutorAI';

const sansFont = Manrope({
  subsets: ['latin'],
  variable: '--font-sans-app',
  display: 'swap',
});

const monoFont = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono-app',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${APP_NAME} | Evidence-Based Adaptive Tutor`,
  description:
    'Turn study material into a guided, mastery-based tutoring system that teaches in order, adapts to the learner, and verifies understanding with evidence.',
  keywords: ['tutoring', 'AI', 'learning', 'education', 'adaptive', 'mastery', 'voice'],
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5efe5' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1320' },
  ],
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sansFont.variable} ${monoFont.variable} bg-background font-sans text-foreground`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
