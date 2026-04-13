import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { getPrismaClient } from '@ai-tutor-pwa/db';

import { buildApp } from '../src/app.js';
import { closeRedisClient, createRedisClient } from '../src/lib/redis.js';
import { createApiTestEnv } from './test-env.js';

const env = createApiTestEnv();
const redisClient = createRedisClient(env);
const prismaClient = getPrismaClient({
  DATABASE_URL: env.DATABASE_URL,
});
const app = await buildApp({
  env,
  prismaClient,
  redisClient,
});
await app.ready();

describe('health endpoint', () => {
  afterAll(async () => {
    await app.close();
    await closeRedisClient(redisClient);
    await prismaClient.$disconnect();
  });

  it('returns the API health payload', async () => {
    const response = await request(app.server).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      app: 'ai-tutor-pwa',
      status: 'ok',
      version: 'test',
    });
  });
});
