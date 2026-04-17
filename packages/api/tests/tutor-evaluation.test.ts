import { describe, expect, it } from 'vitest';

import type { ConceptMasteryRecord, ResponseEvaluation } from '@ai-tutor-pwa/shared';

import {
  applyEvaluationToMastery,
  classifyError,
  createInitialMastery,
  detectConfusionSignals,
  recordExplanationAttempt,
} from '../src/tutor/evaluation.js';

describe('detectConfusionSignals', () => {
  it('detects filler phrases', () => {
    const signals = detectConfusionSignals('I think maybe it has something to do with cells');
    expect(signals).toContain('filler_phrases');
  });

  it('detects vague short answers', () => {
    const signals = detectConfusionSignals('I dunno');
    expect(signals).toContain('vague_answer');
  });

  it('detects repeated paraphrasing', () => {
    const signals = detectConfusionSignals(
      'cells cells cells cells are important important important because cells make cells work important',
    );
    expect(signals).toContain('repeated_paraphrasing');
  });

  it('returns no_signal for clear confident responses', () => {
    const signals = detectConfusionSignals(
      'Cells are the fundamental building blocks of all living organisms. They contain DNA and can reproduce through division.',
    );
    expect(signals).toEqual(['no_signal']);
  });
});

describe('classifyError', () => {
  it('returns none for correct non-illusory responses', () => {
    const result = classifyError({
      confusionScore: 0.1,
      confusionSignals: ['no_signal'],
      illusionOfUnderstanding: false,
      isCorrect: true,
    });
    expect(result).toBe('none');
  });

  it('classifies illusion of understanding as surface memorization', () => {
    const result = classifyError({
      confusionScore: 0.3,
      confusionSignals: ['no_signal'],
      illusionOfUnderstanding: true,
      isCorrect: true,
    });
    expect(result).toBe('memorization');
  });

  it('classifies vague high-confusion as guessing', () => {
    const result = classifyError({
      confusionScore: 0.7,
      confusionSignals: ['vague_answer'],
      illusionOfUnderstanding: false,
      isCorrect: false,
    });
    expect(result).toBe('guessing');
  });

  it('classifies filler phrases as vocabulary block', () => {
    const result = classifyError({
      confusionScore: 0.4,
      confusionSignals: ['filler_phrases'],
      illusionOfUnderstanding: false,
      isCorrect: false,
    });
    expect(result).toBe('vocabulary_block');
  });

  it('classifies moderate confusion as misconception', () => {
    const result = classifyError({
      confusionScore: 0.55,
      confusionSignals: ['no_signal'],
      illusionOfUnderstanding: false,
      isCorrect: false,
    });
    expect(result).toBe('misconception');
  });
});

describe('applyEvaluationToMastery', () => {
  it('transitions from taught to checked on correct response', () => {
    const mastery: ConceptMasteryRecord = {
      ...createInitialMastery('c-1'),
      status: 'taught',
    };
    const evaluation: ResponseEvaluation = {
      cognitiveLoad: 'low',
      confusionScore: 0.1,
      confusionSignals: ['no_signal'],
      errorClassification: 'none',
      illusionOfUnderstanding: false,
      isCorrect: true,
      reasoning: 'Good answer',
      recommendedAction: null,
      responseQuality: 'strong',
      unknownTerms: [],
    };

    const result = applyEvaluationToMastery(
      { checkType: 'paraphrase', conceptId: 'c-1', learnerResponse: 'test', mastery },
      evaluation,
    );

    expect(result.updatedMastery.status).toBe('checked');
    expect(result.updatedMastery.evidenceHistory).toHaveLength(1);
  });

  it('transitions to weak on high confusion incorrect response', () => {
    const mastery: ConceptMasteryRecord = {
      ...createInitialMastery('c-1'),
      status: 'taught',
    };
    const evaluation: ResponseEvaluation = {
      cognitiveLoad: 'high',
      confusionScore: 0.8,
      confusionSignals: ['vague_answer', 'filler_phrases'],
      errorClassification: 'misconception',
      illusionOfUnderstanding: false,
      isCorrect: false,
      reasoning: 'Student confused',
      recommendedAction: 'reteach',
      responseQuality: 'weak',
      unknownTerms: [],
    };

    const result = applyEvaluationToMastery(
      { checkType: 'paraphrase', conceptId: 'c-1', learnerResponse: 'test', mastery },
      evaluation,
    );

    expect(result.updatedMastery.status).toBe('weak');
  });

  it('transitions to mastered after sufficient diverse correct evidence', () => {
    const mastery: ConceptMasteryRecord = {
      conceptId: 'c-1',
      confusionScore: 0.1,
      evidenceHistory: [
        {
          checkType: 'paraphrase',
          conceptId: 'c-1',
          confusionScore: 0.1,
          evaluatedAt: '2026-04-14T00:00:00.000Z',
          isCorrect: true,
          questionType: 'paraphrase',
        },
      ],
      explanationTypes: ['analogy'],
      status: 'checked',
    };
    const evaluation: ResponseEvaluation = {
      cognitiveLoad: 'low',
      confusionScore: 0.05,
      confusionSignals: ['no_signal'],
      errorClassification: 'none',
      illusionOfUnderstanding: false,
      isCorrect: true,
      reasoning: 'Excellent transfer',
      recommendedAction: 'advance',
      responseQuality: 'strong',
      unknownTerms: [],
    };

    const result = applyEvaluationToMastery(
      { checkType: 'transfer_to_new_domain', conceptId: 'c-1', learnerResponse: 'test', mastery },
      evaluation,
    );

    expect(result.updatedMastery.status).toBe('mastered');
  });

  it('flags illusion of understanding as weak even if correct', () => {
    const mastery: ConceptMasteryRecord = {
      ...createInitialMastery('c-1'),
      status: 'taught',
    };
    const evaluation: ResponseEvaluation = {
      cognitiveLoad: 'moderate',
      confusionScore: 0.3,
      confusionSignals: ['correct_words_weak_reasoning'],
      errorClassification: 'memorization',
      illusionOfUnderstanding: true,
      isCorrect: true,
      reasoning: 'Correct words but cannot explain reasoning',
      recommendedAction: 'refine',
      responseQuality: 'weak',
      unknownTerms: [],
    };

    const result = applyEvaluationToMastery(
      { checkType: 'paraphrase', conceptId: 'c-1', learnerResponse: 'test', mastery },
      evaluation,
    );

    expect(result.updatedMastery.status).toBe('weak');
  });

  it('creates initial mastery when none exists', () => {
    const evaluation: ResponseEvaluation = {
      cognitiveLoad: 'low',
      confusionScore: 0.1,
      confusionSignals: ['no_signal'],
      errorClassification: 'none',
      illusionOfUnderstanding: false,
      isCorrect: true,
      reasoning: 'Good',
      recommendedAction: null,
      responseQuality: 'strong',
      unknownTerms: [],
    };

    const result = applyEvaluationToMastery(
      { checkType: 'paraphrase', conceptId: 'c-1', learnerResponse: 'test', mastery: null },
      evaluation,
    );

    // not_taught stays not_taught (needs to be taught first)
    expect(result.updatedMastery.status).toBe('not_taught');
  });
});

describe('recordExplanationAttempt', () => {
  it('transitions from not_taught to taught', () => {
    const result = recordExplanationAttempt(null, 'c-1', 'analogy');
    expect(result.status).toBe('taught');
    expect(result.explanationTypes).toEqual(['analogy']);
  });

  it('preserves existing status when already taught', () => {
    const mastery: ConceptMasteryRecord = {
      ...createInitialMastery('c-1'),
      explanationTypes: ['analogy'],
      status: 'checked',
    };
    const result = recordExplanationAttempt(mastery, 'c-1', 'worked_example');
    expect(result.status).toBe('checked');
    expect(result.explanationTypes).toEqual(['analogy', 'worked_example']);
  });
});
