# Environment Variables Setup

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
KV_URL=rediss://default:password@host:port
KV_REST_API_URL=https://yourinstance.upstash.io
KV_REST_API_TOKEN=your_token_here

CORS_ORIGINS=http://localhost:8080,https://app.domain.com
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

2. Copy the example env file.

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

## Verification

Health check:

```bash
curl http://localhost:4000/health
```

Database check:

```bash
psql $DATABASE_URL -c "SELECT 1"
```

Sample signup request:

```http
POST http://localhost:4000/api/v1/auth/signup
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test123!@#",
  "name": "Test User"
}
```

## Troubleshooting

- Check `DATABASE_URL` if the API cannot boot.
- Check `REDIS_URL` if queue or session features fail.
- Check `CORS_ORIGINS` if an external client is blocked.
- Check `R2_*` variables if uploads fail.
- Check `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` if AI routes fail.
