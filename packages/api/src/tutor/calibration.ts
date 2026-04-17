import type { ConfusionSignal } from '@ai-tutor-pwa/shared';

export type CalibrationTriggerReason =
  | 'new_learner'
  | 'weak_profile'
  | 'repeated_confusion';

export interface CalibrationTriggerResult {
  shouldCalibrate: boolean;
  reason: CalibrationTriggerReason | null;
}

export interface CalibrationContext {
  /** Confusion signals from recent turns */
  recentConfusionSignals: readonly ConfusionSignal[];
  /** Whether a learning profile exists and has been calibrated */
  hasLearningProfile: boolean;
  /** When the profile was last calibrated */
  lastCalibratedAt: string | null;
  /** Number of sessions the learner has completed */
  sessionCount: number;
  /** Current confusion score average across concepts */
  averageConfusionScore: number;
}

const CONFUSION_PATTERN_THRESHOLD = 3;
const HIGH_CONFUSION_THRESHOLD = 0.6;

/**
 * Determine whether calibration should trigger at session start.
 *
 * Calibration must trigger when:
 * - New learner (no prior sessions)
 * - Weak or empty learning profile (never calibrated)
 * - Repeated confusion patterns detected
 *
 * Calibration behavior:
 * - Teach a micro concept
 * - Observe the learner response
 * - Adapt explanation style
 * - Confirm improvement before proceeding
 *
 * Safe-start rule:
 * - Do not begin with unstable technical-term definition checks
 * - Ground meaning in plain language, example, or story first
 */
export function shouldTriggerCalibration(
  context: CalibrationContext,
): CalibrationTriggerResult {
  // Trigger: new learner with no sessions
  if (context.sessionCount === 0) {
    return { shouldCalibrate: true, reason: 'new_learner' };
  }

  // Trigger: weak or empty profile (never calibrated)
  if (!context.hasLearningProfile || context.lastCalibratedAt === null) {
    return { shouldCalibrate: true, reason: 'weak_profile' };
  }

  // Trigger: repeated confusion patterns
  const confusionSignalCount = context.recentConfusionSignals.filter(
    (signal) => signal !== 'no_signal',
  ).length;

  if (
    confusionSignalCount >= CONFUSION_PATTERN_THRESHOLD ||
    context.averageConfusionScore >= HIGH_CONFUSION_THRESHOLD
  ) {
    return { shouldCalibrate: true, reason: 'repeated_confusion' };
  }

  return { shouldCalibrate: false, reason: null };
}

/**
 * Build calibration prompt rules to inject into the tutor's first turn.
 * These rules ensure the tutor starts with a safe, grounded approach
 * rather than jumping into technical definitions.
 */
export function buildCalibrationPromptRules(
  reason: CalibrationTriggerReason,
): string {
  const baseRules = [
    'CALIBRATION MODE: Start by teaching one simple micro-concept to gauge the learner.',
    'Do NOT start with a technical definition or formal vocabulary.',
    'Ground the first explanation in plain language, a concrete example, or a short story.',
    'After explaining, ask the learner to describe it back in their own words.',
    'Observe their response to adapt your explanation style for the rest of the session.',
    'Do not proceed to the main lesson until you have confirmed the learner understood the calibration concept.',
  ];

  switch (reason) {
    case 'new_learner':
      return [
        ...baseRules,
        'This is a new learner — be especially welcoming and patient.',
        'Choose the simplest possible concept for calibration.',
      ].join('\n');

    case 'weak_profile':
      return [
        ...baseRules,
        'The learner profile is incomplete — use this calibration to fill in gaps.',
        'Pay attention to vocabulary level, explanation preference, and learning pace.',
      ].join('\n');

    case 'repeated_confusion':
      return [
        ...baseRules,
        'The learner has shown repeated confusion in recent sessions.',
        'Start at a lower difficulty level than their profile suggests.',
        'Use extra-simple language and more concrete examples.',
        'Look for the specific confusion pattern and address it directly.',
      ].join('\n');
  }
}
