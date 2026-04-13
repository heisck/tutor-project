# ai-tutor-pwa

AI-powered study and tutoring PWA built with the Festival methodology.

## Workspace Structure

- `packages/web` — Next.js frontend
- `packages/api` — Fastify API service
- `packages/db` — Prisma schema and database client
- `packages/shared` — shared TypeScript types and constants
- `packages/emails` — React Email templates
- `festivals/active/ai-tutor-pwa-AT0001` — active FEST source of truth

## Tech Stack

- Turborepo monorepo
- Next.js + TypeScript + Tailwind CSS
- Fastify + Zod
- Prisma + PostgreSQL + pgvector
- Redis + BullMQ-ready wiring
- Vitest + Supertest

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file:

```bash
cp .env.example .env.local
```

3. Start PostgreSQL and Redis:

```bash
npm run docker:up
```

4. Generate the Prisma client and push the initial schema:

```bash
npm run db:generate
npm run db:push
```

5. Start the apps:

```bash
npm run dev
```

Frontend runs on `http://localhost:3000`.
API runs on `http://localhost:4000`.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
```

## Health Endpoints

- `GET /health`
- `GET /health/db`
- `GET /health/redis`
