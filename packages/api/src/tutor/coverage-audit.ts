import type {
  CompressedLearningState,
  ConceptMasteryRecord,
  CoverageAuditResult,
  LessonSegmentRecord,
  SessionMasteryStatus,
} from '@ai-tutor-pwa/shared';

export class CoverageAuditError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'CoverageAuditError';
  }
}

const MEMORY_COMPRESSION_INTERVAL = 5;

/**
 * Run a coverage audit against the session's teaching plan.
 * Checks that all required concepts meet mastery thresholds before
 * allowing session completion.
 */
export function auditSessionCoverage(
  segments: readonly LessonSegmentRecord[],
  masteryRecords: ReadonlyMap<string, ConceptMasteryRecord>,
): CoverageAuditResult {
  const uniqueAtuIds = [...new Set(segments.flatMap((segment) => segment.atuIds))];
  let masteredCount = 0;
  let checkedCount = 0;
  let partialCount = 0;
  let resolvedAtuCount = 0;
  let taughtCount = 0;
  let weakCount = 0;
  const unresolvedConceptIds: string[] = [];
  const unresolvedAtuIds = new Set<string>();

  for (const segment of segments) {
    const mastery = masteryRecords.get(segment.conceptId);
    const status: SessionMasteryStatus = mastery?.status ?? 'not_taught';

    switch (status) {
      case 'mastered':
        masteredCount += 1;
        resolvedAtuCount += segment.atuIds.length;
        break;
      case 'checked':
        checkedCount += 1;
        segment.atuIds.forEach((atuId) => unresolvedAtuIds.add(atuId));
        unresolvedConceptIds.push(segment.conceptId);
        break;
      case 'partial':
        partialCount += 1;
        segment.atuIds.forEach((atuId) => unresolvedAtuIds.add(atuId));
        unresolvedConceptIds.push(segment.conceptId);
        break;
      case 'taught':
        taughtCount += 1;
        segment.atuIds.forEach((atuId) => unresolvedAtuIds.add(atuId));
        unresolvedConceptIds.push(segment.conceptId);
        break;
      case 'weak':
        weakCount += 1;
        segment.atuIds.forEach((atuId) => unresolvedAtuIds.add(atuId));
        unresolvedConceptIds.push(segment.conceptId);
        break;
      case 'not_taught':
        segment.atuIds.forEach((atuId) => unresolvedAtuIds.add(atuId));
        unresolvedConceptIds.push(segment.conceptId);
        break;
    }
  }

  const totalConcepts = segments.length;
  const canComplete = unresolvedConceptIds.length === 0 && totalConcepts > 0;

  return {
    canComplete,
    checkedCount,
    masteredCount,
    partialCount,
    resolvedAtuCount,
    taughtCount,
    totalConcepts,
    totalAtus: uniqueAtuIds.length,
    unresolvedConceptIds,
    unresolvedAtuIds: [...unresolvedAtuIds],
    weakCount,
  };
}

/**
 * Check if session completion should be blocked.
 * Sessions cannot complete while unresolved ATUs remain.
 */
export function shouldBlockCompletion(
  auditResult: CoverageAuditResult,
): { blocked: boolean; reason: string } {
  if (auditResult.totalConcepts === 0) {
    return {
      blocked: true,
      reason: 'No concepts in the teaching plan',
    };
  }

  if (auditResult.canComplete) {
    return {
      blocked: false,
      reason: `All ${auditResult.totalConcepts} concepts mastered`,
    };
  }

  const unresolved = auditResult.unresolvedConceptIds.length;
  return {
    blocked: true,
    reason: `${unresolved} concept(s) still unresolved: ${auditResult.masteredCount} mastered, ${auditResult.partialCount} partial, ${auditResult.taughtCount} taught, ${auditResult.weakCount} weak`,
  };
}

/**
 * Build cross-concept link prompts for connecting current learning
 * to previously mastered concepts.
 */
export function buildCrossConceptLinks(
  currentSegment: LessonSegmentRecord,
  masteryRecords: ReadonlyMap<string, ConceptMasteryRecord>,
  allSegments: readonly LessonSegmentRecord[],
): string[] {
  const links: string[] = [];

  // Link to prerequisite concepts that are mastered
  for (const prereqId of currentSegment.prerequisiteConceptIds) {
    const prereqMastery = masteryRecords.get(prereqId);
    if (
      prereqMastery !== undefined &&
      (prereqMastery.status === 'mastered' || prereqMastery.status === 'checked')
    ) {
      const prereqSegment = allSegments.find((s) => s.conceptId === prereqId);
      if (prereqSegment !== undefined) {
        links.push(
          `Connect "${currentSegment.conceptTitle}" back to the previously learned "${prereqSegment.conceptTitle}"`,
        );
      }
    }
  }

  // Link to recently mastered concepts (within last 3 segments)
  const currentOrdinal = currentSegment.ordinal;
  const recentSegments = allSegments
    .filter(
      (s) =>
        s.ordinal < currentOrdinal &&
        s.ordinal >= currentOrdinal - 3 &&
        !currentSegment.prerequisiteConceptIds.includes(s.conceptId),
    );

  for (const recentSegment of recentSegments) {
    const recentMastery = masteryRecords.get(recentSegment.conceptId);
    if (recentMastery?.status === 'mastered') {
      links.push(
        `Reinforce the connection between "${currentSegment.conceptTitle}" and recently mastered "${recentSegment.conceptTitle}"`,
      );
    }
  }

  return links;
}

/**
 * Determine if memory compression should run based on concept count.
 * Runs after every MEMORY_COMPRESSION_INTERVAL concepts.
 */
export function shouldCompressMemory(
  completedConceptCount: number,
): boolean {
  return (
    completedConceptCount > 0 &&
    completedConceptCount % MEMORY_COMPRESSION_INTERVAL === 0
  );
}

/**
 * Build a compressed learning state from the session's mastery records.
 * This creates a bounded summary that replaces detailed history
 * in subsequent prompts to prevent unbounded prompt growth.
 */
export function compressLearningState(
  segments: readonly LessonSegmentRecord[],
  masteryRecords: ReadonlyMap<string, ConceptMasteryRecord>,
): CompressedLearningState {
  const masteredConcepts: string[] = [];
  const weakConcepts: string[] = [];

  for (const segment of segments) {
    const mastery = masteryRecords.get(segment.conceptId);
    if (mastery === undefined) continue;

    if (mastery.status === 'mastered' || mastery.status === 'checked') {
      masteredConcepts.push(segment.conceptTitle);
    } else if (mastery.status === 'weak' || mastery.status === 'partial') {
      weakConcepts.push(segment.conceptTitle);
    }
  }

  const summaryParts: string[] = [];
  if (masteredConcepts.length > 0) {
    summaryParts.push(`Mastered: ${masteredConcepts.join(', ')}`);
  }
  if (weakConcepts.length > 0) {
    summaryParts.push(`Needs review: ${weakConcepts.join(', ')}`);
  }

  return {
    compressedAt: new Date().toISOString(),
    conceptCount: segments.length,
    masteredConcepts,
    summary: summaryParts.join('. ') || 'No concepts completed yet',
    weakConcepts,
  };
}

/**
 * Build a session end summary for the learner.
 */
export function buildSessionEndSummary(
  auditResult: CoverageAuditResult,
  segments: readonly LessonSegmentRecord[],
  masteryRecords: ReadonlyMap<string, ConceptMasteryRecord>,
): {
  masteredTopics: string[];
  readinessEstimate: string;
  shakyTopics: string[];
  unresolvedTopics: string[];
} {
  const masteredTopics: string[] = [];
  const shakyTopics: string[] = [];
  const unresolvedTopics: string[] = [];

  for (const segment of segments) {
    const mastery = masteryRecords.get(segment.conceptId);
    const status = mastery?.status ?? 'not_taught';

    if (status === 'mastered') {
      masteredTopics.push(segment.conceptTitle);
    } else if (status === 'weak' || status === 'partial') {
      shakyTopics.push(segment.conceptTitle);
    } else if (status === 'not_taught') {
      unresolvedTopics.push(segment.conceptTitle);
    }
  }

  const masteredRatio =
    auditResult.totalConcepts > 0
      ? auditResult.masteredCount / auditResult.totalConcepts
      : 0;

  let readinessEstimate: string;
  if (masteredRatio >= 0.9) {
    readinessEstimate = 'Strong understanding — ready for assessment';
  } else if (masteredRatio >= 0.7) {
    readinessEstimate = 'Good progress — review shaky areas before assessment';
  } else if (masteredRatio >= 0.5) {
    readinessEstimate = 'Moderate progress — more study recommended';
  } else {
    readinessEstimate = 'Early stages — continue studying for stronger foundations';
  }

  return {
    masteredTopics,
    readinessEstimate,
    shakyTopics,
    unresolvedTopics,
  };
}
