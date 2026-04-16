'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, Brain, BarChart3, Upload, Zap, ChevronRight, Star } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-ink overflow-x-hidden">
      {/* ── Ambient background ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[60vw] h-[60vh] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(ellipse, #f0a050 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-0 w-[40vw] h-[50vh] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse, #38bdf8 0%, transparent 70%)' }} />
        {/* Fine dot grid */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ede8df 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }} />
      </div>

      {/* ── Navigation ── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber flex items-center justify-center">
            <BookOpen size={16} className="text-ink" strokeWidth={2.5} />
          </div>
          <span className="font-display font-700 text-cream text-lg tracking-tight">Studium</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {['Features', 'How It Works', 'About'].map((item) => (
            <Link
              key={item}
              href={`/${item.toLowerCase().replace(' ', '-')}`}
              className="font-mono text-sm text-cream-muted hover:text-cream transition-colors"
            >
              {item}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/signin" className="btn-ghost text-sm">Sign in</Link>
          <Link href="/signup" className="btn-primary text-sm py-2.5 px-5">
            Start free
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-16 pb-24 lg:pt-24">
        <div className="grid lg:grid-cols-[1fr_480px] gap-16 items-center">
          {/* Left: Copy */}
          <div className="animate-stagger">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-8">
              <span className="badge badge-amber">
                <Zap size={10} />
                Adaptive Intelligence
              </span>
              <span className="label-mono text-xs">Powered by Claude AI</span>
            </div>

            {/* Headline */}
            <h1 className="display-xl mb-6">
              Where{' '}
              <em className="font-display not-italic text-amber">documents</em>
              <br />
              become{' '}
              <em className="font-display not-italic italic" style={{ color: '#38bdf8' }}>teachers.</em>
            </h1>

            {/* Subheadline */}
            <p className="text-cream-muted text-xl leading-relaxed max-w-xl mb-10" style={{ fontFamily: 'var(--font-source-serif)' }}>
              Upload any study material. Studium extracts every concept, builds a knowledge map, and tutors you adaptively — detecting confusion in real time until you truly master the material.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mb-12">
              <Link href="/signup" className="btn-primary text-base py-3.5 px-8">
                Start learning free
                <ArrowRight size={16} />
              </Link>
              <Link href="/how-it-works" className="btn-secondary text-base py-3.5 px-8">
                See how it works
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-6 pt-6 border-t border-surface">
              <div>
                <div className="font-display text-2xl font-700 text-cream">2,400+</div>
                <div className="label-mono text-xs mt-0.5">Documents processed</div>
              </div>
              <div className="w-px h-8 bg-surface-border" />
              <div>
                <div className="font-display text-2xl font-700 text-cream">94%</div>
                <div className="label-mono text-xs mt-0.5">Mastery rate</div>
              </div>
              <div className="w-px h-8 bg-surface-border" />
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} size={14} className="text-amber fill-amber" />
                ))}
                <span className="label-mono text-xs ml-2">4.9 / 5</span>
              </div>
            </div>
          </div>

          {/* Right: App preview */}
          <div className="relative animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="card relative overflow-hidden"
              style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}>
              {/* Fake window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-border bg-surface-hover">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-3 py-1 rounded-md bg-surface border border-surface-border label-mono text-xs text-cream-muted">
                    studium.app/session
                  </div>
                </div>
              </div>

              {/* Session preview content */}
              <div className="p-5 space-y-4">
                {/* Concept breadcrumb */}
                <div className="flex items-center gap-2">
                  <span className="badge badge-ai">
                    <Brain size={9} />
                    Active Session
                  </span>
                  <ChevronRight size={12} className="text-cream-muted" />
                  <span className="label-mono text-xs text-cream-muted">Cell Biology · Unit 3 / 8</span>
                </div>

                {/* AI message */}
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-ai-blue-dim border border-ai-blue/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Brain size={12} className="text-ai-blue" />
                    </div>
                    <div className="card p-4 rounded-xl flex-1" style={{ background: 'rgba(56,189,248,0.04)', borderColor: 'rgba(56,189,248,0.12)' }}>
                      <p className="text-sm leading-relaxed text-cream" style={{ fontFamily: 'var(--font-source-serif)' }}>
                        Let&apos;s begin with <strong className="text-amber">mitosis</strong>. Think of it as a cell&apos;s way of making an exact copy of itself. Every cell in your body started this way. What happens first?
                      </p>
                    </div>
                  </div>
                </div>

                {/* Concept map mini */}
                <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="label-mono text-xs mb-2 text-cream-muted">Concept Map</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'DNA Replication', state: 'mastered' },
                      { label: 'Mitosis', state: 'current' },
                      { label: 'Meiosis', state: 'locked' },
                      { label: 'Apoptosis', state: 'locked' },
                    ].map((c) => (
                      <span key={c.label} className={`concept-node ${c.state === 'current' ? 'current' : c.state === 'mastered' ? 'mastered' : ''}`}>
                        {c.state === 'mastered' && '✓ '}
                        {c.state === 'current' && '● '}
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="label-mono text-xs text-cream-muted">Session progress</span>
                    <span className="label-mono text-xs text-amber">38%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: '38%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Floating stat card */}
            <div className="absolute -bottom-6 -left-8 card glass-panel p-4 flex items-center gap-3 animate-glow">
              <div className="w-10 h-10 rounded-full bg-mastery-dim flex items-center justify-center">
                <BarChart3 size={18} className="text-mastery" />
              </div>
              <div>
                <div className="font-display text-lg font-700 text-mastery">Mastered</div>
                <div className="label-mono text-xs text-cream-muted">DNA Replication</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-24">
        <div className="text-center mb-16">
          <div className="label-mono text-xs text-amber mb-4">The process</div>
          <h2 className="display-md">Four steps to mastery</h2>
        </div>

        <div className="grid md:grid-cols-4 gap-6 animate-stagger">
          {[
            {
              step: '01',
              icon: Upload,
              title: 'Upload',
              desc: 'Drop any PDF, PPTX, or DOCX. Studium processes it immediately.',
              color: 'amber',
            },
            {
              step: '02',
              icon: Brain,
              title: 'Extract',
              desc: 'AI maps every concept, builds prerequisites, and structures a teaching plan.',
              color: 'ai-blue',
            },
            {
              step: '03',
              icon: BookOpen,
              title: 'Tutor',
              desc: 'Adaptive sessions that adjust to your pace, detect confusion, and re-explain.',
              color: 'mastery',
            },
            {
              step: '04',
              icon: BarChart3,
              title: 'Master',
              desc: 'Track your understanding. See exactly what you know and what needs work.',
              color: 'amber',
            },
          ].map(({ step, icon: Icon, title, desc, color }) => (
            <div key={step} className="card p-6 relative group card-hover">
              <div className="label-mono text-xs text-cream-muted mb-4">{step}</div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4`}
                style={{
                  background: color === 'amber' ? 'rgba(240,160,80,0.1)' :
                               color === 'ai-blue' ? 'rgba(56,189,248,0.1)' : 'rgba(74,222,128,0.1)',
                }}>
                <Icon size={18}
                  style={{
                    color: color === 'amber' ? 'var(--amber)' :
                           color === 'ai-blue' ? 'var(--ai-blue)' : 'var(--mastery)',
                  }} />
              </div>
              <h3 className="font-display text-xl font-700 text-cream mb-2">{title}</h3>
              <p className="text-sm leading-relaxed text-cream-muted" style={{ fontFamily: 'var(--font-source-serif)' }}>{desc}</p>

              {/* Hover line */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: color === 'amber' ? 'var(--amber)' :
                               color === 'ai-blue' ? 'var(--ai-blue)' : 'var(--mastery)',
                }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Features deep dive ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-24 border-t border-surface-border">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-16 items-center">
          <div>
            <div className="label-mono text-xs text-amber mb-4">Intelligence layer</div>
            <h2 className="display-lg mb-6">
              Tutoring that{' '}
              <em className="italic" style={{ color: 'var(--ai-blue)' }}>actually</em>{' '}
              adapts.
            </h2>
            <p className="text-cream-muted text-lg leading-relaxed mb-8" style={{ fontFamily: 'var(--font-source-serif)' }}>
              Most AI tools answer questions. Studium teaches. It detects when you&apos;re confused,
              adjusts its explanation style, uses analogies when concepts don&apos;t land,
              and verifies your understanding before moving on.
            </p>

            <div className="space-y-4">
              {[
                { title: 'Confusion detection', desc: 'Spots hesitation and re-explains with a fresh approach' },
                { title: 'Concept prerequisites', desc: 'Teaches foundational concepts before advanced ones' },
                { title: 'Mastery verification', desc: 'Multiple evidence types before marking a concept done' },
                { title: 'Perfect session memory', desc: 'Resume any session exactly where you left off' },
              ].map(({ title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber mt-2.5 flex-shrink-0" />
                  <div>
                    <div className="font-display font-600 text-cream mb-0.5">{title}</div>
                    <div className="text-sm text-cream-muted" style={{ fontFamily: 'var(--font-source-serif)' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session state preview */}
          <div className="card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <span className="label-mono text-xs text-cream-muted">Session state</span>
              <span className="badge badge-mastery">
                <div className="w-1.5 h-1.5 rounded-full bg-mastery" />
                Active
              </span>
            </div>

            {/* Mastery breakdown */}
            <div className="space-y-3">
              {[
                { concept: 'Cell membrane', mastery: 95, status: 'mastered' },
                { concept: 'Mitochondria', mastery: 78, status: 'in-progress' },
                { concept: 'DNA Replication', mastery: 60, status: 'in-progress' },
                { concept: 'Cell Division', mastery: 20, status: 'not-started' },
                { concept: 'Apoptosis', mastery: 0, status: 'locked' },
              ].map(({ concept, mastery, status }) => (
                <div key={concept} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-cream truncate" style={{ fontFamily: 'var(--font-source-serif)' }}>
                        {concept}
                      </span>
                      <span className="label-mono text-xs text-cream-muted ml-3 flex-shrink-0">
                        {mastery > 0 ? `${mastery}%` : '—'}
                      </span>
                    </div>
                    <div className="progress-bar" style={{ height: '3px' }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${mastery}%`,
                          background: status === 'mastered' ? 'var(--mastery)' :
                                      status === 'in-progress' ? 'var(--amber)' :
                                      'var(--surface-border)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-surface-border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="label-mono text-xs text-cream-muted mb-1">Overall readiness</div>
                  <div className="font-display text-3xl font-700 text-amber">62%</div>
                </div>
                <div className="text-right">
                  <div className="label-mono text-xs text-cream-muted mb-1">Estimated to master</div>
                  <div className="font-display text-lg font-600 text-cream">~45 min</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-24">
        <div className="card p-12 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0c111c 0%, #111827 100%)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(240,160,80,0.08) 0%, transparent 70%)' }} />

          <div className="relative">
            <div className="label-mono text-xs text-amber mb-6">Start today</div>
            <h2 className="display-lg mb-6 max-w-2xl mx-auto">
              Your next exam deserves{' '}
              <em className="italic" style={{ color: 'var(--amber)' }}>better preparation.</em>
            </h2>
            <p className="text-cream-muted text-lg mb-10 max-w-xl mx-auto" style={{ fontFamily: 'var(--font-source-serif)' }}>
              Join students who&apos;ve discovered that real understanding, not memorization, is the path to lasting results.
            </p>
            <Link href="/signup" className="btn-primary text-base py-4 px-10 inline-flex">
              Create free account
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 max-w-7xl mx-auto px-8 py-12 border-t border-surface-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber flex items-center justify-center">
              <BookOpen size={13} className="text-ink" strokeWidth={2.5} />
            </div>
            <span className="font-display font-600 text-cream">Studium</span>
            <span className="label-mono text-xs text-cream-muted">Adaptive AI Tutoring</span>
          </div>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Contact'].map((item) => (
              <Link key={item} href={`/${item.toLowerCase()}`} className="label-mono text-xs text-cream-muted hover:text-cream transition-colors">
                {item}
              </Link>
            ))}
          </div>
          <div className="label-mono text-xs text-cream-muted">
            © {new Date().getFullYear()} Studium
          </div>
        </div>
      </footer>
    </div>
  );
}
