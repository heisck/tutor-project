import { type DatabaseClient } from '@ai-tutor-pwa/db';
import {
  FEEDBACK_PATHS,
  feedbackSubmissionRequestSchema,
  type FeedbackSubmissionResponse,
} from '@ai-tutor-pwa/shared';
import type { FastifyInstance } from 'fastify';

import { createRequireAuthPreHandler } from '../auth/session.js';
import { createRequireCsrfPreHandler } from '../auth/csrf.js';
import type { ApiEnv } from '../config/env.js';
import { createAllowedOriginPreHandler } from '../lib/request-origin.js';
import { createUserRateLimitPreHandler } from '../lib/rate-limit.js';
import type { RedisClient } from '../lib/redis.js';
import {
  FeedbackSubmissionError,
  submitOwnedUserFeedback,
} from './service.js';

interface FeedbackRouteDependencies {
  env: ApiEnv;
  prisma: DatabaseClient;
  rateLimitKeyPrefix?: string;
  redis: RedisClient;
}

export async function registerFeedbackRoutes(
  app: FastifyInstance,
  dependencies: FeedbackRouteDependencies,
): Promise<void> {
  const requireAuth = createRequireAuthPreHandler(
    dependencies.prisma,
    dependencies.env,
  );
  const requireAllowedOrigin = createAllowedOriginPreHandler(dependencies.env);
  const requireCsrf = createRequireCsrfPreHandler(dependencies.env);
  const feedbackRateLimit = createUserRateLimitPreHandler(dependencies.redis, {
    keyPrefix:
      dependencies.rateLimitKeyPrefix ?? 'rate-limit:tutor-feedback-submit',
    limit: 20,
    timeWindowSeconds: 60,
  });

  app.post(
    FEEDBACK_PATHS.submit,
    {
      preHandler: [requireAuth, requireAllowedOrigin, requireCsrf, feedbackRateLimit],
    },
    async (request, reply): Promise<FeedbackSubmissionResponse | void> => {
      const parsedBody = feedbackSubmissionRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        });
      }

      try {
        const response = await submitOwnedUserFeedback(dependencies.prisma, {
          contentType: parsedBody.data.contentType,
          lessonSegmentId: parsedBody.data.lessonSegmentId,
          messageId: parsedBody.data.messageId ?? null,
          reason: parsedBody.data.reason,
          sessionId: parsedBody.data.sessionId,
          userId: request.auth!.userId,
        });

        if (response === null) {
          return reply.status(404).send({
            message: 'Study session not found',
          });
        }

        return reply.status(201).send(response);
      } catch (error) {
        if (error instanceof FeedbackSubmissionError) {
          return reply.status(404).send({
            message: error.message,
          });
        }

        throw error;
      }
    },
  );
}
