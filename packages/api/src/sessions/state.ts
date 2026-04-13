import { type DatabaseClient } from '@ai-tutor-pwa/db';
import type { StudySessionStateResponse } from '@ai-tutor-pwa/shared';

import { getOwnedSessionHandoffSnapshot } from './handoff.js';
import { getTeachingPlanForOwnedSession } from './planner.js';
import { toStudySessionLifecycleResponse, type StudySessionModel } from './service.js';

export class StudySessionStateProjectionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'StudySessionStateProjectionError';
  }
}

export async function getOwnedStudySessionState(
  prisma: Pick<
    DatabaseClient,
    'lessonSegment' | 'sessionHandoffSnapshot' | 'studySession'
  >,
  input: {
    sessionId: string;
    userId: string;
  },
): Promise<StudySessionStateResponse | null> {
  const session = await prisma.studySession.findFirst({
    include: {
      currentSection: true,
      document: {
        select: {
          id: true,
        },
      },
      learningProfile: true,
    },
    where: {
      document: {
        userId: input.userId,
      },
      id: input.sessionId,
      userId: input.userId,
    },
  });

  if (session === null) {
    return null;
  }

  const [handoffSnapshot, teachingPlan] = await Promise.all([
    getOwnedSessionHandoffSnapshot(prisma, input),
    getTeachingPlanForOwnedSession(prisma, input),
  ]);

  if (teachingPlan === null) {
    throw new StudySessionStateProjectionError(
      'Study session teaching plan is unavailable',
    );
  }

  const lifecycle = toStudySessionLifecycleResponse(
    session as StudySessionModel,
  );

  return {
    handoffSnapshot,
    learningProfile: lifecycle.learningProfile,
    session: lifecycle.session,
    teachingPlan,
  };
}
