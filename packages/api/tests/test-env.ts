import { loadApiEnv, type ApiEnv } from '../src/config/env.js';

export function createApiTestEnv(
  overrides: Record<string, string> = {},
): ApiEnv {
  return loadApiEnv({
    APP_VERSION: 'test',
    COOKIE_SECRET: 'test-cookie-secret-1234567890abcd',
    CORS_ORIGINS: 'http://localhost:3000,https://app.domain.com',
    DATABASE_URL:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5433/ai_tutor_pwa?schema=public',
    GOOGLE_CLIENT_ID: 'test-google-client-id',
    GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:4000/api/v1/auth/oauth/callback',
    NODE_ENV: 'test',
    PORT: '4000',
    REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
    SESSION_TTL_HOURS: '168',
    ...overrides,
  });
}
