import { getPrismaClient, type DatabaseClient } from '@ai-tutor-pwa/db';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import { registerAuthRoutes } from './auth/routes.js';
import type { GoogleOauthClient } from './auth/oauth/google.js';
import { loadApiEnv, type ApiEnv } from './config/env.js';
import { registerProfileRoutes } from './profile/routes.js';
import {
  closeRedisClient,
  createRedisClient,
  type RedisClient,
} from './lib/redis.js';
import { registerHealthRoutes } from './routes/health.js';

export interface BuildAppOptions {
  env?: ApiEnv;
  oauthClient?: GoogleOauthClient;
  prismaClient?: DatabaseClient;
  rateLimitKeyPrefix?: string;
  redisClient?: RedisClient;
}

export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const env = options.env ?? loadApiEnv();
  const prismaClient = options.prismaClient ?? getPrismaClient();
  const redisClient = options.redisClient ?? createRedisClient(env);

  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
    },
  });

  await app.register(cors, {
    credentials: true,
    origin: env.CORS_ORIGINS,
  });

  await app.register(cookie, {
    hook: 'onRequest',
    secret: env.COOKIE_SECRET,
  });

  app.decorateRequest('auth', null);

  await registerHealthRoutes(app, {
    env,
    prisma: prismaClient,
    redis: redisClient,
  });

  await registerAuthRoutes(app, {
    env,
    oauthClient: options.oauthClient,
    prisma: prismaClient,
    rateLimitKeyPrefix: options.rateLimitKeyPrefix,
    redis: redisClient,
  });

  await registerProfileRoutes(app, {
    env,
    prisma: prismaClient,
  });

  app.addHook('onClose', async () => {
    if (options.redisClient === undefined) {
      await closeRedisClient(redisClient);
    }

    if (options.prismaClient === undefined) {
      await prismaClient.$disconnect();
    }
  });

  return app;
}
