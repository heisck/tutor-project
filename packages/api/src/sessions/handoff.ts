import {
  StudySessionStatus as PrismaStudySessionStatus,
  type DatabaseClient,
  type Prisma,
  type SessionHandoffSnapshot,
} from '@ai-tutor-pwa/db';
import {
  sessionHandoffSnapshotInputSchema,
  sessionHandoffSnapshotRecordSchema,
  sessionHandoffSnapshotSchema,
  type SessionHandoffSnapshotInput,
  type SessionHandoffSnapshotRecord,
} from '@ai-tutor-pwa/shared';

import { getTeachingPlanForOwnedSession } from './planner.js';
import {
  transitionOwnedStudySessionRecord,
  type StudySessionModel,
} from './service.js';

export class SessionHandoffSnapshotError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'SessionHandoffSnapshotError';
  }
}

type SessionHandoffTransactionClient = Pick<
  DatabaseClient,
  'lessonSegment' | 'sessionHandoffSnapshot' | 'studySession'
>;

type SessionHandoffClient = Pick<DatabaseClient, '$transaction'> &
  SessionHandoffTransactionClient;

export async function pauseOwnedStudySessionWithHandoff(
  prisma: SessionHandoffClient,
  input: {
    handoff?: SessionHandoffSnapshotInput;
    now?: Date;
    sessionId: string;
    userId: string;
  },
): Promise<StudySessionModel | null> {
  const now = input.now ?? new Date();

  return prisma.$transaction(async (transaction) => {
    const session = await persistOwnedSessionHandoffSnapshot(transaction, {
      sessionId: input.sessionId,
      userId: input.userId,
      ...(input.handoff !== undefined ? { handoff: input.handoff } : {}),
    });

    if (session === null) {
      return null;
    }

    return transitionOwnedStudySessionRecord(transaction, {
      nextStatus: PrismaStudySessionStatus.PAUSED,
      now,
      sessionId: session.id,
      userId: input.userId,
    });
  });
}

export async function restoreOwnedStudySessionFromHandoff(
  prisma: SessionHandoffClient,
  input: {
    now?: Date;
    sessionId: string;
    userId: string;
  },
): Promise<StudySessionModel | null> {
  const now = input.now ?? new Date();

  return prisma.$transaction(async (transaction) => {
    const session = await transaction.studySession.findFirst({
      select: {
        id: true,
      },
      where: {
        id: input.sessionId,
        userId: input.userId,
      },
    });

    if (session === null) {
      return null;
    }

    const handoffSnapshot = await getOwnedSessionHandoffSnapshot(transaction, {
      sessionId: session.id,
      userId: input.userId,
    });

    if (handoffSnapshot === null) {
      throw new SessionHandoffSnapshotError(
        'No saved handoff snapshot exists for this study session',
      );
    }

    const validatedSnapshot = await validateSnapshotAgainstTeachingPlan(
      transaction,
      {
        sessionId: session.id,
        snapshot: handoffSnapshot,
        userId: input.userId,
      },
    );

    return transitionOwnedStudySessionRecord(transaction, {
      data: {
        currentSectionId: validatedSnapshot.currentSectionId,
        currentSegmentId: validatedSnapshot.currentSegmentId,
        currentStep: validatedSnapshot.currentStep,
      },
      nextStatus: PrismaStudySessionStatus.ACTIVE,
      now,
      sessionId: session.id,
      userId: input.userId,
    });
  });
}

export async function getOwnedSessionHandoffSnapshot(
  prisma: Pick<DatabaseClient, 'sessionHandoffSnapshot'>,
  input: {
    sessionId: string;
    userId: string;
  },
): Promise<SessionHandoffSnapshotRecord | null> {
  const snapshot = await prisma.sessionHandoffSnapshot.findFirst({
    where: {
      studySessionId: input.sessionId,
      userId: input.userId,
    },
  });

  if (snapshot === null) {
    return null;
  }

  return toSessionHandoffSnapshotRecord(snapshot);
}

async function persistOwnedSessionHandoffSnapshot(
  prisma: SessionHandoffTransactionClient,
  input: {
    handoff?: SessionHandoffSnapshotInput;
    sessionId: string;
    userId: string;
  },
): Promise<{ documentId: string; id: string } | null> {
  const session = await prisma.studySession.findFirst({
    select: {
      currentSectionId: true,
      currentSegmentId: true,
      currentStep: true,
      documentId: true,
      id: true,
    },
    where: {
      id: input.sessionId,
      userId: input.userId,
    },
  });

  if (session === null) {
    return null;
  }

  const parsedInput = sessionHandoffSnapshotInputSchema.parse(input.handoff ?? {});
  const snapshot = await buildValidatedSnapshot(prisma, {
    documentId: session.documentId,
    fallbackSectionId: session.currentSectionId,
    fallbackSegmentId: session.currentSegmentId,
    fallbackStep: session.currentStep,
    sessionId: session.id,
    snapshot: parsedInput,
    userId: input.userId,
  });

  await prisma.sessionHandoffSnapshot.upsert({
    create: {
      currentSectionId: snapshot.currentSectionId,
      currentSegmentId: snapshot.currentSegmentId,
      currentStep: snapshot.currentStep,
      documentId: session.documentId,
      explanationHistory: toJsonValue(snapshot.explanationHistory),
      masterySnapshot: toJsonValue(snapshot.masterySnapshot),
      resumeNotes: snapshot.resumeNotes,
      studySessionId: session.id,
      unresolvedAtuIds: snapshot.unresolvedAtuIds,
      userId: input.userId,
    },
    update: {
      currentSectionId: snapshot.currentSectionId,
      currentSegmentId: snapshot.currentSegmentId,
      currentStep: snapshot.currentStep,
      explanationHistory: toJsonValue(snapshot.explanationHistory),
      masterySnapshot: toJsonValue(snapshot.masterySnapshot),
      resumeNotes: snapshot.resumeNotes,
      unresolvedAtuIds: snapshot.unresolvedAtuIds,
    },
    where: {
      studySessionId: session.id,
    },
  });

  return {
    documentId: session.documentId,
    id: session.id,
  };
}

async function buildValidatedSnapshot(
  prisma: SessionHandoffTransactionClient,
  input: {
    documentId: string;
    fallbackSectionId: string | null;
    fallbackSegmentId: string | null;
    fallbackStep: number;
    sessionId: string;
    snapshot: SessionHandoffSnapshotInput;
    userId: string;
  },
) {
  const teachingPlan = await getTeachingPlanForOwnedSession(prisma, {
    sessionId: input.sessionId,
    userId: input.userId,
  });

  if (teachingPlan === null || teachingPlan.segments.length === 0) {
    throw new SessionHandoffSnapshotError(
      'The study session teaching plan is unavailable for handoff persistence',
    );
  }

  const currentSegmentId =
    input.snapshot.currentSegmentId ?? input.fallbackSegmentId;

  if (currentSegmentId === null) {
    throw new SessionHandoffSnapshotError(
      'Session handoff snapshot requires an active lesson segment',
    );
  }

  const matchingSegment = teachingPlan.segments.find(
    (segment) => segment.id === currentSegmentId,
  );

  if (matchingSegment === undefined) {
    throw new SessionHandoffSnapshotError(
      'Saved handoff snapshot references a lesson segment that is not in the current teaching plan',
    );
  }

  const currentSectionId =
    input.snapshot.currentSectionId ??
    matchingSegment.sectionId ??
    input.fallbackSectionId;

  if (currentSectionId !== matchingSegment.sectionId) {
    throw new SessionHandoffSnapshotError(
      'Saved handoff snapshot section does not match the selected lesson segment',
    );
  }

  const planAtuIds = new Set(
    teachingPlan.segments.flatMap((segment) => segment.atuIds),
  );
  const planConceptIds = new Set(
    teachingPlan.segments.map((segment) => segment.conceptId),
  );

  for (const unresolvedAtuId of input.snapshot.unresolvedAtuIds ?? []) {
    if (!planAtuIds.has(unresolvedAtuId)) {
      throw new SessionHandoffSnapshotError(
        'Saved handoff snapshot references ATUs outside the current teaching plan',
      );
    }
  }

  for (const masteryEntry of input.snapshot.masterySnapshot ?? []) {
    if (!planConceptIds.has(masteryEntry.conceptId)) {
      throw new SessionHandoffSnapshotError(
        'Saved handoff snapshot references concept mastery outside the current teaching plan',
      );
    }
  }

  for (const historyEntry of input.snapshot.explanationHistory ?? []) {
    if (!planConceptIds.has(historyEntry.conceptId)) {
      throw new SessionHandoffSnapshotError(
        'Saved handoff snapshot references explanation history outside the current teaching plan',
      );
    }
  }

  return sessionHandoffSnapshotSchema.parse({
    currentSectionId,
    currentSegmentId,
    currentStep: input.snapshot.currentStep ?? input.fallbackStep,
    explanationHistory: input.snapshot.explanationHistory ?? [],
    masterySnapshot: input.snapshot.masterySnapshot ?? [],
    resumeNotes: input.snapshot.resumeNotes ?? null,
    unresolvedAtuIds: input.snapshot.unresolvedAtuIds ?? [],
  });
}

async function validateSnapshotAgainstTeachingPlan(
  prisma: SessionHandoffTransactionClient,
  input: {
    sessionId: string;
    snapshot: SessionHandoffSnapshotRecord;
    userId: string;
  },
) {
  return buildValidatedSnapshot(prisma, {
    documentId: '',
    fallbackSectionId: input.snapshot.currentSectionId,
    fallbackSegmentId: input.snapshot.currentSegmentId,
    fallbackStep: input.snapshot.currentStep,
    sessionId: input.sessionId,
    snapshot: input.snapshot,
    userId: input.userId,
  });
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toSessionHandoffSnapshotRecord(
  snapshot: SessionHandoffSnapshot,
): SessionHandoffSnapshotRecord {
  return sessionHandoffSnapshotRecordSchema.parse({
    createdAt: snapshot.createdAt.toISOString(),
    currentSectionId: snapshot.currentSectionId,
    currentSegmentId: snapshot.currentSegmentId,
    currentStep: snapshot.currentStep,
    explanationHistory: snapshot.explanationHistory,
    masterySnapshot: snapshot.masterySnapshot,
    resumeNotes: snapshot.resumeNotes,
    sessionId: snapshot.studySessionId,
    unresolvedAtuIds: snapshot.unresolvedAtuIds,
    updatedAt: snapshot.updatedAt.toISOString(),
  });
}
