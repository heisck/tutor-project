import { CoverageStatus, type DatabaseClient } from '@ai-tutor-pwa/db';
import {
  learnerResponseSchema,
  type SessionMasterySnapshotItem,
  startTutorStreamRequestSchema,
  tutorAssistantQuestionRequestSchema,
  TUTOR_PATHS,
} from '@ai-tutor-pwa/shared';
import type { FastifyInstance } from 'fastify';

import { createRequireAuthPreHandler } from '../auth/session.js';
import type { ApiEnv } from '../config/env.js';
import { createUserRateLimitPreHandler } from '../lib/rate-limit.js';
import type { RedisClient } from '../lib/redis.js';
import { createAllowedOriginPreHandler } from '../lib/request-origin.js';
import {
  buildOwnedTutorStreamEvents,
  createTutorEventStream,
  StudySessionStateProjectionError,
  TutorStreamTransportError,
} from './transport.js';
import {
  classifyError,
  detectConfusionSignals,
  recordExplanationAttempt,
} from './evaluation.js';
import {
  answerOwnedTutorQuestion,
  TutorAssistantQuestionError,
} from './assistant.js';
import {
  collectAssistantOutputText,
  collectTutorStreamOutputText,
  recordTutorRuntimeUsage,
} from './runtime-usage.js';
import {
  enforceMasteryTransition,
  loadMasteryRecordsFromState,
  persistCoverageStatusUpdate,
} from './mastery.js';
import { selectNextTutorCheckType } from './check-types.js';
import { getOwnedStudySessionState } from '../sessions/state.js';
import { saveOwnedStudySessionHandoffSnapshot } from '../sessions/handoff.js';

interface TutorRouteDependencies {
  env: ApiEnv;
  prisma: DatabaseClient;
  rateLimitKeyPrefix?: string;
  redis: RedisClient;
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
  const tutorRateLimit = createUserRateLimitPreHandler(dependencies.redis, {
    keyPrefix:
      dependencies.rateLimitKeyPrefix === undefined
        ? 'rate-limit:tutor-runtime'
        : `${dependencies.rateLimitKeyPrefix}:tutor-runtime`,
    limit: 60,
    timeWindowSeconds: 60,
  });
  const assistantRateLimit = createUserRateLimitPreHandler(dependencies.redis, {
    keyPrefix:
      dependencies.rateLimitKeyPrefix === undefined
        ? 'rate-limit:tutor-assistant-question'
        : `${dependencies.rateLimitKeyPrefix}:tutor-assistant-question`,
    limit: 30,
    timeWindowSeconds: 60,
  });

  app.post(
    TUTOR_PATHS.next,
    {
      preHandler: [requireAuth, requireAllowedOrigin, tutorRateLimit],
    },
    async (request, reply): Promise<void> => {
      const parsedBody = startTutorStreamRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        });
      }

      try {
        const streamResult = await buildOwnedTutorStreamEvents(
          dependencies.prisma,
          {
            sessionId: parsedBody.data.sessionId,
            userId: request.auth!.userId,
          },
        );

        if (streamResult === null) {
          return reply.status(404).send({
            message: 'Study session not found',
          });
        }

        await recordTutorRuntimeUsage(dependencies.prisma, {
          documentId: streamResult.documentId,
          inputText: [],
          metadata: {
            deliveredEventCount: streamResult.events.length,
          },
          outcome: 'streamed',
          outputText: collectTutorStreamOutputText(streamResult.events),
          route: 'tutor_next',
          sessionId: parsedBody.data.sessionId,
          userId: request.auth!.userId,
        });

        reply.header('Cache-Control', 'no-cache, no-transform');
        reply.header('Connection', 'keep-alive');
        reply.header('Content-Type', 'text/event-stream; charset=utf-8');
        reply.header('X-Accel-Buffering', 'no');

        return reply.send(createTutorEventStream(request, streamResult.events));
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
      preHandler: [requireAuth, requireAllowedOrigin, tutorRateLimit],
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
      const existingMastery = loadMasteryRecordsFromState(
        [segment],
        sessionState.handoffSnapshot?.masterySnapshot ?? [],
      ).get(segment.conceptId);
      const seededMastery = recordExplanationAttempt(
        existingMastery ?? null,
        segment.conceptId,
        mapExplanationStrategyToSessionType(segment.explanationStrategy),
      );
      const checkType = selectNextTutorCheckType(seededMastery, segment);
      const masteryResult = enforceMasteryTransition(seededMastery, {
        checkType,
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

      await saveOwnedStudySessionHandoffSnapshot(dependencies.prisma, {
        handoff: {
          currentSectionId: segment.sectionId,
          currentSegmentId: segment.id,
          currentStep: sessionState.session.currentStep,
          explanationHistory:
            sessionState.handoffSnapshot?.explanationHistory ?? [],
          masterySnapshot: mergeMasterySnapshot(
            sessionState.handoffSnapshot?.masterySnapshot ?? [],
            {
              conceptId: masteryResult.masteryRecord.conceptId,
              confusionScore: masteryResult.masteryRecord.confusionScore,
              evidenceCount: masteryResult.masteryRecord.evidenceHistory.length,
              status: masteryResult.masteryRecord.status,
            },
          ),
          resumeNotes: buildResumeNotes(
            segment.conceptTitle,
            masteryResult.masteryRecord.status,
          ),
          unresolvedAtuIds: updateUnresolvedAtuIds(
            sessionState.summary.unresolvedAtuIds,
            segment.atuIds,
            masteryResult.coverageStatusUpdate,
          ),
        },
        sessionId,
        userId,
      });

      await recordTutorRuntimeUsage(dependencies.prisma, {
        documentId: sessionState.session.documentId,
        inputText: [content],
        metadata: {
          checkType,
          confusionScore: evaluation.confusionScore,
          errorClassification: evaluation.errorClassification,
          isCorrect: evaluation.isCorrect,
          segmentId,
        },
        outcome: masteryResult.masteryRecord.status,
        outputText: [evaluation.reasoning],
        route: 'tutor_evaluate',
        sessionId,
        userId,
      });

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

  app.post(
    TUTOR_PATHS.question,
    {
      preHandler: [requireAuth, requireAllowedOrigin, assistantRateLimit],
    },
    async (request, reply): Promise<void> => {
      const parsedBody = tutorAssistantQuestionRequestSchema.safeParse(
        request.body,
      );

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        });
      }

      try {
        const response = await answerOwnedTutorQuestion(dependencies.prisma, {
          question: parsedBody.data.question,
          sessionId: parsedBody.data.sessionId,
          userId: request.auth!.userId,
        });

        if (response === null) {
          return reply.status(404).send({
            message: 'Study session not found',
          });
        }

        await recordTutorRuntimeUsage(dependencies.prisma, {
          documentId: response.documentId,
          inputText: [parsedBody.data.question],
          metadata: {
            currentSegmentId: response.currentSegmentId,
            groundedEvidenceCount: response.groundedEvidence.length,
          },
          outcome: response.outcome,
          outputText: collectAssistantOutputText(response),
          route: 'assistant_question',
          sessionId: parsedBody.data.sessionId,
          userId: request.auth!.userId,
        });

        return reply.status(200).send(response);
      } catch (error) {
        if (
          error instanceof TutorAssistantQuestionError ||
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
}

function mergeMasterySnapshot(
  currentSnapshot: readonly SessionMasterySnapshotItem[],
  nextEntry: SessionMasterySnapshotItem,
): SessionMasterySnapshotItem[] {
  const nextSnapshot = currentSnapshot.filter(
    (entry) => entry.conceptId !== nextEntry.conceptId,
  );

  return [...nextSnapshot, nextEntry];
}

function buildResumeNotes(
  conceptTitle: string,
  masteryStatus: SessionMasterySnapshotItem['status'],
): string {
  if (masteryStatus === 'weak' || masteryStatus === 'partial') {
    return `Quick recheck recommended for ${conceptTitle} before continuing.`;
  }

  return `Resume from ${conceptTitle} and continue the tutoring flow.`;
}

function updateUnresolvedAtuIds(
  unresolvedAtuIds: readonly string[],
  segmentAtuIds: readonly string[],
  coverageStatusUpdate: CoverageStatus | null,
): string[] {
  const nextUnresolvedAtuIds = new Set(unresolvedAtuIds);

  for (const atuId of segmentAtuIds) {
    if (coverageStatusUpdate === CoverageStatus.ASSESSED) {
      nextUnresolvedAtuIds.delete(atuId);
    } else {
      nextUnresolvedAtuIds.add(atuId);
    }
  }

  return [...nextUnresolvedAtuIds];
}

function mapExplanationStrategyToSessionType(
  explanationStrategy: 'example_first' | 'why_first' | 'direct',
): 'concrete_example' | 'analogy' | 'formal_definition' {
  switch (explanationStrategy) {
    case 'direct':
      return 'formal_definition';
    case 'why_first':
      return 'analogy';
    case 'example_first':
      return 'concrete_example';
  }
}
