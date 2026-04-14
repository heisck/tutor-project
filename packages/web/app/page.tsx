import Link from 'next/link';

import { loadWebEnv } from '../src/env';

const env = loadWebEnv();

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-6 py-16">
      <section className="grid gap-10 lg:grid-cols-[1.3fr_0.9fr] lg:items-end">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">
            Core Tutoring Runtime
          </p>
          <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-slate-950 md:text-6xl">
            The tutoring stack is ready for live study-session work.
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-slate-700">
            Session orchestration, tutor streaming, and response evaluation are now
            available through the active FEST implementation. Open the learner
            session surface to start a study session against the authenticated API.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              href="/session"
            >
              Open Session Workspace
            </Link>
            <p className="text-sm text-slate-600">
              API base URL: <span className="font-semibold">{env.NEXT_PUBLIC_API_BASE_URL}</span>
            </p>
          </div>
        </div>

        <section className="rounded-[2rem] border border-amber-200/70 bg-white/85 p-7 shadow-[0_24px_80px_rgba(83,52,28,0.12)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-amber-700">
            What This Surface Covers
          </p>
          <div className="mt-5 space-y-4 text-sm leading-6 text-slate-700">
            <p>
              Mini-calibration inputs shape the first explanation strategy for an
              authenticated learner.
            </p>
            <p>
              Tutor SSE output is rendered in order so explanation content stays
              grounded in the server session state.
            </p>
            <p>
              Learner responses flow back into the tutor evaluation endpoint with
              visible loading, success, and validation feedback.
            </p>
          </div>
        </section>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-950">Calibration</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Academic level, session goal, and explanation preference are captured
            before a session begins.
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-950">Streaming Tutor</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Ordered SSE events open the tutoring stream and render explanation
            messages as they arrive.
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-950">Response Handling</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Learner answers are validated, submitted, and evaluated without using
            client-side token storage.
          </p>
        </article>
      </section>
    </main>
  );
}
