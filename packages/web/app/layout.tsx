import type { Metadata, Viewport } from 'next';

import { APP_NAME } from '@ai-tutor-pwa/shared';
import 'katex/dist/katex.min.css';

import './globals.css';
import { ThemeProvider } from './providers';

export const metadata: Metadata = {
  title: `${APP_NAME} | Adaptive Tutoring`,
  description:
    'Personalized AI tutoring platform. Upload your materials and get intelligent explanations, practice questions, and adaptive learning paths.',
  keywords: ['tutoring', 'AI', 'learning', 'education', 'adaptive'],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f8f8' },
    { media: '(prefers-color-scheme: dark)', color: '#080808' },
  ],
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
