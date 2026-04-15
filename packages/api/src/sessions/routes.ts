import { type DatabaseClient } from '@ai-tutor-pwa/db';
import {
  ACADEMIC_LEVELS,
  EXPLANATION_START_PREFERENCES,
  SESSION_PATHS,
  STUDY_GOAL_PREFERENCES,
  STUDY_SESSION_MODES,
  sessionHandoffSnapshotInputSchema,
  type StudySessionLifecycleResponse,
  type StudySessionStateResponse,
} from '@ai-tutor-pwa/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { createRequireAuthPreHandler } from '../auth/session.js';
import { createRequireCsrfPreHandler } from '../auth/csrf.js';
import type { ApiEnv } from '../config/env.js';
import { createAllowedOriginPreHandler } from '../lib/request-origin.js';
import { createUserRateLimitPreHandler } from '../lib/rate-limit.js';
import type { RedisClient } from '../lib/redis.js';
import {
  pauseOwnedStudySessionWithHandoff,
  restoreOwnedStudySessionFromHandoff,
  SessionHandoffSnapshotError,
} from './handoff.js';
import {
  createStudySessionForOwnedDocument,
  LearningProfileRequiredError,
  StudySessionPlanningError,
  StudySessionTransitionError,
  toStudySessionLifecycleResponse,
} from './service.js';
import {
  getOwnedStudySessionState,
  StudySessionStateProjectionError,
} from './state.js';

const miniCalibrationSchema = z
  .object({
    academicLevel: z.enum(ACADEMIC_LEVELS),
    explanationStartPreference: z.enum(EXPLANATION_START_PREFERENCES),
    sessionGoal: z.enum(STUDY_GOAL_PREFERENCES),
  })
  .strict();

const startStudySessionSchema = z
  .object({
    calibration: miniCalibrationSchema.optional(),
    documentId: z.string().trim().min(1, 'documentId is required'),
    mode: z.enum(STUDY_SESSION_MODES).optional().default('full'),
  })
  .strict();

const sessionParamsSchema = z
  .object({
    sessionId: z.string().trim().min(1, 'sessionId is required'),
  })
  .strict();

const pauseStudySessionSchema = z
  .object({
    handoff: sessionHandoffSnapshotInputSchema.optional(),
  })
  .strict();

interface StudySessionRouteDependencies {
  env: ApiEnv;
  prisma: DatabaseClient;
  redis: RedisClient;
}

export async function registerStudySessionRoutes(
  app: FastifyInstance,
  dependencies: StudySessionRouteDependencies,
): Promise<void> {
  const requireAuth = createRequireAuthPreHandler(
    dependencies.prisma,
    dependencies.env,
  );
  const requireAllowedOrigin = createAllowedOriginPreHandler(dependencies.env);
  const requireCsrf = createRequireCsrfPreHandler(dependencies.env);
  const sessionReadRateLimit = createUserRateLimitPreHandler(
    dependencies.redis,
    {
      keyPrefix: 'rate-limit:sessions:read',
      limit: 120,
      timeWindowSeconds: 60,
    },
  );
  const sessionWriteRateLimit = createUserRateLimitPreHandler(
    dependencies.redis,
    {
      keyPrefix: 'rate-limit:sessions:write',
      limit: 60,
      timeWindowSeconds: 60,
    },
  );

  app.post(
    SESSION_PATHS.start,
    {
      preHandler: [
        requireAuth,
        requireAllowedOrigin,
        requireCsrf,
        sessionWriteRateLimit,
      ],
    },
    async (
      request,
      reply,
    ): Promise<StudySessionLifecycleResponse | void> => {
      const parsedBody = startStudySessionSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        });
      }

      try {
        const session = await createStudySessionForOwnedDocument(
          dependencies.prisma,
          {
            documentId: parsedBody.data.documentId,
            mode: parsedBody.data.mode,
            userId: request.auth!.userId,
            ...(parsedBody.data.calibration !== undefined
              ? { calibration: parsedBody.data.calibration }
              : {}),
          },
        );

        if (session === null) {
          return reply.status(404).send({
            message: 'Document not found',
          });
        }

        return reply.status(201).send(toStudySessionLifecycleResponse(session));
      } catch (error) {
        if (error instanceof LearningProfileRequiredError) {
          return reply.status(400).send({
            message: error.message,
          });
        }

        if (error instanceof StudySessionPlanningError) {
          return reply.status(409).send({
            message: error.message,
          });
        }

        throw error;
      }
    },
  );

  app.get(
    SESSION_PATHS.state(':sessionId'),
    {
      preHandler: [requireAuth, sessionReadRateLimit],
    },
    async (request, reply): Promise<StudySessionStateResponse | void> => {
      const parsedParams = sessionParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        return reply.status(400).send({
          message: parsedParams.error.issues[0]?.message ?? 'Invalid route params',
        });
      }

      try {
        const sessionState = await getOwnedStudySessionState(
          dependencies.prisma,
          {
            sessionId: parsedParams.data.sessionId,
            userId: request.auth!.userId,
          },
        );

        if (sessionState === null) {
          return reply.status(404).send({
            message: 'Study session not found',
          });
        }

        return reply.send(sessionState);
      } catch (error) {
        if (error instanceof StudySessionStateProjectionError) {
          return reply.status(409).send({
            message: error.message,
          });
        }

        throw error;
      }
    },
  );

  app.post(
    '/api/v1/sessions/:sessionId/pause',
    {
      preHandler: [
        requireAuth,
        requireAllowedOrigin,
        requireCsrf,
        sessionWriteRateLimit,
      ],
    },
    async (request, reply): Promise<StudySessionLifecycleResponse | void> => {
      const parsedParams = sessionParamsSchema.safeParse(request.params);
      const parsedBody = pauseStudySessionSchema.safeParse(request.body ?? {});

      if (!parsedParams.success) {
        return reply.status(400).send({
          message: parsedParams.error.issues[0]?.message ?? 'Invalid route params',
        });
      }

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        });
      }

      try {
        const session = await pauseOwnedStudySessionWithHandoff(
          dependencies.prisma,
          {
            ...(parsedBody.data.handoff !== undefined
              ? { handoff: parsedBody.data.handoff }
              : {}),
            sessionId: parsedParams.data.sessionId,
            userId: request.auth!.userId,
          },
        );

        if (session === null) {
          return reply.status(404).send({
            message: 'Study session not found',
          });
        }

        return reply.send(toStudySessionLifecycleResponse(session));
      } catch (error) {
        if (
          error instanceof SessionHandoffSnapshotError ||
          error instanceof StudySessionTransitionError
        ) {
          return reply.status(409).send({
            message: error.message,
          });
        }

        throw error;
      }
    },
  );

  app.post(
    '/api/v1/sessions/:sessionId/resume',
    {
      preHandler: [
        requireAuth,
        requireAllowedOrigin,
        requireCsrf,
        sessionWriteRateLimit,
      ],
    },
    async (request, reply): Promise<StudySessionLifecycleResponse | void> => {
      const parsedParams = sessionParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        return reply.status(400).send({
          message: parsedParams.error.issues[0]?.message ?? 'Invalid route params',
        });
      }

      try {
        const session = await restoreOwnedStudySessionFromHandoff(
          dependencies.prisma,
          {
            sessionId: parsedParams.data.sessionId,
            userId: request.auth!.userId,
          },
        );

        if (session === null) {
          return reply.status(404).send({
            message: 'Study session not found',
          });
        }

        return reply.send(toStudySessionLifecycleResponse(session));
      } catch (error) {
        if (
          error instanceof SessionHandoffSnapshotError ||
          error instanceof StudySessionTransitionError
        ) {
          return reply.status(409).send({
            message: error.message,
          });
        }

        throw error;
      }
    },
  );
}
