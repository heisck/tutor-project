import { afterAll, describe, expect, it } from 'vitest';

import {
  checkRedisConnection,
  closeRedisClient,
  createRedisClient,
} from '../src/lib/redis.js';
import { createApiTestEnv } from './test-env.js';

const redisClient = createRedisClient(createApiTestEnv());

describe('redis connectivity', () => {
  afterAll(async () => {
    await closeRedisClient(redisClient);
  });

  it('connects to redis successfully', async () => {
    await expect(checkRedisConnection(redisClient)).resolves.toEqual({ status: 'ok' });
  });
});
