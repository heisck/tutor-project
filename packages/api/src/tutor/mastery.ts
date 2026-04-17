import {
  CoverageResolutionStatus,
  CoverageStatus,
  type DatabaseClient,
} from '@ai-tutor-pwa/db';
import type {
  CheckQuestionType,
  ConceptMasteryRecord,
  LessonSegmentRecord,
  MasteryGate,
  ResponseEvaluation,
  SessionMasteryStatus,
} from '@ai-tutor-pwa/shared';

import { applyEvaluationToMastery, createInitialMastery } from './evaluation.js';
import { mapMasteryQuestionTypeToCheckType } from './check-types.js';
import { applyDegradedEvaluationGuard } from '../lib/provider-integrity.js';

export class MasteryEnforcementError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'MasteryEnforcementError';
  }
}

export interface MasteryUpdateInput {
  checkType: CheckQuestionType;
  conceptId: string;
  degradedReason?: string | null;
  evaluation: ResponseEvaluation;
  segment: LessonSegmentRecord;
}

export interface MasteryUpdateResult {
  coverageStatusUpdate: CoverageStatus | null;
  masteryRecord: ConceptMasteryRecord;
  previousStatus: SessionMasteryStatus;
}

/**
 * Load all mastery records for a session's concepts from the handoff snapshot
 * or initialize them from the teaching plan.
 */
export function loadMasteryRecordsFromState(
  segments: readonly LessonSegmentRecord[],
  masterySnapshot: readonly { conceptId: string; confusionScore: number; evidenceCount: number; status: SessionMasteryStatus }[],
): Map<string, ConceptMasteryRecord> {
  const records = new Map<string, ConceptMasteryRecord>();
  const segmentsByConceptId = new Map(
    segments.map((segment) => [segment.conceptId, segment]),
  );

  // Initialize from snapshot if available
  for (const item of masterySnapshot) {
    const segment = segmentsByConceptId.get(item.conceptId);

    records.set(item.conceptId, {
      conceptId: item.conceptId,
      confusionScore: item.confusionScore,
      evidenceHistory: buildEvidenceHistoryFromSnapshot(item, segment),
      explanationTypes: [],
      status: item.status,
    });
  }

  // Ensure every segment has a mastery record
  for (const segment of segments) {
    if (!records.has(segment.conceptId)) {
      records.set(segment.conceptId, createInitialMastery(segment.conceptId));
    }
  }

  return records;
}

function buildEvidenceHistoryFromSnapshot(
  item: {
    conceptId: string;
    confusionScore: number;
    evidenceCount: number;
    status: SessionMasteryStatus;
  },
  segment: LessonSegmentRecord | undefined,
): ConceptMasteryRecord['evidenceHistory'] {
  if (item.evidenceCount <= 0) {
    return [];
  }

  const inferredCheckTypes =
    segment?.masteryGate.requiredQuestionTypes
      .map((type) => mapMasteryQuestionTypeToCheckType(type))
      .filter((type): type is CheckQuestionType => type !== null) ?? [];
  const isCorrect = item.status === 'checked' || item.status === 'mastered';

  return Array.from({ length: item.evidenceCount }, (_, index) => {
    const checkType =
      inferredCheckTypes[index] ??
      inferredCheckTypes[inferredCheckTypes.length - 1] ??
      'paraphrase';

    return {
      checkType,
      conceptId: item.conceptId,
      confusionScore: item.confusionScore,
      evaluatedAt: new Date(index * 1_000).toISOString(),
      isCorrect,
      questionType: checkType,
    };
  });
}

/**
 * Apply an evaluation result to mastery state with full gate enforcement.
 * Returns the updated mastery record and any coverage status change needed.
 */
export function enforceMasteryTransition(
  currentMastery: ConceptMasteryRecord | null,
  input: MasteryUpdateInput,
): MasteryUpdateResult {
  const previousStatus = currentMastery?.status ?? 'not_taught';
  const { updatedMastery } = applyEvaluationToMastery(
    {
      checkType: input.checkType,
      conceptId: input.conceptId,
      learnerResponse: '',
      mastery: currentMastery,
    },
    input.evaluation,
  );

  // Enforce no-fake-mastery gate
  const gateResult = validateMasteryGate(
    updatedMastery,
    input.segment.masteryGate,
  );

  // Degraded evaluation guard: degraded evaluations cannot silently award mastery
  const degradedGuard = applyDegradedEvaluationGuard(input.degradedReason ?? null);

  // If the state machine says mastered but the gate says no, clamp to checked.
  // Also clamp if the evaluation was degraded (heuristic fallback cannot award mastery).
  const enforcedMastery: ConceptMasteryRecord = {
    ...updatedMastery,
    status:
      updatedMastery.status === 'mastered' && (!gateResult.passed || !degradedGuard.allowMastery)
        ? 'checked'
        : updatedMastery.status,
  };

  const coverageStatusUpdate = mapMasteryToCoverageStatus(
    enforcedMastery.status,
    previousStatus,
  );

  return {
    coverageStatusUpdate,
    masteryRecord: enforcedMastery,
    previousStatus,
  };
}

/**
 * Persist a mastery-driven coverage status update to the database.
 */
export async function persistCoverageStatusUpdate(
  prisma: Pick<DatabaseClient, 'coverageLedger'>,
  input: {
    atuIds: readonly string[];
    documentId: string;
    now?: Date;
    status: CoverageStatus;
    userId: string;
  },
): Promise<void> {
  if (input.atuIds.length === 0) return;

  const now = input.now ?? new Date();
  const coverageUpdate = buildCoverageLedgerUpdate(input.status, now);

  await prisma.coverageLedger.updateMany({
    data: coverageUpdate,
    where: {
      atuId: { in: [...input.atuIds] },
      documentId: input.documentId,
      userId: input.userId,
    },
  });
}

export interface MasteryGateResult {
  illusionBlocked: boolean;
  missingQuestionTypes: string[];
  passed: boolean;
  reason: string;
}

/**
 * Validate whether a concept's mastery record meets the gate requirements.
 * This is the no-fake-mastery enforcement.
 *
 * Hard mastery rules:
 * - evidence_count >= minimumChecks (default 2)
 * - evidence_types must include required question types
 *   (e.g. explanation OR application, AND transfer OR error_spotting)
 * - confusion_score < confusionThreshold
 * - illusion_flag = false — blocks mastery even when answers look correct
 * - All correct evidence must include at least one non-recall type
 *
 * Note: ATU resolution is checked separately via checkAtuResolution()
 * since it requires a database call. Use validateMasteryGateWithAtuResolution()
 * for the complete gate check.
 */
export function validateMasteryGate(
  mastery: ConceptMasteryRecord,
  gate: MasteryGate,
  options?: { atuResolution?: { allResolved: boolean; unresolvedCount: number } },
): MasteryGateResult {
  const reasons: string[] = [];
  let illusionBlocked = false;

  // Hard rule: minimum evidence count >= 2
  const correctEvidence = mastery.evidenceHistory.filter((e) => e.isCorrect);
  if (correctEvidence.length < gate.minimumChecks) {
    reasons.push(
      `Need ${gate.minimumChecks} correct checks, have ${correctEvidence.length}`,
    );
  }

  // Hard rule: required evidence types must be present
  if (gate.requiresDistinctQuestionTypes) {
    const usedTypes = new Set(correctEvidence.map((e) => e.checkType));
    const missingTypes = gate.requiredQuestionTypes.filter(
      (type) => {
        const mapped = mapMasteryQuestionTypeToCheckType(type);
        return mapped !== null && !usedTypes.has(mapped);
      },
    );

    if (missingTypes.length > 0) {
      reasons.push(`Missing question types: ${missingTypes.join(', ')}`);
    }
  }

  // Hard rule: confusion_score < threshold
  if (mastery.confusionScore > gate.confusionThreshold) {
    reasons.push(
      `Confusion ${mastery.confusionScore.toFixed(2)} exceeds threshold ${gate.confusionThreshold}`,
    );
  }

  // Hard rule: illusion_flag = false blocks mastery unconditionally
  // Check both: any evidence item with high confusion despite correct answer,
  // and any evidence item that was scored with isCorrect but had high confusion
  const hasIllusion = mastery.evidenceHistory.some(
    (e) => e.isCorrect && e.confusionScore > gate.confusionThreshold,
  );
  if (hasIllusion) {
    illusionBlocked = true;
    reasons.push(
      'Illusion of understanding detected: correct answers with high confusion scores block mastery',
    );
  }

  // Hard rule: all correct evidence must include at least one non-recall type
  const correctNonRecall = correctEvidence.filter(
    (e) => e.checkType !== 'recall',
  );
  if (correctNonRecall.length === 0 && mastery.evidenceHistory.length > 0) {
    reasons.push('No correct evidence from non-recall question types');
  }

  // Hard rule: all linked ATUs must be resolved (when provided)
  if (options?.atuResolution && !options.atuResolution.allResolved) {
    reasons.push(
      `${options.atuResolution.unresolvedCount} linked ATU(s) still unresolved`,
    );
  }

  const missingQuestionTypes = gate.requiresDistinctQuestionTypes
    ? gate.requiredQuestionTypes.filter((type) => {
        const mapped = mapMasteryQuestionTypeToCheckType(type);
        const usedTypes = new Set(correctEvidence.map((e) => e.checkType));
        return mapped !== null && !usedTypes.has(mapped);
      })
    : [];

  return {
    illusionBlocked,
    missingQuestionTypes,
    passed: reasons.length === 0,
    reason: reasons.length > 0 ? reasons.join('; ') : 'All gate conditions met',
  };
}

export async function updateConceptReviewState(
  prisma: Pick<DatabaseClient, 'conceptReviewState'>,
  input: {
    conceptId: string;
    documentId: string;
    evaluation: ResponseEvaluation;
    masteryStatus: SessionMasteryStatus;
    now?: Date;
    userId: string;
  },
): Promise<void> {
  const now = input.now ?? new Date();
  const existingState = await prisma.conceptReviewState.findUnique({
    where: {
      userId_conceptId: {
        conceptId: input.conceptId,
        userId: input.userId,
      },
    },
  });

  const previousReviewCount = existingState?.reviewCount ?? 0;
  const previousStability = existingState?.stabilityScore ?? 0.3;
  const previousDifficulty = existingState?.difficultyScore ?? 0.5;
  const lapseIncrement =
    input.masteryStatus === 'weak' || input.masteryStatus === 'partial' ? 1 : 0;
  const nextReviewCount = previousReviewCount + 1;
  const nextStability = clamp(
    input.masteryStatus === 'mastered'
      ? previousStability + 0.15
      : previousStability - 0.1,
    0.1,
    1,
  );
  const nextDifficulty = clamp(
    (previousDifficulty + input.evaluation.confusionScore) / 2,
    0,
    1,
  );

  await prisma.conceptReviewState.upsert({
    create: {
      conceptId: input.conceptId,
      difficultyScore: nextDifficulty,
      documentId: input.documentId,
      lapseCount: lapseIncrement,
      lastReviewedAt: now,
      nextReviewAt: computeNextReviewAt(now, nextStability, nextReviewCount, input.masteryStatus),
      reviewCount: nextReviewCount,
      stabilityScore: nextStability,
      userId: input.userId,
    },
    update: {
      difficultyScore: nextDifficulty,
      lapseCount: (existingState?.lapseCount ?? 0) + lapseIncrement,
      lastReviewedAt: now,
      nextReviewAt: computeNextReviewAt(now, nextStability, nextReviewCount, input.masteryStatus),
      reviewCount: nextReviewCount,
      stabilityScore: nextStability,
    },
    where: {
      userId_conceptId: {
        conceptId: input.conceptId,
        userId: input.userId,
      },
    },
  });
}

function mapMasteryToCoverageStatus(
  masteryStatus: SessionMasteryStatus,
  previousStatus: SessionMasteryStatus,
): CoverageStatus | null {
  // Only update coverage when status actually changes
  if (masteryStatus === previousStatus) return null;

  switch (masteryStatus) {
    case 'not_taught':
      return CoverageStatus.NOT_TAUGHT;
    case 'taught':
      return CoverageStatus.TAUGHT;
    case 'checked':
    case 'partial':
    case 'weak':
      return CoverageStatus.IN_PROGRESS;
    case 'mastered':
      return CoverageStatus.ASSESSED;
    default:
      return null;
  }
}

function buildCoverageLedgerUpdate(status: CoverageStatus, now: Date) {
  switch (status) {
    case CoverageStatus.NOT_TAUGHT:
      return {
        checkedAt: null,
        resolutionStatus: CoverageResolutionStatus.UNRESOLVED,
        status,
        taughtAt: null,
      };
    case CoverageStatus.TAUGHT:
      return {
        resolutionStatus: CoverageResolutionStatus.UNRESOLVED,
        status,
        taughtAt: now,
      };
    case CoverageStatus.IN_PROGRESS:
      return {
        checkedAt: now,
        resolutionStatus: CoverageResolutionStatus.UNRESOLVED,
        status,
        taughtAt: now,
      };
    case CoverageStatus.ASSESSED:
      return {
        checkedAt: now,
        resolutionStatus: CoverageResolutionStatus.RESOLVED,
        status,
        taughtAt: now,
      };
  }
}

function computeNextReviewAt(
  now: Date,
  stabilityScore: number,
  reviewCount: number,
  masteryStatus: SessionMasteryStatus,
): Date {
  const baseDays =
    masteryStatus === 'mastered'
      ? Math.max(1, Math.round(stabilityScore * Math.max(reviewCount, 1) * 4))
      : 1;

  return new Date(now.getTime() + baseDays * 24 * 60 * 60 * 1000);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
