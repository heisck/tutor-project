import { CoverageStatus, type DatabaseClient } from '@ai-tutor-pwa/db';
import type {
  LessonSegmentCoverageSummary,
  SessionHandoffSnapshotRecord,
  StudySessionContinuityState,
  StudySessionStateResponse,
  StudySessionSummary,
} from '@ai-tutor-pwa/shared';

import { getOwnedSessionHandoffSnapshot } from './handoff.js';
import { getTeachingPlanForOwnedSession } from './planner.js';
import { toStudySessionLifecycleResponse, type StudySessionModel } from './service.js';
import {
  auditSessionCoverage,
  buildSessionEndSummary,
  shouldBlockCompletion,
} from '../tutor/coverage-audit.js';
import { loadMasteryRecordsFromState } from '../tutor/mastery.js';

export class StudySessionStateProjectionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'StudySessionStateProjectionError';
  }
}

export async function getOwnedStudySessionState(
  prisma: Pick<
    DatabaseClient,
    'coverageLedger' | 'lessonSegment' | 'sessionHandoffSnapshot' | 'studySession'
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
  const summary = await buildStudySessionSummary(prisma, {
    documentId: session.document.id,
    handoffSnapshot,
    teachingPlan,
    userId: input.userId,
  });
  const continuity = buildStudySessionContinuityState(
    lifecycle.session,
    teachingPlan,
    handoffSnapshot,
  );

  return {
    continuity,
    handoffSnapshot,
    learningProfile: lifecycle.learningProfile,
    session: lifecycle.session,
    summary,
    teachingPlan,
  };
}

async function buildStudySessionSummary(
  prisma: Pick<DatabaseClient, 'coverageLedger'>,
  input: {
    documentId: string;
    handoffSnapshot: SessionHandoffSnapshotRecord | null;
    teachingPlan: NonNullable<StudySessionStateResponse['teachingPlan']>;
    userId: string;
  },
): Promise<StudySessionSummary> {
  const uniqueAtuIds = [...new Set(input.teachingPlan.segments.flatMap((segment) => segment.atuIds))];
  const coverageEntries =
    uniqueAtuIds.length === 0
      ? []
      : await prisma.coverageLedger.findMany({
          select: {
            atuId: true,
            status: true,
          },
          where: {
            atuId: {
              in: uniqueAtuIds,
            },
            documentId: input.documentId,
            userId: input.userId,
          },
        });
  const coverageByAtuId = new Map(
    coverageEntries.map((entry) => [entry.atuId, entry.status]),
  );
  const coverageSummary = toCoverageSummary(uniqueAtuIds, coverageByAtuId);
  const unresolvedAtuIds = uniqueAtuIds.filter(
    (atuId) => coverageByAtuId.get(atuId) !== CoverageStatus.ASSESSED,
  );
  const masteryRecords = loadMasteryRecordsFromState(
    input.teachingPlan.segments,
    input.handoffSnapshot?.masterySnapshot ?? [],
  );
  const coverageAudit = auditSessionCoverage(
    input.teachingPlan.segments,
    masteryRecords,
  );
  const sessionEndSummary = buildSessionEndSummary(
    coverageAudit,
    input.teachingPlan.segments,
    masteryRecords,
  );
  const completionStatus = shouldBlockCompletion(coverageAudit);

  return {
    canComplete: !completionStatus.blocked,
    completionBlockedReason: completionStatus.reason,
    coverageSummary,
    masteredTopics: sessionEndSummary.masteredTopics,
    readinessEstimate: sessionEndSummary.readinessEstimate,
    shakyTopics: sessionEndSummary.shakyTopics,
    unresolvedAtuIds,
    unresolvedTopics: sessionEndSummary.unresolvedTopics,
  };
}

function buildStudySessionContinuityState(
  session: StudySessionStateResponse['session'],
  teachingPlan: StudySessionStateResponse['teachingPlan'],
  handoffSnapshot: SessionHandoffSnapshotRecord | null,
): StudySessionContinuityState {
  const resumeSegmentId =
    handoffSnapshot?.currentSegmentId ??
    session.currentSegmentId ??
    teachingPlan.currentSegmentId;
  const resumeSegment =
    resumeSegmentId === null
      ? null
      : teachingPlan.segments.find((segment) => segment.id === resumeSegmentId) ??
        null;

  return {
    hasInterruptedState: handoffSnapshot !== null,
    interruptedAt: handoffSnapshot?.updatedAt ?? null,
    isResumable: session.status === 'paused' && handoffSnapshot !== null,
    masterySnapshot: handoffSnapshot?.masterySnapshot ?? [],
    resumeNotes: handoffSnapshot?.resumeNotes ?? null,
    resumeSectionId:
      handoffSnapshot?.currentSectionId ??
      resumeSegment?.sectionId ??
      session.currentSectionId,
    resumeSegmentId: resumeSegment?.id ?? null,
    resumeSegmentTitle: resumeSegment?.conceptTitle ?? null,
    resumeStep: handoffSnapshot?.currentStep ?? session.currentStep,
    unresolvedAtuIds: handoffSnapshot?.unresolvedAtuIds ?? [],
  };
}

function toCoverageSummary(
  uniqueAtuIds: readonly string[],
  coverageByAtuId: ReadonlyMap<string, CoverageStatus>,
): LessonSegmentCoverageSummary {
  let assessed = 0;
  let inProgress = 0;
  let notTaught = 0;
  let taught = 0;

  for (const atuId of uniqueAtuIds) {
    const status = coverageByAtuId.get(atuId) ?? CoverageStatus.NOT_TAUGHT;

    switch (status) {
      case CoverageStatus.ASSESSED:
        assessed += 1;
        break;
      case CoverageStatus.IN_PROGRESS:
        inProgress += 1;
        break;
      case CoverageStatus.TAUGHT:
        taught += 1;
        break;
      case CoverageStatus.NOT_TAUGHT:
        notTaught += 1;
        break;
    }
  }

  return {
    assessed,
    inProgress,
    notTaught,
    taught,
  };
}
