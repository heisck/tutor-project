# Backend Validation Pipeline

This repository now has an automated backend validation workflow at `.github/workflows/backend-validation.yml`.

It enforces the repeatable checks needed for the backend foundation:

- install dependencies with `npm ci`
- start Docker-backed Postgres and Redis
- push the Prisma schema into the local test database
- run lint, typecheck, build, tests, and coverage through `npm run verify:backend`
- upload coverage artifacts for inspection

The workflow intentionally uses the committed `.env.test` file instead of `.env.local` so CI does not depend on developer-specific credentials or remote infrastructure.
