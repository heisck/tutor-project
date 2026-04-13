import {
  checkDatabaseConnection,
  type DatabaseClient,
} from '@ai-tutor-pwa/db';
import {
  APP_NAME,
  HEALTH_PATHS,
  type HealthResponse,
  type ServiceHealthResponse,
} from '@ai-tutor-pwa/shared';
import type { FastifyInstance } from 'fastify';

import type { ApiEnv } from '../config/env.js';
import {
  checkRedisConnection,
  type RedisClient,
} from '../lib/redis.js';

interface HealthRouteDependencies {
  env: ApiEnv;
  prisma: DatabaseClient;
  redis: RedisClient;
}

export async function registerHealthRoutes(
  app: FastifyInstance,
  dependencies: HealthRouteDependencies,
): Promise<void> {
  app.get(HEALTH_PATHS.root, async (): Promise<HealthResponse> => ({
    app: APP_NAME,
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: dependencies.env.APP_VERSION,
  }));

  app.get(HEALTH_PATHS.db, async (_request, reply): Promise<ServiceHealthResponse> => {
    try {
      await checkDatabaseConnection(dependencies.prisma);

      return {
        service: 'database',
        status: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      app.log.error({ err: error }, 'Database health check failed');

      return reply.status(503).send({
        service: 'database',
        status: 'error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get(
    HEALTH_PATHS.redis,
    async (_request, reply): Promise<ServiceHealthResponse> => {
      try {
        await checkRedisConnection(dependencies.redis);

        return {
          service: 'redis',
          status: 'ok',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        app.log.error({ err: error }, 'Redis health check failed');

        return reply.status(503).send({
          service: 'redis',
          status: 'error',
          timestamp: new Date().toISOString(),
        });
      }
    },
  );
}
