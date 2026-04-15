'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const stats = [
  { label: 'Study Streak', value: '12 days', trend: '+2 this week' },
  { label: 'Focused Hours', value: '45.5h', trend: '+6.3h this week' },
  { label: 'Documents Parsed', value: '8', trend: '2 uploaded today' },
  { label: 'Questions Solved', value: '156', trend: '91% accuracy' },
];

const courseProgress = [
  { id: 1, title: 'Advanced Python Programming', progress: 65, lastAccessed: '2 hours ago' },
  { id: 2, title: 'Machine Learning Basics', progress: 42, lastAccessed: '1 day ago' },
  { id: 3, title: 'Web Development with React', progress: 78, lastAccessed: '3 hours ago' },
  { id: 4, title: 'Data Science Fundamentals', progress: 31, lastAccessed: '5 days ago' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Welcome back</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your learning performance at a glance</h2>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Keep momentum with structured sessions, weekly targets, and clear insights from every tutor interaction.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.article
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.06 }}
            className="rounded-2xl border border-border/70 bg-gradient-to-b from-background to-muted/30 p-5 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{stat.value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{stat.trend}</p>
          </motion.article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <article className="rounded-2xl border border-border/70 bg-background p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Current courses</h3>
              <p className="text-sm text-muted-foreground">Resume where you left off and stay on track.</p>
            </div>
            <Link
              href="/dashboard/courses"
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              View all
            </Link>
          </div>

          <div className="space-y-4">
            {courseProgress.map((course, idx) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, delay: idx * 0.05 }}
                className="rounded-xl border border-border/70 bg-muted/30 p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{course.title}</p>
                    <p className="text-xs text-muted-foreground">Last active {course.lastAccessed}</p>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">{course.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${course.progress}%` }}
                    transition={{ duration: 0.45, delay: 0.2 + idx * 0.08, ease: 'easeOut' }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </article>

        <article className="space-y-4 rounded-2xl border border-border/70 bg-background p-6 shadow-sm">
          <div>
            <h3 className="text-xl font-semibold">Quick actions</h3>
            <p className="text-sm text-muted-foreground">Move through your workflow faster.</p>
          </div>
          <Link
            href="/dashboard/upload"
            className="block rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Upload new learning materials
          </Link>
          <Link
            href="/dashboard/streaks"
            className="block rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Review streak and habit analytics
          </Link>
          <Link
            href="/session"
            className="block rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Start focused tutoring session
          </Link>
        </article>
      </section>
    </div>
  );
}
