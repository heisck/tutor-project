# Environment Variables Setup

## Quick Start (Development)

### 1. Root Environment (`.env.local`)
```bash
# Main repo env file used by `npm run dev`
# File: .env.local

# Required for actual features (update these):
OPENAI_API_KEY=sk-your-key
ANTHROPIC_API_KEY=sk-ant-your-key
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Redis will default to localhost:6379 if not provided
# Database URL should point to your local PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_tutor
```

### 2. Web Package (`packages/web/`)
```bash
# No API base URL is required for normal local development.
# Browser requests use same-origin `/api/*` routes and Next.js rewrites them
# to the API server on http://localhost:4000 by default.
```

### 3. Start Development
```bash
cd /path/to/tutor-project
npm install
npm run dev
```

---

## Core API Variables

Copy `.env.example` to `.env.local` and replace the placeholders with real values.

```bash
NODE_ENV=development
PORT=4000
APP_VERSION=0.1.0

DATABASE_URL=postgresql://user:password@host:port/dbname
POSTGRES_URL=postgresql://user:password@host:port/dbname
POSTGRES_URL_NON_POOLING=postgresql://user:password@host:port/dbname

REDIS_URL=redis://user:password@host:port
# Development default: redis://localhost:6379 (optional)

KV_URL=rediss://default:password@host:port
KV_REST_API_URL=https://yourinstance.upstash.io
KV_REST_API_TOKEN=your_token_here

CORS_ORIGINS=http://localhost:3000
COOKIE_SECRET=generate_32_char_random_string_here
JWT_SECRET=generate_32_char_random_string_here
SESSION_TTL_HOURS=168

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/v1/auth/oauth/callback

OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

R2_ENDPOINT=https://accountid.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=ai-tutor-pwa-private
```

## Test Environment

Backend tests use the committed `.env.test` file so they always point at the local Docker Postgres and Redis services:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/ai_tutor_pwa?schema=public
REDIS_URL=redis://localhost:6379
NODE_ENV=test
```

## Secret Generation

Use either of these:

```bash
openssl rand -base64 32
```

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Local Startup

1. Install dependencies.

```bash
npm install
```

2. Create the root env file from the example.

```bash
cp .env.example .env.local
```

3. Start Postgres and Redis.

```bash
npm run docker:up
```

4. Generate Prisma and push the schema.

```bash
npm run db:generate
npm run db:push
```

5. Start the repo services.

```bash
npm run dev
```

The API is available at `http://localhost:4000`.
In the current repo, `npm run dev` now starts the API with its document worker in the same dev process so uploads can move beyond `queued` without a separate manual worker launch.
The web app stays on `http://localhost:3000` and proxies browser `/api/*` calls to that API process.

## Production Process Model

For hosted deployments, run these as separate long-lived processes:

```bash
npm run start:web
npm run start:api
npm run start:worker
```

You will also need:

- PostgreSQL
- Redis
- R2-compatible object storage
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- Google OAuth credentials if you want Google sign-in enabled

## Verification

Health check:

```bash
curl http://localhost:4000/health
```

Database check:

```bash
psql $DATABASE_URL -c "SELECT 1"
```

There are no seeded or placeholder login accounts in the backend. Use the real signup endpoint to create a fresh local account when you need one.

## Troubleshooting

- Check `DATABASE_URL` if the API cannot boot.
- Check `REDIS_URL` if queue or session features fail.
- Check `CORS_ORIGINS` if an external client is blocked.
- Check `R2_*` variables if uploads fail.
- Check `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` if AI routes fail.
