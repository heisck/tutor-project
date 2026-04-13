import type { Metadata } from 'next';

import { APP_NAME } from '@ai-tutor-pwa/shared';

import './globals.css';

export const metadata: Metadata = {
  title: `${APP_NAME} | Foundation`,
  description: 'Foundation workspace for the ai-tutor-pwa platform.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
