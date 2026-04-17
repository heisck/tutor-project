import { AI_CALL_CONFIGS, type AiCallType } from './ai-runtime.js';

/**
 * Core reasoning paths that MUST remain Claude-backed.
 * These paths directly determine tutoring behavior and mastery decisions.
 */
const CLAUDE_REQUIRED_PATHS: ReadonlySet<AiCallType> = new Set([
  'tutorGeneration',
  'tutorEvaluation',
  'tutorAssistant',
  'conceptAnalysis',
]);

/**
 * Intentional Gemini-backed ingestion and retrieval paths.
 * These reduce upload cost without changing the tutor brain.
 */
const GEMINI_ALLOWED_PATHS: ReadonlySet<AiCallType> = new Set([
  'atuExtraction',
  'embedding',
  'visionDescription',
]);

/**
 * Intentional OpenAI-backed voice paths.
 */
const OPENAI_ALLOWED_PATHS: ReadonlySet<AiCallType> = new Set([
  'voiceTranscription',
  'voiceSynthesis',
]);

const ZERO_TOKEN_BUDGET_ALLOWED_PATHS: ReadonlySet<AiCallType> = new Set([
  'embedding',
  'voiceSynthesis',
  'voiceTranscription',
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
 * Validate that provider routing matches the intended contract.
 *
 * Provider rule:
 * - Tutor/planning/evaluation reasoning must be Claude-backed
 * - Upload-time extraction, vision, and embeddings may be Gemini-backed
 * - Voice paths may remain OpenAI-backed
 * - No unclassified or accidental provider drift
 *
 * This function should be called at application startup to catch
 * configuration drift before any tutoring sessions begin.
 */
export function validateProviderIntegrity(): ProviderIntegrityReport {
  const violations: ProviderIntegrityViolation[] = [];

  for (const [callType, config] of Object.entries(AI_CALL_CONFIGS)) {
    const typedCallType = callType as AiCallType;

    if (CLAUDE_REQUIRED_PATHS.has(typedCallType)) {
      if (!isClaudeModel(config.model)) {
        violations.push({
          callType: typedCallType,
          currentModel: config.model,
          reason: `Core reasoning path "${callType}" uses non-Claude model "${config.model}". These paths must be Claude-backed.`,
        });
      }
      continue;
    }

    if (GEMINI_ALLOWED_PATHS.has(typedCallType)) {
      if (!isGeminiModel(config.model)) {
        violations.push({
          callType: typedCallType,
          currentModel: config.model,
          reason: `Path "${callType}" is expected to use a Gemini model, but is configured as "${config.model}".`,
        });
      }
      continue;
    }

    if (OPENAI_ALLOWED_PATHS.has(typedCallType)) {
      if (!isOpenAiModel(config.model)) {
        violations.push({
          callType: typedCallType,
          currentModel: config.model,
          reason: `Voice path "${callType}" is expected to use an OpenAI model, but is configured as "${config.model}".`,
        });
      }
      continue;
    }

    {
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

function isGeminiModel(model: string): boolean {
  return model.startsWith('gemini-');
}

function isOpenAiModel(model: string): boolean {
  return model.startsWith('gpt-') || model.startsWith('text-embedding-');
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

  // Verify all required paths have configured models
  for (const callType of CLAUDE_REQUIRED_PATHS) {
    const config = AI_CALL_CONFIGS[callType];
    if (!config.model || config.model.length === 0) {
      incompletePaths.push(`${callType}: no model configured`);
    }
    if (config.maxTokens <= 0 && !ZERO_TOKEN_BUDGET_ALLOWED_PATHS.has(callType)) {
      incompletePaths.push(`${callType}: no max tokens configured`);
    }
    if (config.timeoutMs <= 0) {
      incompletePaths.push(`${callType}: no timeout configured`);
    }
  }

  for (const callType of GEMINI_ALLOWED_PATHS) {
    const config = AI_CALL_CONFIGS[callType];
    if (!config.model || config.model.length === 0) {
      incompletePaths.push(`${callType}: no model configured`);
    }
    if (config.maxTokens <= 0 && !ZERO_TOKEN_BUDGET_ALLOWED_PATHS.has(callType)) {
      incompletePaths.push(`${callType}: no max tokens configured`);
    }
    if (config.timeoutMs <= 0) {
      incompletePaths.push(`${callType}: no timeout configured`);
    }
  }

  for (const callType of OPENAI_ALLOWED_PATHS) {
    const config = AI_CALL_CONFIGS[callType];
    if (!config.model || config.model.length === 0) {
      incompletePaths.push(`${callType}: no model configured`);
    }
    if (config.maxTokens <= 0 && !ZERO_TOKEN_BUDGET_ALLOWED_PATHS.has(callType)) {
      incompletePaths.push(`${callType}: no max tokens configured`);
    }
    if (config.timeoutMs <= 0) {
      incompletePaths.push(`${callType}: no timeout configured`);
    }
  }

  return incompletePaths;
}
