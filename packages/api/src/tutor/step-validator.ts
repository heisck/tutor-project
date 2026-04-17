import type { TutorAction } from '@ai-tutor-pwa/shared';

export interface TutorStepValidation {
  isValid: boolean;
  violations: string[];
}

/**
 * Actions that MUST be followed by a learner-generated response check.
 * The micro-teach contract: teach → check → feedback → next.
 */
const ACTIONS_REQUIRING_CHECK_FOLLOWUP: ReadonlySet<TutorAction> = new Set([
  'teach',
  'reteach',
  'refine',
  'simpler',
]);

/**
 * Actions that represent progression and require prior check evidence.
 */
const PROGRESSION_ACTIONS: ReadonlySet<TutorAction> = new Set([
  'advance',
  'complete_session',
]);

/**
 * Validate a tutor step against the micro-teach loop contract.
 *
 * A tutor step is INVALID if:
 * - It allows progression without a preceding check
 * - A teaching action is not set up to require a learner response
 *
 * This validator is called post-decision to enforce the contract.
 */
export function validateTutorStep(input: {
  action: TutorAction;
  hasCheckFollowup: boolean;
  hasPriorCheckEvidence: boolean;
  masteryStatus: string;
}): TutorStepValidation {
  const violations: string[] = [];

  // Rule: progression actions (advance, complete_session) require prior check evidence
  if (PROGRESSION_ACTIONS.has(input.action) && !input.hasPriorCheckEvidence) {
    violations.push(
      `Action "${input.action}" requires prior check evidence but none exists`,
    );
  }

  // Rule: teaching actions must have check followup (the orchestrator must
  // schedule a check after teach/reteach/refine/simpler)
  if (ACTIONS_REQUIRING_CHECK_FOLLOWUP.has(input.action) && !input.hasCheckFollowup) {
    violations.push(
      `Action "${input.action}" must be followed by a learner-generated check`,
    );
  }

  // Rule: cannot skip without explicit reason (skip must only happen
  // when mastery is already satisfied)
  if (input.action === 'skip' && input.masteryStatus !== 'mastered') {
    violations.push(
      'Skip action is only valid when concept is already mastered',
    );
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Check whether a tutor decision has valid check followup setup.
 * Teaching actions produce a `nextCheckType` in the orchestrator;
 * if they don't, the step lacks learner response requirement.
 */
export function hasCheckFollowup(decision: {
  action: TutorAction;
  nextCheckType: string | null;
}): boolean {
  // Check and advance/complete don't need followup — they ARE the check or terminal
  if (!ACTIONS_REQUIRING_CHECK_FOLLOWUP.has(decision.action)) {
    return true;
  }

  // For teach actions, the orchestrator's next step will be a check.
  // Teach actions don't set nextCheckType on themselves (the check comes next turn).
  // So teach/reteach/simpler always have implicit followup.
  if (
    decision.action === 'teach' ||
    decision.action === 'reteach' ||
    decision.action === 'simpler'
  ) {
    return true;
  }

  // For refine, a nextCheckType must be provided
  return decision.nextCheckType !== null;
}
