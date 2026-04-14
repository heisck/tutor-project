import { CoverageStatus, type DatabaseClient } from '@ai-tutor-pwa/db';
import type {
  CheckQuestionType,
  ConceptMasteryRecord,
  LessonSegmentRecord,
  MasteryGate,
  ResponseEvaluation,
  SessionMasteryStatus,
} from '@ai-tutor-pwa/shared';

import { applyEvaluationToMastery, createInitialMastery } from './evaluation.js';

export class MasteryEnforcementError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'MasteryEnforcementError';
  }
}

export interface MasteryUpdateInput {
  conceptId: string;
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

  // Initialize from snapshot if available
  for (const item of masterySnapshot) {
    records.set(item.conceptId, {
      conceptId: item.conceptId,
      confusionScore: item.confusionScore,
      evidenceHistory: [],
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

/**
 * Apply an evaluation result to mastery state with full gate enforcement.
 * Returns the updated mastery record and any coverage status change needed.
 */
export function enforceMasteryTransition(
  currentMastery: ConceptMasteryRecord | null,
  input: MasteryUpdateInput,
): MasteryUpdateResult {
  const previousStatus = currentMastery?.status ?? 'not_taught';
  const { evaluation, updatedMastery } = applyEvaluationToMastery(
    {
      checkType: null,
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

  // If the state machine says mastered but the gate says no, clamp to checked
  const enforcedMastery: ConceptMasteryRecord = {
    ...updatedMastery,
    status:
      updatedMastery.status === 'mastered' && !gateResult.passed
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
    status: CoverageStatus;
    userId: string;
  },
): Promise<void> {
  if (input.atuIds.length === 0) return;

  await prisma.coverageLedger.updateMany({
    data: { status: input.status },
    where: {
      atuId: { in: [...input.atuIds] },
      documentId: input.documentId,
      userId: input.userId,
    },
  });
}

export interface MasteryGateResult {
  missingQuestionTypes: string[];
  passed: boolean;
  reason: string;
}

/**
 * Validate whether a concept's mastery record meets the gate requirements.
 * This is the no-fake-mastery enforcement.
 */
export function validateMasteryGate(
  mastery: ConceptMasteryRecord,
  gate: MasteryGate,
): MasteryGateResult {
  const reasons: string[] = [];

  // Check minimum evidence count
  if (mastery.evidenceHistory.length < gate.minimumChecks) {
    reasons.push(
      `Need ${gate.minimumChecks} checks, have ${mastery.evidenceHistory.length}`,
    );
  }

  // Check distinct question types
  if (gate.requiresDistinctQuestionTypes) {
    const usedTypes = new Set(mastery.evidenceHistory.map((e) => e.checkType));
    const missingTypes = gate.requiredQuestionTypes.filter(
      (type) => {
        const mapped = mapMasteryQuestionToCheckType(type);
        return mapped !== null && !usedTypes.has(mapped);
      },
    );

    if (missingTypes.length > 0) {
      reasons.push(`Missing question types: ${missingTypes.join(', ')}`);
    }
  }

  // Check confusion threshold
  if (mastery.confusionScore > gate.confusionThreshold) {
    reasons.push(
      `Confusion ${mastery.confusionScore.toFixed(2)} exceeds threshold ${gate.confusionThreshold}`,
    );
  }

  // Check for illusion of understanding flags in recent evidence
  const recentIllusion = mastery.evidenceHistory.some(
    (e) => e.isCorrect && e.confusionScore > gate.confusionThreshold,
  );
  if (recentIllusion) {
    reasons.push('Recent evidence shows potential illusion of understanding');
  }

  // All correct evidence must include at least one non-recall type
  const correctNonRecall = mastery.evidenceHistory.filter(
    (e) => e.isCorrect && e.checkType !== 'recall',
  );
  if (correctNonRecall.length === 0 && mastery.evidenceHistory.length > 0) {
    reasons.push('No correct evidence from non-recall question types');
  }

  const missingQuestionTypes = gate.requiresDistinctQuestionTypes
    ? gate.requiredQuestionTypes.filter((type) => {
        const mapped = mapMasteryQuestionToCheckType(type);
        const usedTypes = new Set(mastery.evidenceHistory.map((e) => e.checkType));
        return mapped !== null && !usedTypes.has(mapped);
      })
    : [];

  return {
    missingQuestionTypes,
    passed: reasons.length === 0,
    reason: reasons.length > 0 ? reasons.join('; ') : 'All gate conditions met',
  };
}

function mapMasteryQuestionToCheckType(masteryType: string): CheckQuestionType | null {
  switch (masteryType) {
    case 'explanation':
      return 'paraphrase';
    case 'application':
      return 'apply_to_new_case';
    case 'transfer':
      return 'transfer_to_new_domain';
    case 'error_spotting':
      return 'error_spotting';
    default:
      return null;
  }
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
