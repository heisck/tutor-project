'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const promisePoints = [
  {
    label: 'No skipped content',
    value: 'ATU coverage ledger',
  },
  {
    label: 'Teaching order',
    value: 'Prerequisite aware',
  },
  {
    label: 'Mastery standard',
    value: 'Evidence before advance',
  },
  {
    label: 'Continuity',
    value: 'Resume exact state',
  },
];

const journey = [
  {
    title: 'Upload anything worth studying',
    description: 'Slides, PDFs, notes, and docs become one auditable learning source.',
  },
  {
    title: 'Map every teachable idea',
    description: 'The system extracts ATUs, concepts, prerequisites, and likely misconceptions.',
  },
  {
    title: 'Calibrate the learner',
    description: 'It watches how the learner responds, not just what they claim to prefer.',
  },
  {
    title: 'Teach with control',
    description: 'Each turn decides whether to teach, check, reteach, simplify, or advance.',
  },
  {
    title: 'Prove mastery',
    description: 'Concepts are only done after explanation, application, transfer, and simple restatement.',
  },
  {
    title: 'Resume and revise',
    description: 'Weak areas stay visible, and the tutor continues from the exact right point later.',
  },
];

const modes = [
  'Teach me step by step',
  'Voice tutor',
  'Difficult parts only',
  'Exam mode',
  'Quiz me now',
  'Flashcards',
  'Quick summary',
];

const systemLayers = [
  {
    title: 'Content understanding',
    description: 'Ingest files, preserve structure, break content into ATUs, and build the concept graph.',
  },
  {
    title: 'Adaptive tutor loop',
    description: 'Decide the next best action from grounded evidence, mastery state, and learner calibration.',
  },
  {
    title: 'Mastery and memory',
    description: 'Track evidence, block fake completion, resurface weak topics, and restore session state.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[540px] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_38%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />

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

      <section className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-24 lg:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="space-y-8"
        >
          <div className="space-y-5">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              Evidence-based adaptive tutor
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Your study material becomes a tutor that will not assume you understand.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              TutorAI extracts every teachable idea, orders concepts correctly, adapts explanations to the
              learner, and requires real evidence before marking anything mastered.
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

          <div className="grid gap-3 sm:grid-cols-2">
            {promisePoints.map((point) => (
              <div
                key={point.label}
                className="rounded-3xl border border-border/70 bg-background/70 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{point.label}</p>
                <p className="mt-3 text-xl font-semibold">{point.value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
          className="space-y-5"
        >
          <section className="rounded-[32px] border border-border/70 bg-[linear-gradient(180deg,rgba(56,189,248,0.12),rgba(15,23,42,0.22))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-8">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tutor decision loop</p>
              <span className="rounded-full border border-primary/20 bg-background/70 px-3 py-1 text-xs font-medium text-primary">
                controlled runtime
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {[
                'Retrieve grounded evidence from the current concept and source chunks.',
                'Choose whether to teach, check, reteach, simplify, or advance.',
                'Classify confusion before the learner drifts too far off track.',
                'Require multi-shape evidence before mastery can pass.',
                'Persist weak areas so the next session starts in the right place.',
              ].map((item, index) => (
                <div key={item} className="flex gap-4 rounded-2xl border border-border/60 bg-background/75 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-sm font-semibold text-primary">
                    0{index + 1}
                  </div>
                  <p className="text-sm leading-6 text-foreground/92">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-border/70 bg-background/80 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Learner modes</p>
              <p className="text-xs text-muted-foreground">one knowledge graph, many surfaces</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {modes.map((mode) => (
                <span
                  key={mode}
                  className="rounded-full border border-border/70 bg-muted/30 px-3 py-2 text-xs font-medium text-foreground"
                >
                  {mode}
                </span>
              ))}
            </div>
          </section>
        </motion.aside>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {systemLayers.map((layer, index) => (
            <motion.article
              key={layer.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.28, delay: index * 0.05, ease: 'easeOut' }}
              className="rounded-[28px] border border-border/70 bg-background/80 p-6 shadow-sm"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">System layer</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">{layer.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{layer.description}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Learning journey</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              The system teaches like a tutor, tracks like a database, and verifies like an examiner.
            </h2>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {journey.map((step, index) => (
            <motion.article
              key={step.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.28, delay: index * 0.04, ease: 'easeOut' }}
              className="rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-base font-semibold text-primary">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.description}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/70 py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>Copyright 2026 TutorAI</p>
          <p>Built for evidence-based learning, not one-shot explanation.</p>
        </div>
      </footer>
    </main>
  );
}
