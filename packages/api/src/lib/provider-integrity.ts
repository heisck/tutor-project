import { AI_CALL_CONFIGS, type AiCallType } from './ai-runtime.js';

/**
 * Core learning intelligence paths that MUST be Claude-backed.
 * These paths directly affect learning outcomes and mastery decisions.
 */
const CORE_LEARNING_PATHS: ReadonlySet<AiCallType> = new Set([
  'tutorGeneration',
  'tutorEvaluation',
  'tutorAssistant',
  'atuExtraction',
  'conceptAnalysis',
  'visionDescription',
]);

/**
 * Allowed non-Claude providers and their permitted call types.
 * OpenAI may remain ONLY for these explicitly intentional, non-core paths.
 */
const ALLOWED_NON_CLAUDE_PATHS: ReadonlySet<AiCallType> = new Set([
  'embedding',
  'voiceTranscription',
  'voiceSynthesis',
]);

export interface ProviderIntegrityViolation {
  callType: AiCallType;
  currentModel: string;
  reason: string;
}

export interface ProviderIntegrityReport {
  passed: boolean;
  violations: ProviderIntegrityViolation[];
}

/**
 * Validate that all core learning paths use Claude (Anthropic) models.
 *
 * Provider rule:
 * - Core learning intelligence must be Claude-backed
 * - OpenAI may remain only for embeddings, voice transcription, and voice synthesis
 * - No TODO provider swaps, no silent placeholder OpenAI usage in core tutor logic
 *
 * This function should be called at application startup to catch
 * configuration drift before any tutoring sessions begin.
 */
export function validateProviderIntegrity(): ProviderIntegrityReport {
  const violations: ProviderIntegrityViolation[] = [];

  for (const [callType, config] of Object.entries(AI_CALL_CONFIGS)) {
    const typedCallType = callType as AiCallType;

    if (CORE_LEARNING_PATHS.has(typedCallType)) {
      // Core paths must use Claude models
      if (!isClaudeModel(config.model)) {
        violations.push({
          callType: typedCallType,
          currentModel: config.model,
          reason: `Core learning path "${callType}" uses non-Claude model "${config.model}". Core paths must be Claude-backed.`,
        });
      }
    } else if (!ALLOWED_NON_CLAUDE_PATHS.has(typedCallType)) {
      // Unknown call type — flag it
      violations.push({
        callType: typedCallType,
        currentModel: config.model,
        reason: `Call type "${callType}" is not classified as core or non-core. Add it to the appropriate set.`,
      });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

function isClaudeModel(model: string): boolean {
  return model.startsWith('claude-');
}

/**
 * Degraded behavior rules for evaluation results.
 *
 * When Claude-backed evaluation fails and falls back to heuristic evaluation:
 * - The evaluation is marked with a degradedReason
 * - Degraded evaluations CANNOT silently award strong mastery
 * - The maximum mastery status from a degraded evaluation is 'checked'
 * - The learner must get a non-degraded evaluation to reach 'mastered'
 */
export interface DegradedEvaluationGuard {
  allowMastery: boolean;
  maxMasteryStatus: 'checked' | 'mastered';
  reason: string | null;
}

export function applyDegradedEvaluationGuard(
  degradedReason: string | null,
): DegradedEvaluationGuard {
  if (degradedReason === null) {
    return {
      allowMastery: true,
      maxMasteryStatus: 'mastered',
      reason: null,
    };
  }

  return {
    allowMastery: false,
    maxMasteryStatus: 'checked',
    reason: `Degraded evaluation cannot award mastery: ${degradedReason}`,
  };
}

/**
 * System completeness check.
 *
 * If a learning path is not fully wired:
 * - Do not present it as complete
 * - Either complete it or degrade explicitly, safely, and honestly
 *
 * Returns a list of paths that have incomplete behavior.
 */
export function checkSystemCompleteness(): string[] {
  const incompletePaths: string[] = [];

  // Verify all core paths have configured models
  for (const callType of CORE_LEARNING_PATHS) {
    const config = AI_CALL_CONFIGS[callType];
    if (!config.model || config.model.length === 0) {
      incompletePaths.push(`${callType}: no model configured`);
    }
    if (config.maxTokens <= 0 && callType !== 'embedding') {
      incompletePaths.push(`${callType}: no max tokens configured`);
    }
    if (config.timeoutMs <= 0) {
      incompletePaths.push(`${callType}: no timeout configured`);
    }
  }

  return incompletePaths;
}
