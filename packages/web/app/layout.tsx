import type { Metadata } from 'next';

import { APP_NAME } from '@ai-tutor-pwa/shared';
import 'katex/dist/katex.min.css';

import './globals.css';

export const metadata: Metadata = {
  title: `${APP_NAME} | Adaptive Tutoring`,
  description:
    'Learner-facing study session workspace for adaptive tutoring, calibration, and streamed explanations.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
