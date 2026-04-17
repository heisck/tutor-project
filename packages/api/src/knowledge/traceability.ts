import {
  CoverageResolutionStatus,
  type DatabaseClient,
} from '@ai-tutor-pwa/db';

export type LessonReadinessStatus = 'LESSON_READY' | 'NOT_LESSON_READY';

export interface TraceabilityChain {
  atuId: string;
  atuTitle: string;
  conceptId: string | null;
  hasChunks: boolean;
  hasLessonSegment: boolean;
  sourceUnitId: string;
}

export interface BrokenChain {
  atuId: string;
  atuTitle: string;
  reasons: string[];
}

export interface TraceabilityReport {
  brokenChains: BrokenChain[];
  lessonReadiness: LessonReadinessStatus;
  totalAtus: number;
  traceableAtus: number;
  userMessage: string | null;
}

type TraceabilityClient = Pick<
  DatabaseClient,
  'atomicTeachableUnit' | 'concept' | 'lessonSegment'
>;

/**
 * Validate the full traceability chain for a document:
 * sourceUnit → ATU → concept → lessonSegment
 *
 * Every ATU must resolve into a concept that has a lesson segment with
 * chunk coverage. Broken chains mean the document is NOT_LESSON_READY.
 */
export async function validateTraceability(
  prisma: TraceabilityClient,
  input: {
    documentId: string;
    sessionId?: string;
    userId: string;
  },
): Promise<TraceabilityReport> {
  const atus = await prisma.atomicTeachableUnit.findMany({
    select: {
      conceptId: true,
      id: true,
      sourceUnitId: true,
      title: true,
    },
    where: {
      documentId: input.documentId,
      userId: input.userId,
    },
  });

  if (atus.length === 0) {
    return {
      brokenChains: [],
      lessonReadiness: 'NOT_LESSON_READY',
      totalAtus: 0,
      traceableAtus: 0,
      userMessage:
        'This material is missing structured teaching coverage. We are fixing it.',
    };
  }

  const conceptIds = [
    ...new Set(atus.map((a) => a.conceptId).filter((id): id is string => id !== null)),
  ];

  const segmentWhere = input.sessionId
    ? { conceptId: { in: conceptIds }, studySessionId: input.sessionId, userId: input.userId }
    : { conceptId: { in: conceptIds }, userId: input.userId };

  const segments = await prisma.lessonSegment.findMany({
    select: {
      chunkIds: true,
      conceptId: true,
    },
    where: segmentWhere,
  });

  const segmentByConceptId = new Map(
    segments.map((s) => [s.conceptId, s]),
  );

  const brokenChains: BrokenChain[] = [];

  for (const atu of atus) {
    const reasons: string[] = [];

    if (atu.conceptId === null) {
      reasons.push('ATU is not mapped to any concept');
    } else {
      const segment = segmentByConceptId.get(atu.conceptId);
      if (segment === undefined) {
        reasons.push('Concept has no lesson segment');
      } else if (segment.chunkIds.length === 0) {
        reasons.push('Lesson segment has no retrieval chunks');
      }
    }

    if (reasons.length > 0) {
      brokenChains.push({
        atuId: atu.id,
        atuTitle: atu.title,
        reasons,
      });
    }
  }

  const traceableAtus = atus.length - brokenChains.length;
  const lessonReadiness: LessonReadinessStatus =
    brokenChains.length === 0 ? 'LESSON_READY' : 'NOT_LESSON_READY';

  return {
    brokenChains,
    lessonReadiness,
    totalAtus: atus.length,
    traceableAtus,
    userMessage:
      lessonReadiness === 'NOT_LESSON_READY'
        ? 'This material is missing structured teaching coverage. We are fixing it.'
        : null,
  };
}

/**
 * Check whether all ATUs linked to a set of concept IDs are resolved
 * in the coverage ledger. Used by the mastery gate to block mastery
 * when linked ATUs are still unresolved.
 */
export async function checkAtuResolution(
  prisma: Pick<DatabaseClient, 'coverageLedger'>,
  input: {
    atuIds: readonly string[];
    documentId: string;
    userId: string;
  },
): Promise<{ allResolved: boolean; unresolvedCount: number }> {
  if (input.atuIds.length === 0) {
    return { allResolved: true, unresolvedCount: 0 };
  }

  const unresolvedCount = await prisma.coverageLedger.count({
    where: {
      atuId: { in: [...input.atuIds] },
      documentId: input.documentId,
      resolutionStatus: CoverageResolutionStatus.UNRESOLVED,
      userId: input.userId,
    },
  });

  return {
    allResolved: unresolvedCount === 0,
    unresolvedCount,
  };
}
