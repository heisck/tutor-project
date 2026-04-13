import { describe, expect, it } from 'vitest';

import { loadApiEnv } from '../src/config/env.js';

describe('api environment validation', () => {
  it('fails fast when required variables are missing', () => {
    expect(() =>
      loadApiEnv({
        APP_VERSION: 'test',
        COOKIE_SECRET: 'test-cookie-secret-1234567890abcd',
        CORS_ORIGINS: 'http://localhost:3000',
        GOOGLE_CLIENT_ID: 'test-google-client-id',
        GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
        GOOGLE_REDIRECT_URI: 'http://localhost:4000/api/v1/auth/oauth/callback',
        NODE_ENV: 'test',
        PORT: '4000',
        REDIS_URL: 'redis://localhost:6379',
        SESSION_TTL_HOURS: '168',
      }),
    ).toThrowError(/DATABASE_URL/);
  });
});
