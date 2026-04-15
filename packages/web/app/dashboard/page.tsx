'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const leftRailMetrics = [
  { label: 'Current focus', value: 'Gradient flow' },
  { label: 'Next gate', value: 'Transfer check' },
  { label: 'Coverage', value: '91%' },
];

const pendingChecks = [
  'Differentiate objective function from update rule',
  'Explain the concept with a fresh analogy',
  'Apply it to a brand-new optimization example',
];

const rightBoardStats = [
  { label: 'Mastery confidence', value: '84%', note: 'stable across explanation and application' },
  { label: 'Weak concepts', value: '2', note: 'still flagged for reteach before progression' },
  { label: 'Resume health', value: 'Strong', note: 'session handoff is clean and verified' },
];

const recentTracks = [
  { title: 'Machine Learning Basics', status: 'In progress', lastActive: '2 hours ago' },
  { title: 'Advanced Python Programming', status: 'Strong momentum', lastActive: 'Yesterday' },
  { title: 'React Architecture', status: 'Needs one more check', lastActive: '3 hours ago' },
];

export default function DashboardPage() {
  return (
    <div className="grid min-w-0 gap-0 overflow-hidden rounded-[18px] border border-[#243047] bg-[#101828] shadow-[0_24px_64px_rgba(2,8,23,0.28)] lg:min-h-[calc(100vh-8.75rem)] lg:grid-cols-[360px_minmax(0,1fr)]">
      <section className="min-w-0 border-b border-[#243047] p-5 lg:border-b-0 lg:border-r lg:p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="min-h-[420px] rounded-[26px] border border-dashed border-[#2b3650] bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.02)_0,rgba(255,255,255,0.02)_10px,transparent_10px,transparent_20px)] p-5 lg:min-h-[calc(100vh-13rem)]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b88a3]">
            Learning focus
          </p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            The tutor is preparing your next evidence move.
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#8b98b0]">
            This left rail mirrors the narrow intelligence column from your reference: a compact focus brief,
            key session indicators, and the next checks the tutor still needs before it advances.
          </p>

          <div className="mt-8 space-y-3">
            {leftRailMetrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-[18px] border border-[#263248] bg-[#121b2c] px-4 py-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b88a3]">
                  {metric.label}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">{metric.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[20px] border border-[#263248] bg-[#121b2c] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b88a3]">
              Pending checks
            </p>
            <div className="mt-4 space-y-3">
              {pendingChecks.map((item, index) => (
                <div key={item} className="flex gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1d2738] text-xs font-semibold text-[#d9e3f5]">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-[#d9e3f5]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/session"
            className="mt-8 inline-flex rounded-[16px] bg-[#6c63ff] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Resume tutor session
          </Link>
        </motion.div>
      </section>

      <section className="min-w-0 p-5 lg:p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.05, ease: 'easeOut' }}
          className="min-h-[420px] rounded-[26px] border border-dashed border-[#2b3650] bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.018)_0,rgba(255,255,255,0.018)_10px,transparent_10px,transparent_20px)] p-5 lg:min-h-[calc(100vh-13rem)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b88a3]">
                Tutoring board
              </p>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                Evidence-first overview for your live study state
              </h3>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#8b98b0]">
                The wider workspace follows your reference image: it is the main action surface where mastery,
                weak concepts, and recent activity all stay visible without feeling crowded.
              </p>
            </div>

            <Link
              href="/dashboard/upload"
              className="rounded-[16px] border border-[#29354d] bg-[#121b2c] px-4 py-3 text-sm font-semibold text-[#d9e3f5] transition-colors hover:bg-[#182236]"
            >
              Upload material
            </Link>
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_320px]">
            <div className="min-w-0 space-y-4">
              <div className="rounded-[20px] border border-[#263248] bg-[#121b2c] p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b88a3]">
                      Live concept
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      Separate objective from update rule
                    </p>
                  </div>
                  <span className="rounded-full border border-[#2d3c5b] bg-[#1a2538] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#d9e3f5]">
                    Reteach active
                  </span>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  {rightBoardStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-[16px] border border-[#263248] bg-[#0f1727] p-4"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b88a3]">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
                      <p className="mt-2 text-xs leading-5 text-[#8b98b0]">{stat.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] border border-[#263248] bg-[#121b2c] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b88a3]">
                  Recent study tracks
                </p>
                <div className="mt-4 space-y-3">
                  {recentTracks.map((track) => (
                    <div
                      key={track.title}
                      className="flex min-w-0 items-center justify-between gap-4 rounded-[16px] border border-[#263248] bg-[#0f1727] px-4 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{track.title}</p>
                        <p className="mt-1 text-xs text-[#8b98b0]">Last active {track.lastActive}</p>
                      </div>
                      <span className="text-xs font-semibold text-[#d9e3f5]">{track.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[20px] border border-[#263248] bg-[#121b2c] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b88a3]">
                  Today queue
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    'Run one transfer question on gradient descent',
                    'Recheck weak concepts after analogy pass',
                    'Surface the next prerequisite dependency',
                  ].map((item, index) => (
                    <div
                      key={item}
                      className="rounded-[16px] border border-[#263248] bg-[#0f1727] px-4 py-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b88a3]">
                        Step 0{index + 1}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] border border-[#263248] bg-[#121b2c] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b88a3]">
                  Quick launch
                </p>
                <div className="mt-4 grid gap-3">
                  {[
                    { href: '/session', label: 'Open tutor' },
                    { href: '/dashboard/upload', label: 'Add source file' },
                    { href: '/dashboard/streaks', label: 'Check momentum' },
                  ].map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="rounded-[16px] border border-[#29354d] bg-[#0f1727] px-4 py-3 text-sm font-semibold text-[#d9e3f5] transition-colors hover:bg-[#182236]"
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
