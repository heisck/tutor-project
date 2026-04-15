'use client';

import { motion } from 'framer-motion';

const stats = [
  { label: 'Current streak', value: '12 days', helper: '+2 from last week' },
  { label: 'Best streak', value: '28 days', helper: 'Personal record' },
  { label: 'Weekly focus time', value: '10h 42m', helper: '+14% vs previous week' },
  { label: 'Consistency score', value: '87 / 100', helper: 'Top 15% this month' },
];

const activityDays = [
  1, 1, 0, 1, 1, 1, 0,
  1, 1, 1, 1, 0, 1, 1,
  1, 0, 1, 1, 1, 1, 0,
  1, 1, 1, 0, 1, 1, 1,
];

const weeklyBreakdown = [
  { day: 'Mon', minutes: 72 },
  { day: 'Tue', minutes: 56 },
  { day: 'Wed', minutes: 94 },
  { day: 'Thu', minutes: 63 },
  { day: 'Fri', minutes: 81 },
  { day: 'Sat', minutes: 48 },
  { day: 'Sun', minutes: 62 },
];

const milestones = [
  { title: '7-day focus loop', status: 'Completed', progress: 100 },
  { title: '14-day consistency milestone', status: 'Completed', progress: 100 },
  { title: '30-day mastery streak', status: 'In progress', progress: 40 },
  { title: '90-day discipline target', status: 'In progress', progress: 14 },
];

export default function StreaksPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Streak intelligence</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Consistency and momentum</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Track your practice cadence, celebrate streak wins, and identify low-activity days early.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.article
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: index * 0.05 }}
            className="rounded-2xl border border-border/70 bg-background p-5 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{stat.value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{stat.helper}</p>
          </motion.article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <article className="rounded-2xl border border-border/70 bg-background p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Last 4 weeks of activity</h3>
          <p className="mt-1 text-sm text-muted-foreground">Each square represents one day with at least one completed learning activity.</p>
          <div className="mt-5 grid grid-cols-7 gap-2">
            {activityDays.map((active, index) => (
              <div
                key={`${index}-${active}`}
                className={`aspect-square rounded-md border ${
                  active ? 'border-primary/25 bg-primary/20' : 'border-border/70 bg-muted/25'
                }`}
              />
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-border/70 bg-background p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Weekly minutes</h3>
          <div className="mt-4 space-y-3">
            {weeklyBreakdown.map((item, idx) => (
              <div key={item.day} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{item.day}</span>
                  <span className="text-muted-foreground">{item.minutes} min</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.minutes / 100) * 100}%` }}
                    transition={{ duration: 0.4, delay: 0.1 + idx * 0.04 }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-border/70 bg-background p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Milestones</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {milestones.map((item, idx) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: idx * 0.05 }}
              className="rounded-xl border border-border/70 bg-muted/20 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">{item.title}</p>
                <span className="text-xs text-muted-foreground">{item.status}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${item.progress}%` }} />
              </div>
            </motion.article>
          ))}
        </div>
      </section>
    </div>
  );
}
