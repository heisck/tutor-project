import type { FastifyReply, FastifyRequest } from 'fastify';

import type { RedisClient } from './redis.js';

export interface RateLimitOptions {
  keyPrefix: string;
  limit: number;
  resolveKey: (request: FastifyRequest) => string | null;
  timeWindowSeconds: number;
}

export function createRateLimitPreHandler(
  redis: RedisClient,
  options: RateLimitOptions,
) {
  return async function rateLimitRequest(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const resolvedKey = options.resolveKey(request);

    if (resolvedKey === null) {
      return;
    }

    const key = `${options.keyPrefix}:${resolvedKey}`;
    const currentCount = await redis.incr(key);

    if (currentCount === 1) {
      await redis.expire(key, options.timeWindowSeconds);
    }

    const ttl = await redis.ttl(key);

    reply.header('X-RateLimit-Limit', options.limit.toString());
    reply.header(
      'X-RateLimit-Remaining',
      Math.max(options.limit - currentCount, 0).toString(),
    );

    if (currentCount > options.limit) {
      reply.header('Retry-After', Math.max(ttl, 1).toString());
      reply.status(429).send({
        message: 'Too many requests',
      });
    }
  };
}

export function createIpRateLimitPreHandler(
  redis: RedisClient,
  options: Omit<RateLimitOptions, 'resolveKey'>,
) {
  return createRateLimitPreHandler(redis, {
    ...options,
    resolveKey: (request) => request.ip,
  });
}

export function createUserRateLimitPreHandler(
  redis: RedisClient,
  options: Omit<RateLimitOptions, 'resolveKey'>,
) {
  return createRateLimitPreHandler(redis, {
    ...options,
    resolveKey: (request) => request.auth?.userId ?? null,
  });
}
