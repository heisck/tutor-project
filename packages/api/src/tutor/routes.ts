import { CoverageStatus, type DatabaseClient } from '@ai-tutor-pwa/db';
import {
  learnerResponseSchema,
  startTutorStreamRequestSchema,
  tutorAssistantQuestionRequestSchema,
  tutorVoiceCommandRequestSchema,
  tutorVoiceSynthesisRequestSchema,
  tutorVoiceTranscriptionRequestSchema,
  TUTOR_PATHS,
  type SessionExplanationHistoryItem,
  type SessionMasterySnapshotItem,
  type TutorAction,
  sessionTutorTurnStateSchema,
  voiceSessionStateSchema,
} from '@ai-tutor-pwa/shared';
import type { FastifyInstance } from 'fastify';

import { createRequireAuthPreHandler } from '../auth/session.js';
import { createRequireCsrfPreHandler } from '../auth/csrf.js';
import type { ApiEnv } from '../config/env.js';
import { createUserRateLimitPreHandler } from '../lib/rate-limit.js';
import type { RedisClient } from '../lib/redis.js';
import { createAllowedOriginPreHandler } from '../lib/request-origin.js';
import { retrieveChunksByText } from '../knowledge/retrieval.js';
import {
  getOwnedStudySessionState,
  StudySessionStateProjectionError,
} from '../sessions/state.js';
import { saveOwnedStudySessionHandoffSnapshot } from '../sessions/handoff.js';
import {
  answerOwnedTutorQuestion,
  TutorAssistantQuestionError,
} from './assistant.js';
import { selectNextTutorCheckType } from './check-types.js';
import {
  buildExplanationAttempt,
  createInitialMastery,
  recordExplanationAttempt,
} from './evaluation.js';
import {
  enforceMasteryTransition,
  loadMasteryRecordsFromState,
  persistCoverageStatusUpdate,
  updateConceptReviewState,
} from './mastery.js';
import { orchestrateTutorNextStep } from './orchestrator.js';
import { createTutorAiProvider } from './provider.js';
import {
  collectAssistantOutputText,
  collectTutorStreamOutputText,
  recordTutorRuntimeUsage,
} from './runtime-usage.js';
import {
  buildOwnedTutorStreamEvents,
  createTutorEventStream,
  TutorStreamTransportError,
} from './transport.js';

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
  const aiProvider = createTutorAiProvider(dependencies.env);
  const requireAuth = createRequireAuthPreHandler(
    dependencies.prisma,
    dependencies.env,
  );
  const requireAllowedOrigin = createAllowedOriginPreHandler(dependencies.env);
  const requireCsrf = createRequireCsrfPreHandler(dependencies.env);
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
      preHandler: [requireAuth, requireAllowedOrigin, requireCsrf, tutorRateLimit],
    },
    async (request, reply): Promise<void> => {
      const parsedBody = startTutorStreamRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        });
      }

      try {
        const streamResult = await buildOwnedTutorStreamEvents(dependencies.prisma, {
          provider: aiProvider,
          sessionId: parsedBody.data.sessionId,
          userId: request.auth!.userId,
        });

        if (streamResult === null) {
          return reply.status(404).send({
            message: 'Study session not found',
          });
        }

        const sessionState = await getOwnedStudySessionState(dependencies.prisma, {
          sessionId: parsedBody.data.sessionId,
          userId: request.auth!.userId,
        });

        if (sessionState === null) {
          return reply.status(404).send({
            message: 'Study session not found',
          });
        }

        const currentSegment = resolveActiveSegment(sessionState);
        if (currentSegment === null) {
          return reply.status(409).send({
            message: 'Tutor streaming requires an active lesson segment',
          });
        }

        let masterySnapshot = sessionState.handoffSnapshot?.masterySnapshot ?? [];
        let explanationHistory = sessionState.handoffSnapshot?.explanationHistory ?? [];
        const existingMastery = loadMasteryRecordsFromState(
          sessionState.teachingPlan.segments,
          masterySnapshot,
        ).get(currentSegment.conceptId) ?? createInitialMastery(currentSegment.conceptId);

        if (shouldRecordExplanation(streamResult.decisionAction)) {
          const seededMastery = recordExplanationAttempt(
            existingMastery,
            currentSegment.conceptId,
            mapExplanationStrategyToSessionType(currentSegment.explanationStrategy),
          );
          masterySnapshot = mergeMasterySnapshot(masterySnapshot, {
            conceptId: seededMastery.conceptId,
            confusionScore: seededMastery.confusionScore,
            evidenceCount: seededMastery.evidenceHistory.length,
            status: seededMastery.status,
          });
          explanationHistory = [
            ...explanationHistory,
            buildExplanationAttempt(
              currentSegment.conceptId,
              mapExplanationStrategyToSessionType(currentSegment.explanationStrategy),
              mapActionToExplanationOutcome(streamResult.decisionAction),
            ),
          ];

          await persistCoverageStatusUpdate(dependencies.prisma, {
            atuIds: currentSegment.atuIds,
            documentId: sessionState.session.documentId,
            status: CoverageStatus.TAUGHT,
            userId: request.auth!.userId,
          });
        }

        const nextSegment =
          streamResult.nextSegmentId === null
            ? null
            : sessionState.teachingPlan.segments.find(
                (segment) => segment.id === streamResult.nextSegmentId,
              ) ?? null;

        await saveOwnedStudySessionHandoffSnapshot(dependencies.prisma, {
          handoff: {
            currentSectionId:
              nextSegment?.sectionId ?? currentSegment.sectionId ?? sessionState.session.currentSectionId,
            currentSegmentId: nextSegment?.id ?? currentSegment.id,
            currentStep: sessionState.session.currentStep,
            explanationHistory,
            masterySnapshot,
            resumeNotes: buildResumeNotesForAction(
              streamResult.decisionAction,
              currentSegment.conceptTitle,
              nextSegment?.conceptTitle ?? null,
            ),
            turnState: {
              ...createDefaultTurnState(sessionState.handoffSnapshot?.turnState),
              lastRecommendedAction: streamResult.decisionAction,
              modeQueueCursor: nextSegment?.ordinal ?? currentSegment.ordinal,
            },
            unresolvedAtuIds:
              sessionState.handoffSnapshot?.unresolvedAtuIds ??
              sessionState.summary.unresolvedAtuIds,
            voiceState: createDefaultVoiceState(
              sessionState.handoffSnapshot?.voiceState,
            ),
          },
          sessionId: parsedBody.data.sessionId,
          userId: request.auth!.userId,
        });

        await recordTutorRuntimeUsage(dependencies.prisma, {
          documentId: streamResult.documentId,
          inputText: [],
          metadata: {
            decisionAction: streamResult.decisionAction,
            degradedReason: streamResult.degradedReason,
            deliveredEventCount: streamResult.events.length,
          },
          outcome: 'streamed',
          outputText: collectTutorStreamOutputText(streamResult.events),
          providerCallCount: streamResult.providerCallCount,
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
      preHandler: [requireAuth, requireAllowedOrigin, requireCsrf, tutorRateLimit],
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
        (candidate) => candidate.id === segmentId,
      );

      if (segment === undefined) {
        return reply.status(404).send({
          message: 'Lesson segment not found in teaching plan',
        });
      }

      const masteryRecords = loadMasteryRecordsFromState(
        sessionState.teachingPlan.segments,
        sessionState.handoffSnapshot?.masterySnapshot ?? [],
      );
      const currentMastery = masteryRecords.get(segment.conceptId) ?? null;
      const effectiveMastery =
        currentMastery === null || currentMastery.status === 'not_taught'
          ? recordExplanationAttempt(
              currentMastery ?? createInitialMastery(segment.conceptId),
              segment.conceptId,
              mapExplanationStrategyToSessionType(segment.explanationStrategy),
            )
          : currentMastery;
      const retrievalResult = await retrieveChunksByText(dependencies.prisma, {
        documentId: sessionState.session.documentId,
        query: `${segment.conceptTitle} ${segment.conceptDescription} ${content}`,
        topK: Math.max(segment.chunkIds.length, 3),
        userId,
      });
      const orchestration = orchestrateTutorNextStep({
        masteryRecords,
        retrievedChunks: retrievalResult.chunks,
        sessionState,
      });
      const checkType =
        orchestration.decision.nextCheckType ??
        (effectiveMastery === null
          ? selectNextTutorCheckType(
              recordExplanationAttempt(
                createInitialMastery(segment.conceptId),
                segment.conceptId,
                mapExplanationStrategyToSessionType(segment.explanationStrategy),
              ),
              segment,
            )
          : selectNextTutorCheckType(effectiveMastery, segment));
      const evaluationResult = await aiProvider.evaluateLearnerResponse({
        checkType,
        conceptTitle: segment.conceptTitle,
        learnerResponse: content,
        promptContext: orchestration.promptContext,
      });
      const masteryResult = enforceMasteryTransition(effectiveMastery, {
        checkType,
        conceptId: segment.conceptId,
        evaluation: evaluationResult.evaluation,
        segment,
      });

      if (masteryResult.coverageStatusUpdate !== null) {
        await persistCoverageStatusUpdate(dependencies.prisma, {
          atuIds: segment.atuIds,
          documentId: sessionState.session.documentId,
          status: masteryResult.coverageStatusUpdate,
          userId,
        });
      }

      await updateConceptReviewState(dependencies.prisma, {
        conceptId: segment.conceptId,
        documentId: sessionState.session.documentId,
        evaluation: evaluationResult.evaluation,
        masteryStatus: masteryResult.masteryRecord.status,
        userId,
      });

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
          turnState: {
            ...createDefaultTurnState(sessionState.handoffSnapshot?.turnState),
            currentCognitiveLoad: evaluationResult.evaluation.cognitiveLoad,
            lastErrorClassification:
              evaluationResult.evaluation.errorClassification,
            lastRecommendedAction:
              evaluationResult.evaluation.recommendedAction,
            modeQueueCursor: segment.ordinal,
            recentConfusionSignals: evaluationResult.evaluation.confusionSignals,
            responseQuality: evaluationResult.evaluation.responseQuality,
            unknownTermsQueue: evaluationResult.evaluation.unknownTerms,
          },
          unresolvedAtuIds: updateUnresolvedAtuIds(
            sessionState.summary.unresolvedAtuIds,
            segment.atuIds,
            masteryResult.coverageStatusUpdate,
          ),
          voiceState: createDefaultVoiceState(
            sessionState.handoffSnapshot?.voiceState,
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
          confusionScore: evaluationResult.evaluation.confusionScore,
          degradedReason: evaluationResult.degradedReason,
          errorClassification: evaluationResult.evaluation.errorClassification,
          isCorrect: evaluationResult.evaluation.isCorrect,
          recommendedAction: evaluationResult.evaluation.recommendedAction,
          segmentId,
        },
        outcome: masteryResult.masteryRecord.status,
        outputText: [evaluationResult.evaluation.reasoning],
        providerCallCount: evaluationResult.providerCallCount,
        route: 'tutor_evaluate',
        sessionId,
        userId,
      });

      return reply.status(200).send({
        evaluation: evaluationResult.evaluation,
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
      preHandler: [
        requireAuth,
        requireAllowedOrigin,
        requireCsrf,
        assistantRateLimit,
      ],
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
        const result = await answerOwnedTutorQuestion(dependencies.prisma, {
          provider: aiProvider,
          question: parsedBody.data.question,
          sessionId: parsedBody.data.sessionId,
          userId: request.auth!.userId,
        });

        if (result === null) {
          return reply.status(404).send({
            message: 'Study session not found',
          });
        }

        await recordTutorRuntimeUsage(dependencies.prisma, {
          documentId: result.response.documentId,
          inputText: [parsedBody.data.question],
          metadata: {
            currentSegmentId: result.response.currentSegmentId,
            groundedEvidenceCount: result.response.groundedEvidence.length,
          },
          outcome: result.response.outcome,
          outputText: collectAssistantOutputText(result.response),
          providerCallCount: result.providerCallCount,
          route: 'assistant_question',
          sessionId: parsedBody.data.sessionId,
          userId: request.auth!.userId,
        });

        return reply.status(200).send(result.response);
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

  app.post(
    TUTOR_PATHS.voiceTranscribe,
    {
      preHandler: [requireAuth, requireAllowedOrigin, requireCsrf, tutorRateLimit],
    },
    async (request, reply): Promise<void> => {
      const parsedBody = tutorVoiceTranscriptionRequestSchema.safeParse(
        request.body,
      );

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        });
      }

      const sessionState = await getOwnedStudySessionState(dependencies.prisma, {
        sessionId: parsedBody.data.sessionId,
        userId: request.auth!.userId,
      });

      if (sessionState === null) {
        return reply.status(404).send({ message: 'Study session not found' });
      }

      const transcriptionResult = await aiProvider.transcribeAudio({
        audioBase64: parsedBody.data.audioBase64,
        mimeType: parsedBody.data.mimeType,
      });
      const voiceState = {
        ...createDefaultVoiceState(sessionState.handoffSnapshot?.voiceState),
        isHandsFree: true,
        lastTranscript: transcriptionResult.transcript,
        pendingCommand: null,
      };

      await saveOwnedStudySessionHandoffSnapshot(dependencies.prisma, {
        handoff: {
          currentSectionId:
            sessionState.handoffSnapshot?.currentSectionId ??
            sessionState.session.currentSectionId,
          currentSegmentId:
            sessionState.handoffSnapshot?.currentSegmentId ??
            sessionState.session.currentSegmentId ??
            sessionState.teachingPlan.currentSegmentId ??
            sessionState.teachingPlan.segments[0]?.id,
          currentStep: sessionState.session.currentStep,
          explanationHistory:
            sessionState.handoffSnapshot?.explanationHistory ?? [],
          masterySnapshot: sessionState.handoffSnapshot?.masterySnapshot ?? [],
          resumeNotes: sessionState.handoffSnapshot?.resumeNotes ?? null,
          turnState: createDefaultTurnState(sessionState.handoffSnapshot?.turnState),
          unresolvedAtuIds:
            sessionState.handoffSnapshot?.unresolvedAtuIds ??
            sessionState.summary.unresolvedAtuIds,
          voiceState,
        },
        sessionId: parsedBody.data.sessionId,
        userId: request.auth!.userId,
      });

      return reply.status(200).send({
        transcript: transcriptionResult.transcript,
        voiceState,
      });
    },
  );

  app.post(
    TUTOR_PATHS.voiceSynthesize,
    {
      preHandler: [requireAuth, requireAllowedOrigin, requireCsrf, tutorRateLimit],
    },
    async (request, reply): Promise<void> => {
      const parsedBody = tutorVoiceSynthesisRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        });
      }

      const sessionState = await getOwnedStudySessionState(dependencies.prisma, {
        sessionId: parsedBody.data.sessionId,
        userId: request.auth!.userId,
      });

      if (sessionState === null) {
        return reply.status(404).send({ message: 'Study session not found' });
      }

      const synthesisResult = await aiProvider.synthesizeSpeech({
        playbackRate:
          parsedBody.data.playbackRate ??
          sessionState.handoffSnapshot?.voiceState?.playbackRate ??
          1,
        text: parsedBody.data.text,
      });
      const voiceState = {
        ...createDefaultVoiceState(sessionState.handoffSnapshot?.voiceState),
        playbackRate: synthesisResult.playbackRate,
      };

      await saveOwnedStudySessionHandoffSnapshot(dependencies.prisma, {
        handoff: {
          currentSectionId:
            sessionState.handoffSnapshot?.currentSectionId ??
            sessionState.session.currentSectionId,
          currentSegmentId:
            sessionState.handoffSnapshot?.currentSegmentId ??
            sessionState.session.currentSegmentId ??
            sessionState.teachingPlan.currentSegmentId ??
            sessionState.teachingPlan.segments[0]?.id,
          currentStep: sessionState.session.currentStep,
          explanationHistory:
            sessionState.handoffSnapshot?.explanationHistory ?? [],
          masterySnapshot: sessionState.handoffSnapshot?.masterySnapshot ?? [],
          resumeNotes: sessionState.handoffSnapshot?.resumeNotes ?? null,
          turnState: createDefaultTurnState(sessionState.handoffSnapshot?.turnState),
          unresolvedAtuIds:
            sessionState.handoffSnapshot?.unresolvedAtuIds ??
            sessionState.summary.unresolvedAtuIds,
          voiceState,
        },
        sessionId: parsedBody.data.sessionId,
        userId: request.auth!.userId,
      });

      return reply.status(200).send({
        audioBase64: synthesisResult.audioBase64,
        contentType: synthesisResult.contentType,
        playbackRate: synthesisResult.playbackRate,
        voiceState,
      });
    },
  );

  app.post(
    TUTOR_PATHS.voiceCommand,
    {
      preHandler: [requireAuth, requireAllowedOrigin, requireCsrf, tutorRateLimit],
    },
    async (request, reply): Promise<void> => {
      const parsedBody = tutorVoiceCommandRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        });
      }

      const sessionState = await getOwnedStudySessionState(dependencies.prisma, {
        sessionId: parsedBody.data.sessionId,
        userId: request.auth!.userId,
      });

      if (sessionState === null) {
        return reply.status(404).send({ message: 'Study session not found' });
      }

      const currentSegment = resolveActiveSegment(sessionState);
      const previousSegment = getAdjacentSegment(
        sessionState.teachingPlan.segments,
        currentSegment?.id ?? null,
        -1,
      );
      const nextAction = mapVoiceCommandToTutorAction(parsedBody.data.command);
      const voiceState = {
        ...createDefaultVoiceState(sessionState.handoffSnapshot?.voiceState),
        isHandsFree: true,
        pendingCommand: null,
        playbackRate:
          parsedBody.data.command === 'slower'
            ? Math.max(
                0.5,
                (sessionState.handoffSnapshot?.voiceState?.playbackRate ?? 1) - 0.15,
              )
            : sessionState.handoffSnapshot?.voiceState?.playbackRate ?? 1,
      };

      await saveOwnedStudySessionHandoffSnapshot(dependencies.prisma, {
        handoff: {
          currentSectionId:
            parsedBody.data.command === 'go_back'
              ? previousSegment?.sectionId ?? currentSegment?.sectionId ?? null
              : sessionState.handoffSnapshot?.currentSectionId ??
                sessionState.session.currentSectionId,
          currentSegmentId:
            parsedBody.data.command === 'go_back'
              ? previousSegment?.id ?? currentSegment?.id ?? sessionState.session.currentSegmentId ?? sessionState.teachingPlan.currentSegmentId ?? sessionState.teachingPlan.segments[0]?.id
              : sessionState.handoffSnapshot?.currentSegmentId ??
                sessionState.session.currentSegmentId ??
                sessionState.teachingPlan.currentSegmentId ??
                sessionState.teachingPlan.segments[0]?.id,
          currentStep: sessionState.session.currentStep,
          explanationHistory:
            sessionState.handoffSnapshot?.explanationHistory ?? [],
          masterySnapshot: sessionState.handoffSnapshot?.masterySnapshot ?? [],
          resumeNotes:
            parsedBody.data.command === 'go_back' && previousSegment !== null
              ? `Go back to ${previousSegment.conceptTitle} before continuing.`
              : sessionState.handoffSnapshot?.resumeNotes ?? null,
          turnState: {
            ...createDefaultTurnState(sessionState.handoffSnapshot?.turnState),
            lastRecommendedAction: nextAction,
            modeQueueCursor:
              parsedBody.data.command === 'go_back' && previousSegment !== null
                ? previousSegment.ordinal
                : sessionState.modeContext.queueCursor,
          },
          unresolvedAtuIds:
            sessionState.handoffSnapshot?.unresolvedAtuIds ??
            sessionState.summary.unresolvedAtuIds,
          voiceState,
        },
        sessionId: parsedBody.data.sessionId,
        userId: request.auth!.userId,
      });

      return reply.status(200).send({
        appliedCommand: parsedBody.data.command,
        nextAction,
        responseText: buildVoiceCommandResponse(
          parsedBody.data.command,
          currentSegment?.conceptTitle ?? 'the current concept',
        ),
        voiceState,
      });
    },
  );
}

function createDefaultTurnState(
  turnState: unknown,
) {
  return sessionTutorTurnStateSchema.parse(turnState ?? {});
}

function createDefaultVoiceState(
  voiceState: unknown,
) {
  return voiceSessionStateSchema.parse(voiceState ?? {});
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

function buildResumeNotesForAction(
  action: TutorAction,
  currentConceptTitle: string,
  nextConceptTitle: string | null,
): string {
  if (action === 'advance' && nextConceptTitle !== null) {
    return `Move on from ${currentConceptTitle} into ${nextConceptTitle}.`;
  }

  if (action === 'complete_session') {
    return `Session summary is ready after finishing ${currentConceptTitle}.`;
  }

  return `Resume with ${currentConceptTitle}.`;
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

function resolveActiveSegment(
  sessionState: NonNullable<Awaited<ReturnType<typeof getOwnedStudySessionState>>>,
) {
  const currentSegmentId =
    sessionState.handoffSnapshot?.currentSegmentId ??
    sessionState.session.currentSegmentId ??
    sessionState.teachingPlan.currentSegmentId;

  if (currentSegmentId === null) {
    return null;
  }

  return (
    sessionState.teachingPlan.segments.find(
      (segment) => segment.id === currentSegmentId,
    ) ?? null
  );
}

function shouldRecordExplanation(action: TutorAction): boolean {
  return (
    action === 'teach' ||
    action === 'reteach' ||
    action === 'refine' ||
    action === 'simpler'
  );
}

function mapActionToExplanationOutcome(
  action: TutorAction,
): SessionExplanationHistoryItem['outcome'] {
  switch (action) {
    case 'teach':
      return 'successful';
    case 'reteach':
    case 'refine':
    case 'simpler':
      return 'weak';
    default:
      return 'failed';
  }
}

function mapVoiceCommandToTutorAction(
  command:
    | 'pause'
    | 'continue'
    | 'slower'
    | 'repeat'
    | 'simpler'
    | 'example'
    | 'go_back'
    | 'test_me',
): TutorAction {
  switch (command) {
    case 'pause':
      return 'check';
    case 'continue':
      return 'teach';
    case 'slower':
      return 'simpler';
    case 'repeat':
      return 'reteach';
    case 'simpler':
      return 'simpler';
    case 'example':
      return 'reteach';
    case 'go_back':
      return 'reteach';
    case 'test_me':
      return 'check';
  }
}

function buildVoiceCommandResponse(
  command: 'pause' | 'continue' | 'slower' | 'repeat' | 'simpler' | 'example' | 'go_back' | 'test_me',
  conceptTitle: string,
): string {
  switch (command) {
    case 'pause':
      return `Paused on ${conceptTitle}. Say continue when you want to pick it up again.`;
    case 'continue':
      return `Continuing with ${conceptTitle}.`;
    case 'slower':
      return `I will slow down and use smaller steps for ${conceptTitle}.`;
    case 'repeat':
      return `I will repeat ${conceptTitle} from a different angle.`;
    case 'simpler':
      return `I will explain ${conceptTitle} more simply.`;
    case 'example':
      return `I will give a fresh example for ${conceptTitle}.`;
    case 'go_back':
      return 'Going back one concept so you can rebuild the missing piece.';
    case 'test_me':
      return `I will test your understanding of ${conceptTitle}.`;
  }
}

function getAdjacentSegment(
  segments: readonly {
    id: string;
    ordinal: number;
    sectionId: string | null;
    conceptTitle: string;
  }[],
  currentSegmentId: string | null,
  direction: -1 | 1,
) {
  if (currentSegmentId === null) {
    return null;
  }

  const currentSegment = segments.find((segment) => segment.id === currentSegmentId);
  if (currentSegment === undefined) {
    return null;
  }

  return (
    segments.find(
      (segment) => segment.ordinal === currentSegment.ordinal + direction,
    ) ?? null
  );
}
