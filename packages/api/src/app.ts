import { getPrismaClient, type DatabaseClient } from '@ai-tutor-pwa/db';
import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import { loadApiEnv, type ApiEnv } from './config/env.js';
import {
  closeRedisClient,
  createRedisClient,
  type RedisClient,
} from './lib/redis.js';
import { registerHealthRoutes } from './routes/health.js';

export interface BuildAppOptions {
  env?: ApiEnv;
  prismaClient?: DatabaseClient;
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

  await registerHealthRoutes(app, {
    env,
    prisma: prismaClient,
    redis: redisClient,
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
