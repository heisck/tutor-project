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
  TutorAction,
} from '@ai-tutor-pwa/shared';

const COMPLEX_TERM_THRESHOLD = 13;
const FILLER_PATTERNS = [
  /i think maybe/,
  /i('m| am) not sure/,
  /i don('t| do not) (really )?know/,
  /something like/,
  /kind of/,
  /sort of/,
  /i guess/,
  /probably/,
  /it('s| is) like\.\.\./,
  /uh+/,
  /um+/,
];
const HESITATION_PATTERNS = [/\.{3,}/, /\buh\b/, /\bum\b/, /\ber\b/, /\bwait\b/];
const MEMORIZATION_PATTERNS = [
  /\bit means\b/,
  /\bit is when\b/,
  /\bas defined\b/,
  /\bthe definition is\b/,
];

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

export function heuristicEvaluateLearnerResponse(
  response: string,
): ResponseEvaluation {
  const confusionSignals = detectConfusionSignals(response);
  const normalized = response.trim();
  const lower = normalized.toLowerCase();
  const unknownTerms = detectUnknownTerms(response);
  const containsTransferLanguage =
    /\b(example|case|apply|if|when|because|so that|therefore)\b/.test(lower);
  const containsContrastLanguage =
    /\b(unlike|different|compared|whereas|instead)\b/.test(lower);
  const confusionScore = computeConfusionScore(confusionSignals, normalized.length);
  const illusionOfUnderstanding =
    MEMORIZATION_PATTERNS.some((pattern) => pattern.test(lower)) &&
    !containsTransferLanguage &&
    !containsContrastLanguage;
  const isCorrect = normalized.length >= 25 && confusionScore <= 0.55;
  const responseQuality =
    normalized.length >= 110 && containsTransferLanguage
      ? 'strong'
      : normalized.length >= 50
        ? 'adequate'
        : 'weak';
  const cognitiveLoad =
    confusionSignals.includes('hesitation') || confusionSignals.includes('long_pause')
      ? 'high'
      : confusionSignals.includes('filler_phrases')
        ? 'moderate'
        : 'low';
  const evaluationBase = {
    cognitiveLoad,
    confusionScore,
    confusionSignals,
    illusionOfUnderstanding,
    isCorrect,
  } satisfies Pick<
    ResponseEvaluation,
    | 'cognitiveLoad'
    | 'confusionScore'
    | 'confusionSignals'
    | 'illusionOfUnderstanding'
    | 'isCorrect'
  >;

  return {
    ...evaluationBase,
    errorClassification: classifyError(evaluationBase),
    reasoning: buildEvaluationReasoning({
      confusionScore,
      confusionSignals,
      illusionOfUnderstanding,
      isCorrect,
      responseQuality,
      unknownTerms,
    }),
    recommendedAction: deriveRecommendedAction({
      cognitiveLoad,
      confusionScore,
      confusionSignals,
      illusionOfUnderstanding,
      isCorrect,
      responseQuality,
    }),
    responseQuality,
    unknownTerms,
  };
}

function computeAverageConfusion(history: readonly MasteryEvidence[]): number {
  if (history.length === 0) return 0;

  const sum = history.reduce((acc, e) => acc + e.confusionScore, 0);
  return Math.min(1, Math.max(0, sum / history.length));
}

function computeNextMasteryStatus(
  currentStatus: SessionMasteryStatus,
  evaluation: ResponseEvaluation,
  history: readonly MasteryEvidence[],
): SessionMasteryStatus {
  if (currentStatus === 'not_taught') {
    return 'not_taught';
  }

  if (evaluation.illusionOfUnderstanding) {
    return 'weak';
  }

  if (!evaluation.isCorrect) {
    if (evaluation.confusionScore >= 0.7) {
      return 'weak';
    }
    return 'partial';
  }

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

export function detectConfusionSignals(response: string): ConfusionSignal[] {
  const signals: ConfusionSignal[] = [];
  const normalized = response.toLowerCase().trim();

  if (FILLER_PATTERNS.some((pattern) => pattern.test(normalized))) {
    signals.push('filler_phrases');
  }

  if (normalized.length < 20) {
    signals.push('vague_answer');
  }

  const words = normalized.split(/\s+/).filter((word) => word.length > 3);
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
  }
  const repeatedWords = [...wordCounts.values()].filter((count) => count >= 3);
  if (repeatedWords.length >= 2) {
    signals.push('repeated_paraphrasing');
  }

  if (HESITATION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    signals.push('hesitation');
  }

  if (normalized.includes('[pause]') || /\(pause\)/.test(normalized)) {
    signals.push('long_pause');
  }

  const wordCount = normalized.split(/\s+/).length;
  if (
    /\b(because|therefore|so that|which means|apply|example|when|if)\b/.test(normalized) === false &&
    normalized.length >= 20 &&
    wordCount >= 6 &&
    wordCount <= 12
  ) {
    signals.push('correct_words_weak_reasoning');
  }

  if (signals.length === 0) {
    signals.push('no_signal');
  }

  return [...new Set(signals)];
}

export function detectUnknownTerms(response: string): string[] {
  const words = response
    .split(/[^A-Za-z0-9_-]+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= COMPLEX_TERM_THRESHOLD);

  return [...new Set(words)].slice(0, 5);
}

export function classifyError(
  evaluation: Pick<
    ResponseEvaluation,
    'confusionScore' | 'confusionSignals' | 'illusionOfUnderstanding' | 'isCorrect'
  >,
): ErrorClassification {
  if (evaluation.isCorrect && !evaluation.illusionOfUnderstanding) {
    return 'none';
  }

  if (evaluation.illusionOfUnderstanding) {
    return 'memorization';
  }

  if (
    evaluation.confusionSignals.includes('vague_answer') &&
    evaluation.confusionScore >= 0.6
  ) {
    return 'guessing';
  }

  if (
    evaluation.confusionSignals.includes('filler_phrases') ||
    evaluation.confusionSignals.includes('hesitation')
  ) {
    return 'vocabulary_block';
  }

  if (evaluation.confusionScore >= 0.55) {
    return 'misconception';
  }

  if (evaluation.confusionScore >= 0.3) {
    return 'partial_understanding';
  }

  return 'careless_mistake';
}

function computeConfusionScore(
  confusionSignals: readonly ConfusionSignal[],
  responseLength: number,
): number {
  let score = 0.1;

  if (confusionSignals.includes('vague_answer')) score += 0.25;
  if (confusionSignals.includes('filler_phrases')) score += 0.15;
  if (confusionSignals.includes('repeated_paraphrasing')) score += 0.15;
  if (confusionSignals.includes('correct_words_weak_reasoning')) score += 0.1;
  if (confusionSignals.includes('hesitation')) score += 0.15;
  if (confusionSignals.includes('long_pause')) score += 0.2;
  if (responseLength >= 80) score -= 0.1;

  return Number(Math.min(1, Math.max(0, score)).toFixed(2));
}

function deriveRecommendedAction(
  evaluation: Pick<
    ResponseEvaluation,
    | 'cognitiveLoad'
    | 'confusionScore'
    | 'confusionSignals'
    | 'illusionOfUnderstanding'
    | 'isCorrect'
    | 'responseQuality'
  >,
): TutorAction {
  if (!evaluation.isCorrect && evaluation.confusionScore >= 0.65) {
    return evaluation.cognitiveLoad === 'high' ? 'simpler' : 'reteach';
  }

  if (evaluation.illusionOfUnderstanding) {
    return 'refine';
  }

  if (evaluation.responseQuality === 'adequate' && evaluation.isCorrect) {
    return 'refine';
  }

  if (evaluation.isCorrect) {
    return 'advance';
  }

  return 'check';
}

function buildEvaluationReasoning(input: {
  confusionScore: number;
  confusionSignals: readonly ConfusionSignal[];
  illusionOfUnderstanding: boolean;
  isCorrect: boolean;
  responseQuality: ResponseEvaluation['responseQuality'];
  unknownTerms: readonly string[];
}): string {
  const parts = [
    input.isCorrect
      ? 'The response stays on topic and shows usable understanding.'
      : 'The response does not yet show reliable understanding.',
    `Confusion score: ${input.confusionScore.toFixed(2)}.`,
  ];

  if (input.confusionSignals.some((signal) => signal !== 'no_signal')) {
    parts.push(`Signals: ${input.confusionSignals.join(', ')}.`);
  }

  if (input.illusionOfUnderstanding) {
    parts.push('The answer sounds rehearsed but lacks transfer or contrast evidence.');
  }

  if (input.unknownTerms.length > 0) {
    parts.push(`Possible blocking terms: ${input.unknownTerms.join(', ')}.`);
  }

  parts.push(`Response quality: ${input.responseQuality}.`);

  return parts.join(' ');
}
