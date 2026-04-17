import { z } from 'zod';

/**
 * UI Orchestration Contract
 *
 * Hard rules:
 * 1. UI must never display more than one primary action
 * 2. UI must never display more than one active cognitive task
 * 3. Home screen shows one next action
 * 4. Session screen shows one teaching moment
 * 5. Progress is human language only (no raw mastery states, engine states, or technical labels)
 *
 * These rules are enforced at the data layer — the API response shapes
 * must carry exactly the information needed for a compliant UI.
 */

export const uiScreenStateSchema = z.enum([
  'loading',
  'empty',
  'launcher',
  'active_session',
  'session_complete',
  'error',
]);
export type UiScreenState = z.infer<typeof uiScreenStateSchema>;

export const uiPrimaryActionSchema = z.object({
  actionId: z.string().min(1),
  label: z.string().min(1),
  targetRoute: z.string().min(1),
});
export type UiPrimaryAction = z.infer<typeof uiPrimaryActionSchema>;

export const uiCognitiveTaskSchema = z.object({
  conceptTitle: z.string().min(1),
  humanProgress: z.string().min(1),
  taskType: z.enum(['learning', 'checking', 'reviewing', 'completing']),
});
export type UiCognitiveTask = z.infer<typeof uiCognitiveTaskSchema>;

export interface UiContractViolation {
  rule: string;
  detail: string;
}

/**
 * Validate that a screen state has at most one primary action.
 */
export function validateSinglePrimaryAction(
  actions: readonly UiPrimaryAction[],
): UiContractViolation | null {
  if (actions.length > 1) {
    return {
      rule: 'single_primary_action',
      detail: `UI displays ${actions.length} primary actions but must show at most 1`,
    };
  }
  return null;
}

/**
 * Validate that a screen state has at most one active cognitive task.
 */
export function validateSingleCognitiveTask(
  tasks: readonly UiCognitiveTask[],
): UiContractViolation | null {
  if (tasks.length > 1) {
    return {
      rule: 'single_cognitive_task',
      detail: `UI displays ${tasks.length} cognitive tasks but must show at most 1`,
    };
  }
  return null;
}

/**
 * Validate that progress text is human-readable (no raw technical states).
 */
export function validateHumanLanguageProgress(
  progressText: string,
): UiContractViolation | null {
  const technicalPatterns = [
    /\b(NOT_TAUGHT|IN_PROGRESS|TAUGHT|ASSESSED)\b/,
    /\b(UNRESOLVED|RESOLVED)\b/,
    /\b(not_taught|taught|checked|partial|weak|mastered)\b/,
    /\b(confusionScore|evidenceCount|atuId)\b/,
    /\b(coverageLedger|masteryGate)\b/,
    /\{[^}]*"[^"]*":/,
  ];

  for (const pattern of technicalPatterns) {
    if (pattern.test(progressText)) {
      return {
        rule: 'human_language_progress',
        detail: `Progress text contains technical state: "${progressText.slice(0, 100)}"`,
      };
    }
  }

  return null;
}

/**
 * Build a human-readable progress description from session state.
 * Replaces raw mastery counts with natural language.
 */
export function buildHumanProgress(input: {
  masteredCount: number;
  totalConcepts: number;
  mode: string;
  currentConceptTitle: string | null;
}): string {
  const { masteredCount, totalConcepts, mode, currentConceptTitle } = input;

  if (totalConcepts === 0) {
    return 'Getting your lesson ready...';
  }

  if (masteredCount === totalConcepts) {
    return 'You have covered everything in this session!';
  }

  const progressFraction = masteredCount / totalConcepts;
  const progressDescription =
    progressFraction === 0
      ? 'Just getting started'
      : progressFraction < 0.25
        ? 'Early progress'
        : progressFraction < 0.5
          ? 'Making good progress'
          : progressFraction < 0.75
            ? 'Over halfway there'
            : 'Almost done';

  const modeLabel =
    mode === 'full'
      ? 'studying'
      : mode === 'quiz'
        ? 'quizzing'
        : mode === 'exam'
          ? 'exam prep'
          : mode === 'revision'
            ? 'reviewing'
            : mode === 'difficult_parts'
              ? 'working on tricky parts'
              : 'learning';

  if (currentConceptTitle !== null) {
    return `${progressDescription} — ${modeLabel} "${currentConceptTitle}"`;
  }

  return `${progressDescription} — ${masteredCount} of ${totalConcepts} concepts secured`;
}

/**
 * Determine the single primary action for the dashboard.
 */
export function getDashboardPrimaryAction(input: {
  hasReadyDocuments: boolean;
  mostRecentDocumentId: string | null;
}): UiPrimaryAction {
  if (input.hasReadyDocuments && input.mostRecentDocumentId !== null) {
    return {
      actionId: 'continue_learning',
      label: 'Continue learning',
      targetRoute: `/session?documentId=${input.mostRecentDocumentId}`,
    };
  }

  return {
    actionId: 'upload_first',
    label: 'Upload your first file',
    targetRoute: '/upload',
  };
}

/**
 * Determine the single cognitive task for an active session.
 */
export function getSessionCognitiveTask(input: {
  conceptTitle: string;
  masteredCount: number;
  mode: string;
  totalConcepts: number;
  tutorAction: string;
}): UiCognitiveTask {
  const taskType =
    input.tutorAction === 'check' || input.tutorAction === 'refine'
      ? 'checking'
      : input.tutorAction === 'advance' || input.tutorAction === 'complete_session'
        ? 'completing'
        : input.mode === 'revision'
          ? 'reviewing'
          : 'learning';

  return {
    conceptTitle: input.conceptTitle,
    humanProgress: buildHumanProgress({
      currentConceptTitle: input.conceptTitle,
      masteredCount: input.masteredCount,
      mode: input.mode,
      totalConcepts: input.totalConcepts,
    }),
    taskType,
  };
}
