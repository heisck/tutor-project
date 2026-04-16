'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface InfoPageSection {
  body: string;
  title: string;
}

interface InfoPageProps {
  ctaHref?: string;
  ctaLabel?: string;
  description: string;
  eyebrow: string;
  sections: InfoPageSection[];
  title: string;
}

export function InfoPage({
  ctaHref,
  ctaLabel,
  description,
  eyebrow,
  sections,
  title,
}: InfoPageProps) {
  return (
    <div className="min-h-screen bg-ink">
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/3 w-[55vw] h-[55vh] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(ellipse, #f0a050 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-1/4 right-0 w-[35vw] h-[45vh] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse, #38bdf8 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-10 md:py-16">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <Link href="/" className="btn-ghost text-sm inline-flex items-center gap-2">
            <ArrowLeft size={16} />
            Back home
          </Link>
          <div className="flex flex-wrap gap-3">
            <Link href="/signin" className="btn-ghost text-sm">
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary text-sm py-2.5 px-5">
              Start free
            </Link>
          </div>
        </div>

        <div className="card p-8 md:p-10 space-y-8">
          <div className="space-y-4">
            <p className="label-mono text-xs text-amber">{eyebrow}</p>
            <h1 className="display-md">{title}</h1>
            <p
              className="text-lg text-cream-muted leading-relaxed max-w-2xl"
              style={{ fontFamily: 'var(--font-source-serif)' }}
            >
              {description}
            </p>
          </div>

          <div className="space-y-6">
            {sections.map((section) => (
              <section key={section.title} className="p-5 rounded-xl border border-surface-border bg-surface/40">
                <h2 className="font-display text-2xl font-700 text-cream mb-3">
                  {section.title}
                </h2>
                <p
                  className="text-cream-muted leading-relaxed whitespace-pre-line"
                  style={{ fontFamily: 'var(--font-source-serif)' }}
                >
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          {ctaHref && ctaLabel && (
            <div className="pt-2">
              <Link href={ctaHref} className="btn-primary inline-flex text-sm py-3 px-6">
                {ctaLabel}
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
