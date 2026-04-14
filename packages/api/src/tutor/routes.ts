import type { DatabaseClient } from '@ai-tutor-pwa/db';
import {
  learnerResponseSchema,
  startTutorStreamRequestSchema,
  TUTOR_PATHS,
} from '@ai-tutor-pwa/shared';
import type { FastifyInstance } from 'fastify';

import { createRequireAuthPreHandler } from '../auth/session.js';
import type { ApiEnv } from '../config/env.js';
import { createAllowedOriginPreHandler } from '../lib/request-origin.js';
import {
  buildOwnedTutorStreamEvents,
  createTutorEventStream,
  StudySessionStateProjectionError,
  TutorStreamTransportError,
} from './transport.js';
import {
  applyEvaluationToMastery,
  classifyError,
  detectConfusionSignals,
} from './evaluation.js';
import { enforceMasteryTransition, persistCoverageStatusUpdate } from './mastery.js';
import { getOwnedStudySessionState } from '../sessions/state.js';

interface TutorRouteDependencies {
  env: ApiEnv;
  prisma: DatabaseClient;
}

export async function registerTutorRoutes(
  app: FastifyInstance,
  dependencies: TutorRouteDependencies,
): Promise<void> {
  const requireAuth = createRequireAuthPreHandler(
    dependencies.prisma,
    dependencies.env,
  );
  const requireAllowedOrigin = createAllowedOriginPreHandler(dependencies.env);

  app.post(
    TUTOR_PATHS.next,
    {
      preHandler: [requireAuth, requireAllowedOrigin],
    },
    async (request, reply): Promise<void> => {
      const parsedBody = startTutorStreamRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        });
      }

      try {
        const events = await buildOwnedTutorStreamEvents(dependencies.prisma, {
          sessionId: parsedBody.data.sessionId,
          userId: request.auth!.userId,
        });

        if (events === null) {
          return reply.status(404).send({
            message: 'Study session not found',
          });
        }

        reply.header('Cache-Control', 'no-cache, no-transform');
        reply.header('Connection', 'keep-alive');
        reply.header('Content-Type', 'text/event-stream; charset=utf-8');
        reply.header('X-Accel-Buffering', 'no');

        return reply.send(createTutorEventStream(request, events));
      } catch (error) {
        if (
          error instanceof TutorStreamTransportError ||
          error instanceof StudySessionStateProjectionError
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
    TUTOR_PATHS.evaluate,
    {
      preHandler: [requireAuth, requireAllowedOrigin],
    },
    async (request, reply): Promise<void> => {
      const parsedBody = learnerResponseSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        });
      }

      const userId = request.auth!.userId;
      const { sessionId, segmentId, content } = parsedBody.data;

      const sessionState = await getOwnedStudySessionState(dependencies.prisma, {
        sessionId,
        userId,
      });

      if (sessionState === null) {
        return reply.status(404).send({
          message: 'Study session not found',
        });
      }

      if (sessionState.session.status !== 'active') {
        return reply.status(409).send({
          message: 'Study session is not active',
        });
      }

      const segment = sessionState.teachingPlan.segments.find(
        (s) => s.id === segmentId,
      );

      if (segment === undefined) {
        return reply.status(404).send({
          message: 'Lesson segment not found in teaching plan',
        });
      }

      // Detect confusion signals from the raw response
      const confusionSignals = detectConfusionSignals(content);
      const hasConfusionSignals = confusionSignals.some(
        (s) => s !== 'no_signal',
      );

      // Build a heuristic evaluation (placeholder for AI-powered evaluation)
      const confusionScore = hasConfusionSignals ? 0.5 : 0.1;
      const isCorrect = !hasConfusionSignals && content.length >= 20;

      const evaluation = {
        confusionScore,
        confusionSignals,
        errorClassification: classifyError({
          confusionScore,
          confusionSignals,
          illusionOfUnderstanding: false,
          isCorrect,
        }),
        illusionOfUnderstanding: false,
        isCorrect,
        reasoning: isCorrect
          ? 'Response demonstrates understanding'
          : 'Response shows signs of confusion or insufficient depth',
      };

      // Apply evaluation to mastery state
      const masteryResult = enforceMasteryTransition(null, {
        conceptId: segment.conceptId,
        evaluation,
        segment,
      });

      // Persist coverage status update if needed
      if (masteryResult.coverageStatusUpdate !== null) {
        await persistCoverageStatusUpdate(dependencies.prisma, {
          atuIds: segment.atuIds,
          documentId: sessionState.session.documentId,
          status: masteryResult.coverageStatusUpdate,
          userId,
        });
      }

      return reply.status(200).send({
        evaluation,
        mastery: {
          conceptId: masteryResult.masteryRecord.conceptId,
          confusionScore: masteryResult.masteryRecord.confusionScore,
          previousStatus: masteryResult.previousStatus,
          status: masteryResult.masteryRecord.status,
        },
      });
    },
  );
}
