import type {
  ConceptMasteryRecord,
  ExplanationAttempt,
  SessionExplanationType,
  TutorAction,
} from '@ai-tutor-pwa/shared';

const EXPLANATION_TYPE_ORDER: readonly SessionExplanationType[] = [
  'analogy',
  'concrete_example',
  'worked_example',
  'step_by_step',
  'visual_word_picture',
  'contrast',
  'common_mistake',
  'formal_definition',
];

const FAILURE_RECOVERY_LADDER: readonly TutorAction[] = [
  'reteach',     // 1. clearer explanation
  'reteach',     // 2. different type (diversity engine picks a new type)
  'simpler',     // 3. prerequisite / simpler breakdown
  'simpler',     // 4. concrete example at simpler level
  'reteach',     // 5. contrast with what student does know
  'simpler',     // 6. shrink the task
  'skip',        // 7. diagnose and move on
];

const MAX_CONSECUTIVE_FAILURES = 3;
const COGNITIVE_LOAD_COOLDOWN_CHECKS = 2;

export interface ExplanationDiversityState {
  attempts: readonly ExplanationAttempt[];
  consecutiveFailures: number;
  lastCheckCount: number;
}

/**
 * Select the next explanation type that hasn't been tried for this concept,
 * or hasn't failed previously.
 */
export function selectNextExplanationType(
  mastery: ConceptMasteryRecord | null,
  previousAttempts: readonly ExplanationAttempt[],
  conceptId: string,
): SessionExplanationType {
  const conceptAttempts = previousAttempts.filter(
    (a) => a.conceptId === conceptId,
  );

  // Types that failed for this concept — avoid them
  const failedTypes = new Set(
    conceptAttempts
      .filter((a) => a.outcome === 'failed')
      .map((a) => a.explanationType),
  );

  // Types already used for this concept
  const usedTypes = new Set(conceptAttempts.map((a) => a.explanationType));

  // First preference: unused types
  for (const type of EXPLANATION_TYPE_ORDER) {
    if (!usedTypes.has(type)) {
      return type;
    }
  }

  // Second preference: used but not failed
  for (const type of EXPLANATION_TYPE_ORDER) {
    if (!failedTypes.has(type)) {
      return type;
    }
  }

  // All types exhausted — cycle back to first non-failed
  return EXPLANATION_TYPE_ORDER[0]!;
}

/**
 * Determine the appropriate recovery action based on consecutive failures.
 * Implements the failure recovery ladder from the festival spec.
 */
export function selectRecoveryAction(
  consecutiveFailures: number,
): TutorAction {
  const index = Math.min(consecutiveFailures, FAILURE_RECOVERY_LADDER.length - 1);
  return FAILURE_RECOVERY_LADDER[index]!;
}

/**
 * Determine if cognitive load controls should throttle pacing.
 * Returns true if the tutor should slow down (e.g., add encouragement,
 * reduce complexity, or pause for comprehension).
 */
export function shouldThrottlePacing(
  mastery: ConceptMasteryRecord | null,
  recentEvaluationCount: number,
): boolean {
  if (mastery === null) return false;

  // If confusion is high, slow down
  if (mastery.confusionScore >= 0.6) return true;

  // If we've had many checks without progress, slow down
  const recentHistory = mastery.evidenceHistory.slice(-COGNITIVE_LOAD_COOLDOWN_CHECKS);
  const recentFailures = recentHistory.filter((e) => !e.isCorrect).length;
  if (recentFailures >= COGNITIVE_LOAD_COOLDOWN_CHECKS) return true;

  // If we've asked too many questions in a row without teaching, slow down
  if (recentEvaluationCount >= MAX_CONSECUTIVE_FAILURES) return true;

  return false;
}

/**
 * Track explanation diversity state for a session.
 */
export function createDiversityState(): ExplanationDiversityState {
  return {
    attempts: [],
    consecutiveFailures: 0,
    lastCheckCount: 0,
  };
}

export function updateDiversityState(
  state: ExplanationDiversityState,
  attempt: ExplanationAttempt,
): ExplanationDiversityState {
  const consecutiveFailures =
    attempt.outcome === 'failed'
      ? state.consecutiveFailures + 1
      : 0;

  return {
    attempts: [...state.attempts, attempt],
    consecutiveFailures,
    lastCheckCount:
      attempt.outcome === 'failed'
        ? state.lastCheckCount + 1
        : 0,
  };
}
