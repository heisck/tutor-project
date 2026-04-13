import { APP_NAME } from '@ai-tutor-pwa/shared';

import { loadWebEnv } from '../src/env';

const env = loadWebEnv();

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-10 px-6 py-16">
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">
          Foundation Phase
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950">
          {APP_NAME} is wired for local development.
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-700">
          The frontend, API, Prisma package, Redis wiring, and shared packages are
          all scaffolded so the next FEST tasks can focus on auth, profile,
          uploads, and document status without rebuilding the platform shell.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-950">Frontend</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Next.js App Router with TypeScript and Tailwind CSS.
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-950">API</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Fastify foundation with health routes for app, database, and Redis.
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-950">Environment</h2>
          <p className="mt-3 break-all text-sm leading-6 text-slate-600">
            API base URL: {env.NEXT_PUBLIC_API_BASE_URL}
          </p>
        </article>
      </section>
    </main>
  );
}
