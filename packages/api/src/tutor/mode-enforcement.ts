import type { StudySessionMode, TutorAction } from '@ai-tutor-pwa/shared';

export interface ModeRuntimeBehavior {
  /** Additional prompt rules injected per mode */
  promptRules: string[];
  /** Allowed question types (empty = all) */
  preferredQuestionFocus: string[];
  /** Maximum explanation length hint */
  explanationLengthHint: 'short' | 'medium' | 'full';
  /** How aggressively difficulty progresses */
  difficultyProgression: 'conservative' | 'moderate' | 'aggressive';
  /** Error tolerance before reteach */
  errorTolerance: 'strict' | 'moderate' | 'lenient';
}

/**
 * Get mode-specific runtime behavior.
 * Each mode MUST produce materially different teaching behavior.
 * If a mode's output is indistinguishable from another, the mode is NOT IMPLEMENTED.
 */
export function getModeRuntimeBehavior(mode: StudySessionMode): ModeRuntimeBehavior {
  switch (mode) {
    case 'full':
      return {
        promptRules: [
          'Follow prerequisite order strictly. Teach each concept fully before proceeding.',
          'Use story-first → example → formal definition progression.',
          'After teaching, always check understanding before moving on.',
          'Build bridges between concepts explicitly.',
        ],
        preferredQuestionFocus: ['explanation', 'transfer'],
        explanationLengthHint: 'full',
        difficultyProgression: 'moderate',
        errorTolerance: 'moderate',
      };

    case 'quiz':
      return {
        promptRules: [
          'Question-first: start with a check question BEFORE any explanation.',
          'Keep exposition minimal — only explain what the learner got wrong.',
          'If the learner answers correctly, move on immediately.',
          'Targeted reteach only: address the specific gap, not the whole concept.',
        ],
        preferredQuestionFocus: ['explanation', 'application', 'error_spotting'],
        explanationLengthHint: 'short',
        difficultyProgression: 'moderate',
        errorTolerance: 'lenient',
      };

    case 'exam':
      return {
        promptRules: [
          'Exam-priority: focus on transfer, application, and error-spotting questions.',
          'Use exam-style phrasing and complexity.',
          'Require the learner to show reasoning, not just answers.',
          'Stricter evaluation: partial answers are not enough for progression.',
          'Time-pressure framing: keep exchanges focused and efficient.',
        ],
        preferredQuestionFocus: ['application', 'transfer', 'error_spotting'],
        explanationLengthHint: 'short',
        difficultyProgression: 'aggressive',
        errorTolerance: 'strict',
      };

    case 'revision':
      return {
        promptRules: [
          'Retrieval-first: ask the learner to recall before giving any information.',
          'Use spaced reinforcement: start with what was learned longest ago.',
          'Keep checks quick — confirm recall, then move to next item.',
          'Only reteach if the learner cannot recall the core idea.',
          'Reinforce connections between reviewed concepts.',
        ],
        preferredQuestionFocus: ['explanation', 'transfer'],
        explanationLengthHint: 'short',
        difficultyProgression: 'conservative',
        errorTolerance: 'moderate',
      };

    case 'difficult_parts':
      return {
        promptRules: [
          'Target weak points directly. Skip concepts the learner has already mastered.',
          'Use shorter teaching loops with more frequent checks.',
          'Recovery-ladder approach: start below the difficulty ceiling, build up gradually.',
          'If the learner struggles twice on the same concept, simplify before retrying.',
          'Focus on the specific confusion pattern, not general review.',
        ],
        preferredQuestionFocus: ['explanation', 'transfer', 'error_spotting'],
        explanationLengthHint: 'medium',
        difficultyProgression: 'conservative',
        errorTolerance: 'lenient',
      };

    case 'flashcards':
      return {
        promptRules: [
          'Simple recall format: present a prompt, wait for answer.',
          'Keep each exchange to one concept.',
          'Mark correct/incorrect clearly and move on.',
          'No extended explanations unless explicitly asked.',
        ],
        preferredQuestionFocus: ['explanation'],
        explanationLengthHint: 'short',
        difficultyProgression: 'conservative',
        errorTolerance: 'lenient',
      };

    case 'summary':
      return {
        promptRules: [
          'Provide concise overviews of each concept.',
          'Highlight key relationships between concepts.',
          'Use bullet points and structure for scannability.',
          'End each summary with one key takeaway.',
        ],
        preferredQuestionFocus: ['explanation'],
        explanationLengthHint: 'medium',
        difficultyProgression: 'conservative',
        errorTolerance: 'lenient',
      };

    case 'images':
      return {
        promptRules: [
          'Lead with visual descriptions from the document.',
          'Use word pictures and spatial language to explain.',
          'Reference diagrams, charts, or figures described in the source material.',
          'Ask learners to describe what they see or visualize.',
        ],
        preferredQuestionFocus: ['explanation', 'application'],
        explanationLengthHint: 'medium',
        difficultyProgression: 'moderate',
        errorTolerance: 'moderate',
      };

    case 'voice':
      return {
        promptRules: [
          'Keep all responses voice-friendly: short sentences, clear pauses.',
          'Avoid complex formatting, lists, or visual elements.',
          'Use conversational tone suited for audio delivery.',
          'Questions should be answerable in 1-2 spoken sentences.',
        ],
        preferredQuestionFocus: ['explanation', 'application'],
        explanationLengthHint: 'short',
        difficultyProgression: 'moderate',
        errorTolerance: 'moderate',
      };
  }
}

/**
 * Build mode-specific prompt rules as a string section
 * to inject into the tutor system prompt.
 */
export function buildModePromptRules(mode: StudySessionMode): string {
  const behavior = getModeRuntimeBehavior(mode);

  const lines = [
    `Mode: ${mode} — follow these mode-specific rules:`,
    ...behavior.promptRules.map((rule) => `- ${rule}`),
    '',
    `Explanation length: ${behavior.explanationLengthHint}`,
    `Difficulty progression: ${behavior.difficultyProgression}`,
    `Error tolerance: ${behavior.errorTolerance}`,
  ];

  return lines.join('\n');
}

/**
 * Validate that a tutor action is appropriate for the current mode.
 * Returns a correction if the action contradicts mode behavior.
 */
export function validateActionForMode(
  action: TutorAction,
  mode: StudySessionMode,
  masteryStatus: string,
): { correctedAction: TutorAction; reason: string } | null {
  // Quiz mode: untaught concepts should start with check, not teach
  if (mode === 'quiz' && action === 'teach' && masteryStatus === 'not_taught') {
    return {
      correctedAction: 'check',
      reason: 'Quiz mode requires question-first: check before teaching',
    };
  }

  // Exam mode: should not simplify unless cognitive load is critical
  // (simpler is deprioritized in exam mode)
  // This is advisory — the orchestrator can override with cognitive load

  // Revision mode: should not teach from scratch, prefer check/refine
  if (mode === 'revision' && action === 'teach' && masteryStatus !== 'not_taught') {
    return {
      correctedAction: 'check',
      reason: 'Revision mode uses retrieval-first: check recall before reteaching',
    };
  }

  return null;
}
