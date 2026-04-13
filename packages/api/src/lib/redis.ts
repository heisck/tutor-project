import { Redis } from 'ioredis';

import type { ApiEnv } from '../config/env.js';

export type RedisClient = Redis;

export function createRedisClient(env: Pick<ApiEnv, 'REDIS_URL'>): Redis {
  return new Redis(env.REDIS_URL, {
    enableReadyCheck: true,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
}

export async function checkRedisConnection(
  client: Redis,
): Promise<{ status: 'ok' }> {
  const response = await client.ping();

  if (response !== 'PONG') {
    throw new Error('Unexpected Redis ping response');
  }

  return { status: 'ok' };
}

export async function closeRedisClient(client: Redis): Promise<void> {
  if (client.status !== 'end') {
    await client.quit();
  }
}
