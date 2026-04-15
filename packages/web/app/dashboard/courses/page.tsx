'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const courses = [
  {
    id: 1,
    title: 'Advanced Python Programming',
    description: 'Patterns, performance tuning, and clean architecture in Python projects.',
    progress: 65,
    lessons: 24,
    completedLessons: 16,
    status: 'In progress',
    lastAccessed: '2 hours ago',
  },
  {
    id: 2,
    title: 'Machine Learning Basics',
    description: 'Core supervised learning concepts and model evaluation workflows.',
    progress: 42,
    lessons: 32,
    completedLessons: 13,
    status: 'In progress',
    lastAccessed: '1 day ago',
  },
  {
    id: 3,
    title: 'Web Development with React',
    description: 'Modern React patterns, performance optimization, and architecture decisions.',
    progress: 78,
    lessons: 28,
    completedLessons: 22,
    status: 'Near completion',
    lastAccessed: '3 hours ago',
  },
  {
    id: 4,
    title: 'Data Science Fundamentals',
    description: 'Data cleaning, exploratory analysis, and practical visualization skills.',
    progress: 31,
    lessons: 20,
    completedLessons: 6,
    status: 'In progress',
    lastAccessed: '5 days ago',
  },
];

export default function CoursesPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Course workspace</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your active learning tracks</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Prioritize the most important course today and keep momentum with short, focused sessions.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {courses.map((course, idx) => (
          <motion.article
            key={course.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: idx * 0.04 }}
            className="rounded-2xl border border-border/70 bg-background p-5 shadow-sm"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{course.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{course.description}</p>
              </div>
              <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{course.status}</span>
            </div>

            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {course.completedLessons}/{course.lessons} lessons complete
              </span>
              <span className="font-semibold text-foreground">{course.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${course.progress}%` }}
                transition={{ duration: 0.5, delay: 0.12 + idx * 0.05, ease: 'easeOut' }}
                className="h-full rounded-full bg-primary"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Last active {course.lastAccessed}</p>
              <Link
                href="/session"
                className="rounded-lg border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted"
              >
                Resume session
              </Link>
            </div>
          </motion.article>
        ))}
      </section>

      <section className="rounded-2xl border border-dashed border-border p-6 text-center">
        <h3 className="text-lg font-semibold">Need a new course track?</h3>
        <p className="mt-1 text-sm text-muted-foreground">Upload source material and auto-generate a guided learning path.</p>
        <Link
          href="/dashboard/upload"
          className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Upload material
        </Link>
      </section>
    </div>
  );
}
