import type { FastifyReply, FastifyRequest } from 'fastify';

import type { RedisClient } from './redis.js';

export interface RateLimitOptions {
  keyPrefix: string;
  limit: number;
  timeWindowSeconds: number;
}

export function createIpRateLimitPreHandler(
  redis: RedisClient,
  options: RateLimitOptions,
) {
  return async function rateLimitByIp(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const key = `${options.keyPrefix}:${request.ip}`;
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
