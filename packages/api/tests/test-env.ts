import { loadApiEnv, type ApiEnv } from '../src/config/env.js';

export function createApiTestEnv(
  overrides: Record<string, string> = {},
): ApiEnv {
  return loadApiEnv({
    ANTHROPIC_API_KEY: 'test-anthropic-api-key',
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
    OPENAI_API_KEY: 'test-openai-api-key',
    PORT: '4000',
    REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
    R2_ACCESS_KEY_ID: 'test-r2-access-key-id',
    R2_BUCKET_NAME: 'test-private-bucket',
    R2_ENDPOINT: 'https://example-account-id.r2.cloudflarestorage.com',
    R2_SECRET_ACCESS_KEY: 'test-r2-secret-access-key',
    SESSION_TTL_HOURS: '168',
    ...overrides,
  });
}
