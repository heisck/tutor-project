import type { Metadata, Viewport } from 'next';
import { Fraunces, Source_Serif_4, DM_Mono } from 'next/font/google';
import './globals.css';

// ── Fraunces: editorial display serif (variable font) ──
const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

// ── Source Serif 4: excellent long-form reading serif ──
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-source-serif',
  display: 'swap',
});

// ── DM Mono: clean technical monospace for labels & data ──
const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal'],
  variable: '--font-dm-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Studium — Adaptive AI Tutoring',
  description:
    'Upload any study material. Studium extracts concepts, builds a knowledge graph, and tutors you with precision until you truly understand.',
  keywords: ['AI tutor', 'adaptive learning', 'study assistant', 'mastery learning'],
  authors: [{ name: 'Studium' }],
  openGraph: {
    title: 'Studium — Adaptive AI Tutoring',
    description: 'Transform any document into a personalized tutoring session.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#080c14',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${sourceSerif.variable} ${dmMono.variable}`}
    >
      <body className="bg-ink text-cream antialiased">{children}</body>
    </html>
  );
}
