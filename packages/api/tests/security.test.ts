import { randomUUID } from 'node:crypto';

import { createPrismaClient } from '@ai-tutor-pwa/db';
import { AUTH_PATHS } from '@ai-tutor-pwa/shared';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { buildApp } from '../src/app.js';
import { closeRedisClient, createRedisClient } from '../src/lib/redis.js';
import { createApiTestEnv } from './test-env.js';
import { createNoopDocumentProcessingQueue } from './test-doubles.js';

const testEmailPrefix = `security-test-${randomUUID()}`;
const env = createApiTestEnv();
const prismaClient = createPrismaClient({
  DATABASE_URL: env.DATABASE_URL,
});
const redisClient = createRedisClient(env);
const app = await buildApp({
  documentProcessingQueue: createNoopDocumentProcessingQueue(),
  env,
  prismaClient,
  rateLimitKeyPrefix: `rate-limit:security-test:${randomUUID()}`,
  redisClient,
});

beforeAll(async () => {
  await app.ready();
});

afterEach(async () => {
  await prismaClient.user.deleteMany({
    where: {
      email: {
        startsWith: testEmailPrefix,
      },
    },
  });
});

afterAll(async () => {
  await app.close();
  await closeRedisClient(redisClient);
  await prismaClient.$disconnect();
});

describe('security hardening', () => {
  it('sets hardened response headers on API responses', async () => {
    const response = await request(app.server).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['content-security-policy']).toBe(
      "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
  });

  it('rejects state-changing auth requests from untrusted origins', async () => {
    const response = await request(app.server)
      .post(AUTH_PATHS.signup)
      .set('Origin', 'https://malicious.example.com')
      .send({
        email: createTestEmail('origin-block'),
        password: 'password123',
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: 'Origin not allowed',
    });
  });
});

function createTestEmail(label: string): string {
  return `${testEmailPrefix}-${label}@example.com`;
}
