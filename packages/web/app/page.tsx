'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const features = [
  {
    title: 'Context-aware tutoring',
    description: 'Ask questions against your uploaded lectures, slides, and notes with citations.',
  },
  {
    title: 'Adaptive practice engine',
    description: 'Generate drills that adjust difficulty based on your recent responses.',
  },
  {
    title: 'Progress intelligence',
    description: 'Track weak concepts, streak consistency, and session quality in one place.',
  },
  {
    title: 'Fast content ingestion',
    description: 'Upload PDFs or decks and map concepts into study-ready chunks in minutes.',
  },
  {
    title: 'Session handoff memory',
    description: 'Resume learning where you left off with goals and notes preserved.',
  },
  {
    title: 'Production observability',
    description: 'Monitor ingestion, response quality, and runtime health as usage scales.',
  },
];

const proofPoints = [
  { label: 'Avg. response latency', value: '< 2.5s' },
  { label: 'Document formats', value: 'PDF · PPTX · DOCX' },
  { label: 'Tutor modes', value: 'Explain · Quiz · Coach' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-semibold tracking-tight sm:text-xl">
            TutorAI
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Start free
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-16 pt-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:px-8 lg:pb-24 lg:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="space-y-8"
        >
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">AI tutoring platform</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              A focused learning workspace that feels like a senior tutor.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              TutorAI turns your own material into adaptive coaching sessions, practice prompts, and
              confidence-building feedback. Built for serious learners and teams preparing for exams.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/auth/signup"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Create workspace
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Explore dashboard
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {proofPoints.map((point) => (
              <div key={point.label} className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{point.label}</p>
                <p className="mt-2 text-lg font-semibold">{point.value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
          className="rounded-3xl border border-border/70 bg-gradient-to-b from-background to-muted/20 p-6 shadow-sm sm:p-8"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">What you get</p>
          <ul className="mt-5 space-y-4">
            {features.map((feature) => (
              <li key={feature.title} className="rounded-xl border border-border/70 bg-background/60 p-4">
                <p className="text-sm font-semibold">{feature.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
              </li>
            ))}
          </ul>
        </motion.aside>
      </section>

      <footer className="border-t border-border/70 py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 TutorAI</p>
          <p>Built for reliable, production-ready learning experiences.</p>
        </div>
      </footer>
    </main>
  );
}
