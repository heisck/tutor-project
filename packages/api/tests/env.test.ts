import { describe, expect, it } from 'vitest';

import { loadApiEnv } from '../src/config/env.js';

describe('api environment validation', () => {
  it('fails fast when required variables are missing', () => {
    expect(() =>
      loadApiEnv({
        APP_VERSION: 'test',
        CORS_ORIGINS: 'http://localhost:3000',
        NODE_ENV: 'test',
        PORT: '4000',
        REDIS_URL: 'redis://localhost:6379',
      }),
    ).toThrowError(/DATABASE_URL/);
  });
});
