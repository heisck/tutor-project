import { getPrismaClient, type DatabaseClient } from '@ai-tutor-pwa/db';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance } from 'fastify';

import { registerAuthRoutes } from './auth/routes.js';
import type { GoogleOauthClient } from './auth/oauth/google.js';
import { loadApiEnv, type ApiEnv } from './config/env.js';
import {
  createDocumentProcessingQueue,
  type DocumentProcessingQueue,
} from './documents/queue.js';
import { registerDocumentRoutes } from './documents/routes.js';
import { registerProfileRoutes } from './profile/routes.js';
import { registerUploadRoutes } from './upload/routes.js';
import type { UploadStorageClient } from './upload/storage/r2.js';
import { MAX_UPLOAD_SIZE_BYTES } from './upload/validation.js';
import {
  closeRedisClient,
  createRedisClient,
  type RedisClient,
} from './lib/redis.js';
import { registerHealthRoutes } from './routes/health.js';

export interface BuildAppOptions {
  documentProcessingQueue?: DocumentProcessingQueue;
  env?: ApiEnv;
  oauthClient?: GoogleOauthClient;
  prismaClient?: DatabaseClient;
  rateLimitKeyPrefix?: string;
  redisClient?: RedisClient;
  uploadStorageClient?: UploadStorageClient;
}

export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const env = options.env ?? loadApiEnv();
  const documentProcessingQueue =
    options.documentProcessingQueue ?? createDocumentProcessingQueue(env);
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

  await app.register(multipart, {
    limits: {
      fields: 10,
      fileSize: MAX_UPLOAD_SIZE_BYTES,
      files: 1,
      parts: 20,
    },
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

  await registerUploadRoutes(app, {
    documentQueue: documentProcessingQueue,
    env,
    prisma: prismaClient,
    redis: redisClient,
    storageClient: options.uploadStorageClient,
  });

  await registerDocumentRoutes(app, {
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

    if (options.documentProcessingQueue === undefined) {
      await documentProcessingQueue.close?.();
    }
  });

  return app;
}
