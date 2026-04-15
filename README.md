# TutorAI

TutorAI is an adaptive AI learning system that turns study material into a guided, voice-friendly, mastery-based tutoring experience grounded in evidence instead of assumption.

## Product Definition

The product is designed to:

- ingest source material without silently dropping important content
- break content into atomic teachable units (ATUs)
- build concept and prerequisite structure before teaching
- calibrate how a learner actually learns
- teach in the right order with checks, reteaching, and difficulty control
- require evidence before calling anything mastered
- resume exactly where the learner left off

## Learner Journey

1. Upload PDFs, slide decks, notes, or documents.
2. Extract structure, visuals, ATUs, concepts, prerequisites, and likely misconceptions.
3. Calibrate the learner through behavior and short tasks.
4. Teach with guided modes like step by step tutoring, difficult-parts-only review, quiz, exam prep, flashcards, and voice support.
5. Verify mastery through explanation, application, transfer, and simplified restatement.
6. Revisit weak concepts and continue from the exact prior state.

## Repository Map

- `packages/web` - Next.js learner experience
- `packages/api` - Fastify API, ingestion pipeline, tutor runtime, session orchestration
- `packages/db` - Prisma schema and persistence
- `packages/shared` - shared contracts and schemas
- `festivals/active/ai-tutor-pwa-AT0001` - platform foundation festival
- `festivals/active/ai-tutor-core-tutoring-AT0002` - tutoring-core festival

## Product Source Of Truth

- [`workflow/design/adaptive-ai-learning-system/README.md`](workflow/design/adaptive-ai-learning-system/README.md)
- [`workflow/design/adaptive-ai-learning-system/IMPLEMENTATION_PLAN.md`](workflow/design/adaptive-ai-learning-system/IMPLEMENTATION_PLAN.md)

## Local Setup

1. Install dependencies.

```bash
npm install
```

2. Copy the environment file.

```bash
cp .env.example .env.local
```

3. Start PostgreSQL and Redis.

```bash
npm run docker:up
```

4. Generate the Prisma client and push the schema.

```bash
npm run db:generate
npm run db:push
```

5. Start the apps.

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
