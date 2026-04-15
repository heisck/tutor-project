# Production Readiness Guide

## 1) Required Environment Variables

The API validates these variables at startup.

| Variable | Required For | What It Is | Create It Here |
|---|---|---|---|
| `NODE_ENV` | API | Runtime mode (`development`, `test`, `production`) | N/A (set manually) |
| `PORT` | API | API server port (default `4000`) | N/A (set manually) |
| `APP_VERSION` | API | App release identifier for observability | N/A (set manually) |
| `DATABASE_URL` | API/DB | PostgreSQL connection string | https://www.postgresql.org/ |
| `REDIS_URL` | API | Redis connection for queue/session/rate limits | https://redis.io/ |
| `CORS_ORIGINS` | API | Comma-separated allowed origins | N/A (set manually) |
| `COOKIE_SECRET` | API | Session signing secret (32+ chars) | N/A (generate with password manager / `openssl rand`) |
| `SESSION_TTL_HOURS` | API | Session lifetime in hours | N/A (set manually) |
| `GOOGLE_CLIENT_ID` | API | OAuth client id | https://console.cloud.google.com/apis/credentials |
| `GOOGLE_CLIENT_SECRET` | API | OAuth client secret | https://console.cloud.google.com/apis/credentials |
| `GOOGLE_REDIRECT_URI` | API | OAuth callback URL | https://console.cloud.google.com/apis/credentials |
| `R2_ENDPOINT` | API | Cloudflare R2 S3-compatible endpoint | https://dash.cloudflare.com/ |
| `R2_ACCESS_KEY_ID` | API | R2 access key id | https://dash.cloudflare.com/ |
| `R2_SECRET_ACCESS_KEY` | API | R2 secret access key | https://dash.cloudflare.com/ |
| `R2_BUCKET_NAME` | API | R2 bucket used for private uploads | https://dash.cloudflare.com/ |
| `OPENAI_API_KEY` | API | OpenAI key for embeddings | https://platform.openai.com/api-keys |
| `ANTHROPIC_API_KEY` | API | Anthropic key for extraction/analysis/vision prompts | https://console.anthropic.com/settings/keys |

### Local bootstrap

1. Copy `.env.example` to `.env.local`.
2. Replace placeholders with real provider credentials.
3. Start dependencies (`postgres` + `redis`) before running test suites.

## 2) AI Engines in Use

Current engine configuration is centralized in `packages/api/src/lib/ai-runtime.ts`.

- **Anthropic Claude Haiku 4.5** (`claude-haiku-4-5-20251001`)
  - ATU extraction
  - Concept analysis
  - Vision-based image description
- **OpenAI text-embedding-3-small** (`text-embedding-3-small`)
  - Embedding generation for retrieval/indexing

## 3) Festival Status Snapshot

From active festival TODOs:

- `ai-tutor-pwa-AT0001`: planning phases complete, foundation phase marked ready to start.
- `ai-tutor-core-tutoring-AT0002`: planning status is still not started.

Interpretation: platform-level foundation work is in motion, but the dedicated tutoring-core festival planning artifacts still need execution before a full production launch gate.

## 4) Suggested Production Checklist

- [ ] Provision managed Postgres + Redis in target region.
- [ ] Configure OAuth callback URLs for each deploy environment.
- [ ] Configure Cloudflare R2 bucket policies and lifecycle rules.
- [ ] Set OpenAI + Anthropic billing alerts and key rotation policy.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test` in CI with service containers available.
- [ ] Add staging smoke tests for upload, parse, tutor session bootstrap, and auth login.
