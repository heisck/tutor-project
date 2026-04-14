import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

import type { DatabaseClient } from '@ai-tutor-pwa/db';
import {
  serializeTutorStreamEvent,
  type TutorStreamEvent,
  type TutorStreamMessagePayload,
} from '@ai-tutor-pwa/shared';
import type { FastifyRequest } from 'fastify';

import {
  getOwnedStudySessionState,
  StudySessionStateProjectionError,
} from '../sessions/state.js';

export class TutorStreamTransportError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'TutorStreamTransportError';
  }
}

export async function buildOwnedTutorStreamEvents(
  prisma: Pick<
    DatabaseClient,
    'lessonSegment' | 'sessionHandoffSnapshot' | 'studySession'
  >,
  input: {
    now?: Date;
    sessionId: string;
    userId: string;
  },
): Promise<readonly TutorStreamEvent[] | null> {
  const now = input.now ?? new Date();
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

  const connectionId = randomUUID();
  const messagePayload: TutorStreamMessagePayload = {
    content: buildInitialTutorMessage(currentSegment),
    format: 'markdown',
    messageId: randomUUID(),
    role: 'tutor',
    segmentId: currentSegment.id,
  };

  return [
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
  ];
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

function buildInitialTutorMessage(
  currentSegment: NonNullable<
    Awaited<ReturnType<typeof getOwnedStudySessionState>>
  >['teachingPlan']['segments'][number],
): string {
  return [
    `Let's begin with ${currentSegment.conceptTitle}.`,
    currentSegment.analogyPrompt,
    `When you're ready, check yourself with: ${currentSegment.checkPrompt}`,
  ].join('\n\n');
}

function resolveCurrentSegment(
  sessionState: NonNullable<
    Awaited<ReturnType<typeof getOwnedStudySessionState>>
  >,
) {
  const currentSegmentId =
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

export { StudySessionStateProjectionError };
