import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

import type { DatabaseClient } from '@ai-tutor-pwa/db';
import {
  serializeTutorStreamEvent,
  type TutorAction,
  type TutorStreamEvent,
  type TutorStreamMessagePayload,
} from '@ai-tutor-pwa/shared';
import type { FastifyRequest } from 'fastify';

import { retrieveChunksByText } from '../knowledge/retrieval.js';
import {
  getOwnedStudySessionState,
  StudySessionStateProjectionError,
} from '../sessions/state.js';
import { loadMasteryRecordsFromState } from './mastery.js';
import { orchestrateTutorNextStep } from './orchestrator.js';
import {
  createFallbackTutorAiProvider,
  type TutorAiProvider,
} from './provider.js';

export class TutorStreamTransportError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'TutorStreamTransportError';
  }
}

export interface OwnedTutorEventStreamBuildResult {
  decisionAction: TutorAction;
  degradedReason: string | null;
  documentId: string;
  events: readonly TutorStreamEvent[];
  nextSegmentId: string | null;
  providerCallCount: number;
  sessionId: string;
}

export async function buildOwnedTutorStreamEvents(
  prisma: Pick<
    DatabaseClient,
    | 'coverageLedger'
    | 'documentChunk'
    | 'lessonSegment'
    | 'sessionHandoffSnapshot'
    | 'studySession'
  >,
  input: {
    now?: Date;
    provider?: TutorAiProvider;
    sessionId: string;
    userId: string;
  },
): Promise<OwnedTutorEventStreamBuildResult | null> {
  const now = input.now ?? new Date();
  const provider = input.provider ?? createFallbackTutorAiProvider();
  const sessionState = await getOwnedStudySessionState(prisma, {
    sessionId: input.sessionId,
    userId: input.userId,
  });

  if (sessionState === null) {
    return null;
  }

  if (sessionState.session.status !== 'active') {
    throw new TutorStreamTransportError(
      'Tutor streaming requires an active study session',
    );
  }

  const currentSegment = resolveCurrentSegment(sessionState);

  if (currentSegment === null) {
    throw new TutorStreamTransportError(
      'Tutor streaming requires an active lesson segment',
    );
  }

  const masteryRecords = loadMasteryRecordsFromState(
    sessionState.teachingPlan.segments,
    sessionState.handoffSnapshot?.masterySnapshot ?? [],
  );
  const retrievalQuery = [
    currentSegment.conceptTitle,
    currentSegment.conceptDescription,
    currentSegment.checkPrompt,
  ].join(' ');
  const retrievalResult = await retrieveChunksByText(prisma as DatabaseClient, {
    documentId: sessionState.session.documentId,
    query: retrievalQuery,
    topK: Math.max(currentSegment.chunkIds.length, 3),
    userId: input.userId,
  });
  const orchestration = orchestrateTutorNextStep({
    masteryRecords,
    retrievedChunks: retrievalResult.chunks,
    sessionState,
  });
  const generatedMessage = await provider.generateTutorMessage(
    orchestration.promptContext,
  );
  const connectionId = randomUUID();
  const messagePayload: TutorStreamMessagePayload = {
    content: generatedMessage.text,
    format: 'markdown',
    messageId: buildTutorMessageId(
      sessionState.session.id,
      currentSegment.id,
      sessionState.session.currentStep,
    ),
    role: 'tutor',
    segmentId: currentSegment.id,
  };

  return {
    decisionAction: orchestration.decision.action,
    degradedReason: generatedMessage.degradedReason,
    documentId: sessionState.session.documentId,
    events: [
      {
        data: {
          action: 'stream_open',
          connectionId,
          protocolVersion: 'v1',
          retryAfterMs: 3000,
          sessionId: sessionState.session.id,
        },
        sentAt: now.toISOString(),
        sequence: 1,
        type: 'control',
      },
      {
        data: {
          currentSegmentId: currentSegment.id,
          currentStep: sessionState.session.currentStep,
          segmentOrdinal: currentSegment.ordinal,
          sessionId: sessionState.session.id,
          stage: 'segment_ready',
          totalSegments: sessionState.teachingPlan.segments.length,
        },
        sentAt: new Date(now.getTime() + 1).toISOString(),
        sequence: 2,
        type: 'progress',
      },
      {
        data: messagePayload,
        sentAt: new Date(now.getTime() + 2).toISOString(),
        sequence: 3,
        type: 'message',
      },
      {
        data: {
          currentSegmentId: currentSegment.id,
          deliveredEventCount: 4,
          reason: 'await_learner_response',
          sessionId: sessionState.session.id,
        },
        sentAt: new Date(now.getTime() + 3).toISOString(),
        sequence: 4,
        type: 'completion',
      },
    ],
    nextSegmentId:
      orchestration.decision.action === 'advance'
        ? resolveNextSegmentId(sessionState.teachingPlan.segments, currentSegment.id)
        : currentSegment.id,
    providerCallCount: generatedMessage.providerCallCount,
    sessionId: sessionState.session.id,
  };
}

export function createTutorEventStream(
  request: FastifyRequest,
  events: readonly TutorStreamEvent[],
): Readable {
  let clientClosed = false;
  const handleClose = () => {
    clientClosed = true;
  };

  request.raw.on('close', handleClose);

  return Readable.from(
    (async function* streamEvents() {
      try {
        for (const event of events) {
          if (clientClosed) {
            break;
          }

          yield serializeTutorStreamEvent(event);
        }
      } finally {
        request.raw.off('close', handleClose);
      }
    })(),
  );
}

function buildTutorMessageId(
  sessionId: string,
  segmentId: string,
  currentStep: number,
): string {
  return `tutor-message:${sessionId}:${segmentId}:${currentStep}`;
}

function resolveCurrentSegment(
  sessionState: NonNullable<
    Awaited<ReturnType<typeof getOwnedStudySessionState>>
  >,
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

function resolveNextSegmentId(
  segments: readonly {
    id: string;
    ordinal: number;
  }[],
  currentSegmentId: string,
): string | null {
  const currentSegment = segments.find((segment) => segment.id === currentSegmentId);

  if (currentSegment === undefined) {
    return null;
  }

  return (
    segments.find((segment) => segment.ordinal === currentSegment.ordinal + 1)?.id ??
    currentSegment.id
  );
}

export { StudySessionStateProjectionError };
