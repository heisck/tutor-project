import type {
  CheckQuestionType,
  ConceptMasteryRecord,
  ConfusionSignal,
  ErrorClassification,
  ExplanationAttempt,
  MasteryEvidence,
  ResponseEvaluation,
  SessionExplanationType,
  SessionMasteryStatus,
} from '@ai-tutor-pwa/shared';

export class EvaluationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'EvaluationError';
  }
}

export interface EvaluationInput {
  checkType: CheckQuestionType | null;
  conceptId: string;
  learnerResponse: string;
  mastery: ConceptMasteryRecord | null;
}

export interface EvaluationResult {
  evaluation: ResponseEvaluation;
  updatedMastery: ConceptMasteryRecord;
}

/**
 * Evaluate a learner's response and produce confusion scoring, error classification,
 * and an updated mastery record. This is the synchronous "rule engine" layer —
 * real AI evaluation would wrap this with an LLM call that produces the ResponseEvaluation,
 * then this function applies the mastery state machine.
 */
export function applyEvaluationToMastery(
  input: EvaluationInput,
  evaluation: ResponseEvaluation,
): EvaluationResult {
  const now = new Date().toISOString();
  const currentMastery = input.mastery ?? createInitialMastery(input.conceptId);

  const evidence: MasteryEvidence = {
    checkType: input.checkType ?? 'paraphrase',
    conceptId: input.conceptId,
    confusionScore: evaluation.confusionScore,
    evaluatedAt: now,
    isCorrect: evaluation.isCorrect,
    questionType: input.checkType ?? 'paraphrase',
  };

  const updatedHistory = [...currentMastery.evidenceHistory, evidence];
  const avgConfusion = computeAverageConfusion(updatedHistory);
  const nextStatus = computeNextMasteryStatus(
    currentMastery.status,
    evaluation,
    updatedHistory,
  );

  return {
    evaluation,
    updatedMastery: {
      conceptId: input.conceptId,
      confusionScore: avgConfusion,
      evidenceHistory: updatedHistory,
      explanationTypes: currentMastery.explanationTypes,
      status: nextStatus,
    },
  };
}

/**
 * Record that an explanation was delivered for a concept.
 */
export function recordExplanationAttempt(
  mastery: ConceptMasteryRecord | null,
  conceptId: string,
  explanationType: SessionExplanationType,
): ConceptMasteryRecord {
  const current = mastery ?? createInitialMastery(conceptId);

  const nextStatus: SessionMasteryStatus =
    current.status === 'not_taught' ? 'taught' : current.status;

  return {
    ...current,
    explanationTypes: [...current.explanationTypes, explanationType],
    status: nextStatus,
  };
}

/**
 * Build an explanation attempt log entry.
 */
export function buildExplanationAttempt(
  conceptId: string,
  explanationType: SessionExplanationType,
  outcome: ExplanationAttempt['outcome'],
): ExplanationAttempt {
  return {
    conceptId,
    explanationType,
    outcome,
    usedAt: new Date().toISOString(),
  };
}

export function createInitialMastery(conceptId: string): ConceptMasteryRecord {
  return {
    conceptId,
    confusionScore: 0,
    evidenceHistory: [],
    explanationTypes: [],
    status: 'not_taught',
  };
}

function computeAverageConfusion(
  history: readonly MasteryEvidence[],
): number {
  if (history.length === 0) return 0;

  const sum = history.reduce((acc, e) => acc + e.confusionScore, 0);
  return Math.min(1, Math.max(0, sum / history.length));
}

function computeNextMasteryStatus(
  currentStatus: SessionMasteryStatus,
  evaluation: ResponseEvaluation,
  history: readonly MasteryEvidence[],
): SessionMasteryStatus {
  // If not yet taught, stay not_taught
  if (currentStatus === 'not_taught') {
    return 'not_taught';
  }

  // Illusion of understanding detected — flag as weak even if "correct"
  if (evaluation.illusionOfUnderstanding) {
    return 'weak';
  }

  // Incorrect response
  if (!evaluation.isCorrect) {
    if (evaluation.confusionScore >= 0.7) {
      return 'weak';
    }
    return 'partial';
  }

  // Correct response — check evidence depth
  const correctCount = history.filter((e) => e.isCorrect).length;
  const distinctCorrectTypes = new Set(
    history.filter((e) => e.isCorrect).map((e) => e.checkType),
  );

  if (correctCount >= 2 && distinctCorrectTypes.size >= 2) {
    const avgConfusion = computeAverageConfusion(history);
    if (avgConfusion <= 0.4) {
      return 'mastered';
    }
  }

  if (correctCount >= 1) {
    return 'checked';
  }

  return 'taught';
}

/**
 * Detect confusion signals from learner response text.
 * This is a heuristic-based pre-filter — real confusion scoring
 * should be done by the AI evaluation call.
 */
export function detectConfusionSignals(
  response: string,
): ConfusionSignal[] {
  const signals: ConfusionSignal[] = [];
  const normalized = response.toLowerCase().trim();

  // Filler phrases
  const fillerPatterns = [
    /i think maybe/,
    /i('m| am) not sure/,
    /i don('t| do not) (really )?know/,
    /something like/,
    /kind of/,
    /sort of/,
    /i guess/,
    /probably/,
    /it('s| is) like\.\.\./,
  ];
  if (fillerPatterns.some((pattern) => pattern.test(normalized))) {
    signals.push('filler_phrases');
  }

  // Vague answer — very short or only hedging
  if (normalized.length < 20) {
    signals.push('vague_answer');
  }

  // Repeated paraphrasing — same words appearing multiple times
  const words = normalized.split(/\s+/).filter((word) => word.length > 3);
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
  }
  const repeatedWords = [...wordCounts.values()].filter((count) => count >= 3);
  if (repeatedWords.length >= 2) {
    signals.push('repeated_paraphrasing');
  }

  if (signals.length === 0) {
    signals.push('no_signal');
  }

  return signals;
}

/**
 * Classify error type from evaluation results.
 */
export function classifyError(
  evaluation: Pick<ResponseEvaluation, 'confusionScore' | 'confusionSignals' | 'isCorrect' | 'illusionOfUnderstanding'>,
): ErrorClassification {
  if (evaluation.isCorrect && !evaluation.illusionOfUnderstanding) {
    return 'none';
  }

  if (evaluation.illusionOfUnderstanding) {
    return 'surface_memorization';
  }

  if (evaluation.confusionSignals.includes('vague_answer') && evaluation.confusionScore >= 0.6) {
    return 'guessing';
  }

  if (evaluation.confusionSignals.includes('filler_phrases')) {
    return 'vocabulary_block';
  }

  if (evaluation.confusionScore >= 0.5) {
    return 'misconception';
  }

  if (evaluation.confusionScore >= 0.3) {
    return 'partial_understanding';
  }

  return 'careless_mistake';
}
