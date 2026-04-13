import { loadApiEnv, type ApiEnv } from '../src/config/env.js';

export function createApiTestEnv(): ApiEnv {
  return loadApiEnv({
    APP_VERSION: 'test',
    CORS_ORIGINS: 'http://localhost:3000,https://app.domain.com',
    DATABASE_URL:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5433/ai_tutor_pwa?schema=public',
    NODE_ENV: 'test',
    PORT: '4000',
    REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  });
}
