import {
  CoverageResolutionStatus,
  CoverageStatus,
  type DatabaseClient,
} from '@ai-tutor-pwa/db';
import type {
  AtuAuditSummary,
  LessonSegmentCoverageSummary,
  SessionHandoffSnapshotRecord,
  StudySessionContinuityState,
  StudySessionModeContext,
  StudySessionStateResponse,
  StudySessionSummary,
} from '@ai-tutor-pwa/shared';
import { voiceSessionStateSchema } from '@ai-tutor-pwa/shared';

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
  const { atuAuditSummary, summary } = await buildStudySessionSummary(prisma, {
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
    atuAuditSummary,
    continuity,
    handoffSnapshot,
    learningProfile: lifecycle.learningProfile,
    modeContext: buildStudySessionModeContext(
      lifecycle.session,
      teachingPlan,
      handoffSnapshot,
    ),
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
): Promise<{ atuAuditSummary: AtuAuditSummary; summary: StudySessionSummary }> {
  const uniqueAtuIds = [...new Set(input.teachingPlan.segments.flatMap((segment) => segment.atuIds))];
  const coverageEntries =
    uniqueAtuIds.length === 0
      ? []
      : await prisma.coverageLedger.findMany({
          select: {
            checkedAt: true,
            resolutionStatus: true,
            status: true,
            taughtAt: true,
            atuId: true,
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
  const atuAuditSummary = toAtuAuditSummary(uniqueAtuIds, coverageEntries);
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
    atuAuditSummary,
    summary: {
      canComplete: !completionStatus.blocked,
      completionBlockedReason: completionStatus.reason,
      coverageSummary,
      masteredTopics: sessionEndSummary.masteredTopics,
      readinessEstimate: sessionEndSummary.readinessEstimate,
      shakyTopics: sessionEndSummary.shakyTopics,
      unresolvedAtuIds,
      unresolvedTopics: sessionEndSummary.unresolvedTopics,
    },
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
    unresolvedAtuIds: handoffSnapshot?.unresolvedAtuIds ?? teachingPlan.segments.flatMap((segment) => segment.atuIds),
  };
}

function buildStudySessionModeContext(
  session: StudySessionStateResponse['session'],
  teachingPlan: StudySessionStateResponse['teachingPlan'],
  handoffSnapshot: SessionHandoffSnapshotRecord | null,
): StudySessionModeContext {
  const currentSegmentId =
    handoffSnapshot?.currentSegmentId ??
    session.currentSegmentId ??
    teachingPlan.currentSegmentId ??
    teachingPlan.segments[0]?.id ??
    null;
  const queueCursor =
    handoffSnapshot?.turnState.modeQueueCursor ??
    Math.max(
      teachingPlan.segments.findIndex((segment) => segment.id === currentSegmentId),
      0,
    );
  const currentSegment =
    currentSegmentId === null
      ? null
      : teachingPlan.segments.find((segment) => segment.id === currentSegmentId) ?? null;
  const queuePreview = teachingPlan.segments
    .slice(queueCursor, queueCursor + 3)
    .map((segment) => ({
      conceptId: segment.conceptId,
      conceptTitle: segment.conceptTitle,
      segmentId: segment.id,
      selectionReason: segment.selectionReason,
    }));

  return {
    activeMode: session.mode,
    checkTypeBias: currentSegment?.checkTypeBias ?? [],
    currentSelectionReason:
      currentSegment?.selectionReason ??
      teachingPlan.segments[0]?.selectionReason ??
      'prerequisite_order',
    degradedReason: deriveDegradedReason(session.mode, teachingPlan),
    queueCursor,
    queuePreview,
    queueSize: teachingPlan.segments.length,
    reviewPriority: currentSegment?.reviewPriority ?? null,
    voiceState:
      handoffSnapshot?.voiceState ??
      (session.mode === 'voice' ? voiceSessionStateSchema.parse({}) : null),
  };
}

function deriveDegradedReason(
  mode: StudySessionStateResponse['session']['mode'],
  teachingPlan: StudySessionStateResponse['teachingPlan'],
): string | null {
  if (mode === 'revision' && teachingPlan.segments.every((segment) => segment.reviewPriority === null)) {
    return 'No persisted review history yet; using document order for this revision session.';
  }

  if (mode === 'exam' && teachingPlan.segments.every((segment) => segment.reviewPriority === null)) {
    return 'Course exam date or review history was unavailable, so exam prioritization is based on concept structure only.';
  }

  return null;
}

function toAtuAuditSummary(
  uniqueAtuIds: readonly string[],
  coverageEntries: ReadonlyArray<{
    atuId: string;
    checkedAt: Date | null;
    resolutionStatus: CoverageResolutionStatus;
    status: CoverageStatus;
    taughtAt: Date | null;
  }>,
): AtuAuditSummary {
  const coverageEntryByAtuId = new Map(
    coverageEntries.map((entry) => [entry.atuId, entry]),
  );
  let checkedCount = 0;
  let resolvedCount = 0;
  let taughtCount = 0;

  for (const atuId of uniqueAtuIds) {
    const entry = coverageEntryByAtuId.get(atuId);

    if (entry?.taughtAt !== null || entry?.status === CoverageStatus.TAUGHT || entry?.status === CoverageStatus.IN_PROGRESS || entry?.status === CoverageStatus.ASSESSED) {
      taughtCount += 1;
    }

    if (entry?.checkedAt !== null || entry?.status === CoverageStatus.IN_PROGRESS || entry?.status === CoverageStatus.ASSESSED) {
      checkedCount += 1;
    }

    if (entry?.resolutionStatus === CoverageResolutionStatus.RESOLVED) {
      resolvedCount += 1;
    }
  }

  return {
    checkedCount,
    resolvedCount,
    taughtCount,
    totalCount: uniqueAtuIds.length,
    unresolvedCount: uniqueAtuIds.length - resolvedCount,
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
