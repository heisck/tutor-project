import type { ErrorClassification, TutorAction } from '@ai-tutor-pwa/shared';

export interface ErrorActionMapping {
  action: TutorAction;
  description: string;
}

/**
 * Hard error-to-action discipline map.
 *
 * Each error classification maps to a specific required tutor action.
 * The orchestrator must respect this mapping — it cannot override it
 * with a generic action.
 *
 * - misconception → reteach (contrast and correction)
 * - partial_understanding → refine (target missing link)
 * - memorization → check (deeper why/how or transfer check)
 * - careless_mistake → check (quick targeted correction)
 * - guessing → reteach (require reasoning before progress)
 * - vocabulary_block → simpler (simplify wording before judging concept mastery)
 * - none → advance (no error, proceed)
 */
export function getRequiredActionForError(
  errorClassification: ErrorClassification,
): ErrorActionMapping {
  switch (errorClassification) {
    case 'misconception':
      return {
        action: 'reteach',
        description: 'Misconception detected: use contrast and correction to address the wrong mental model',
      };
    case 'partial_understanding':
      return {
        action: 'refine',
        description: 'Partial understanding: target the specific missing link without re-explaining everything',
      };
    case 'memorization':
      return {
        action: 'check',
        description: 'Memorization detected: ask a deeper why/how or transfer question to test real understanding',
      };
    case 'careless_mistake':
      return {
        action: 'check',
        description: 'Careless mistake: give a quick targeted correction and recheck',
      };
    case 'guessing':
      return {
        action: 'reteach',
        description: 'Guessing detected: require reasoning before allowing any progress',
      };
    case 'vocabulary_block':
      return {
        action: 'simpler',
        description: 'Vocabulary block: simplify wording before judging concept mastery',
      };
    case 'none':
      return {
        action: 'advance',
        description: 'No error detected: learner can proceed',
      };
  }
}

/**
 * Validate that a tutor action is consistent with the error classification.
 * Returns null if consistent, or a correction recommendation if not.
 */
export function validateActionForError(
  currentAction: TutorAction,
  errorClassification: ErrorClassification,
): { correctedAction: TutorAction; reason: string } | null {
  if (errorClassification === 'none') {
    return null;
  }

  const required = getRequiredActionForError(errorClassification);

  // Allow the exact required action
  if (currentAction === required.action) {
    return null;
  }

  // Allow simpler as a valid alternative when cognitive load is high
  // (simpler is always acceptable as a safer action)
  if (currentAction === 'simpler') {
    return null;
  }

  // Allow reteach as a valid superset of refine (more thorough)
  if (currentAction === 'reteach' && required.action === 'refine') {
    return null;
  }

  // Allow reteach as a valid superset of check for serious errors
  if (
    currentAction === 'reteach' &&
    required.action === 'check' &&
    (errorClassification === 'memorization' || errorClassification === 'careless_mistake')
  ) {
    return null;
  }

  return {
    correctedAction: required.action,
    reason: required.description,
  };
}
