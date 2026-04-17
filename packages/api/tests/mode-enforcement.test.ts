import { describe, expect, it } from 'vitest';

import {
  getModeRuntimeBehavior,
  buildModePromptRules,
  validateActionForMode,
} from '../src/tutor/mode-enforcement.js';

describe('getModeRuntimeBehavior', () => {
  const modes = [
    'full', 'quiz', 'exam', 'revision', 'difficult_parts',
    'flashcards', 'summary', 'images', 'voice',
  ] as const;

  it('returns distinct behavior for each mode', () => {
    const behaviors = modes.map((mode) => getModeRuntimeBehavior(mode));

    // Each mode must produce at least one unique prompt rule
    const promptRuleSets = behaviors.map((b) => b.promptRules.join('|'));
    const uniqueRuleSets = new Set(promptRuleSets);
    expect(uniqueRuleSets.size).toBe(modes.length);
  });

  it('full mode uses full explanation length', () => {
    const behavior = getModeRuntimeBehavior('full');
    expect(behavior.explanationLengthHint).toBe('full');
    expect(behavior.difficultyProgression).toBe('moderate');
  });

  it('quiz mode uses short explanation length', () => {
    const behavior = getModeRuntimeBehavior('quiz');
    expect(behavior.explanationLengthHint).toBe('short');
    expect(behavior.promptRules[0]).toContain('Question-first');
  });

  it('exam mode uses aggressive difficulty progression', () => {
    const behavior = getModeRuntimeBehavior('exam');
    expect(behavior.difficultyProgression).toBe('aggressive');
    expect(behavior.errorTolerance).toBe('strict');
  });

  it('revision mode uses conservative difficulty progression', () => {
    const behavior = getModeRuntimeBehavior('revision');
    expect(behavior.difficultyProgression).toBe('conservative');
    expect(behavior.promptRules[0]).toContain('Retrieval-first');
  });

  it('difficult_parts mode uses recovery-ladder approach', () => {
    const behavior = getModeRuntimeBehavior('difficult_parts');
    expect(behavior.promptRules.some((r) => r.includes('Recovery-ladder'))).toBe(true);
    expect(behavior.errorTolerance).toBe('lenient');
  });
});

describe('buildModePromptRules', () => {
  it('includes mode name in output', () => {
    const rules = buildModePromptRules('exam');
    expect(rules).toContain('Mode: exam');
  });

  it('includes difficulty and error tolerance', () => {
    const rules = buildModePromptRules('full');
    expect(rules).toContain('Explanation length: full');
    expect(rules).toContain('Difficulty progression: moderate');
    expect(rules).toContain('Error tolerance: moderate');
  });

  it('produces different output for different modes', () => {
    const fullRules = buildModePromptRules('full');
    const quizRules = buildModePromptRules('quiz');
    const examRules = buildModePromptRules('exam');

    expect(fullRules).not.toBe(quizRules);
    expect(quizRules).not.toBe(examRules);
    expect(fullRules).not.toBe(examRules);
  });
});

describe('validateActionForMode', () => {
  it('corrects teach to check in quiz mode for untaught concepts', () => {
    const result = validateActionForMode('teach', 'quiz', 'not_taught');
    expect(result).not.toBeNull();
    expect(result!.correctedAction).toBe('check');
    expect(result!.reason).toContain('question-first');
  });

  it('allows check in quiz mode', () => {
    expect(validateActionForMode('check', 'quiz', 'not_taught')).toBeNull();
  });

  it('corrects teach to check in revision mode for taught concepts', () => {
    const result = validateActionForMode('teach', 'revision', 'taught');
    expect(result).not.toBeNull();
    expect(result!.correctedAction).toBe('check');
    expect(result!.reason).toContain('retrieval-first');
  });

  it('allows teach in revision mode for untaught concepts', () => {
    expect(validateActionForMode('teach', 'revision', 'not_taught')).toBeNull();
  });

  it('allows teach in full mode', () => {
    expect(validateActionForMode('teach', 'full', 'not_taught')).toBeNull();
  });

  it('allows any action in exam mode', () => {
    expect(validateActionForMode('teach', 'exam', 'not_taught')).toBeNull();
    expect(validateActionForMode('check', 'exam', 'taught')).toBeNull();
  });
});
