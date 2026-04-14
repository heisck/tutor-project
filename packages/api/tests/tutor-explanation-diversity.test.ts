import { describe, expect, it } from 'vitest';

import type { ConceptMasteryRecord, ExplanationAttempt } from '@ai-tutor-pwa/shared';

import { createInitialMastery } from '../src/tutor/evaluation.js';
import {
  createDiversityState,
  selectNextExplanationType,
  selectRecoveryAction,
  shouldThrottlePacing,
  updateDiversityState,
} from '../src/tutor/explanation-diversity.js';

describe('selectNextExplanationType', () => {
  it('selects first available type when no prior attempts', () => {
    const type = selectNextExplanationType(null, [], 'c-1');
    expect(type).toBe('analogy');
  });

  it('avoids already-used types', () => {
    const attempts: ExplanationAttempt[] = [
      {
        conceptId: 'c-1',
        explanationType: 'analogy',
        outcome: 'successful',
        usedAt: '2026-04-14T00:00:00.000Z',
      },
    ];

    const type = selectNextExplanationType(null, attempts, 'c-1');
    expect(type).toBe('concrete_example');
  });

  it('avoids failed types first', () => {
    const attempts: ExplanationAttempt[] = [
      {
        conceptId: 'c-1',
        explanationType: 'analogy',
        outcome: 'failed',
        usedAt: '2026-04-14T00:00:00.000Z',
      },
      {
        conceptId: 'c-1',
        explanationType: 'concrete_example',
        outcome: 'failed',
        usedAt: '2026-04-14T00:01:00.000Z',
      },
    ];

    const type = selectNextExplanationType(null, attempts, 'c-1');
    expect(type).toBe('worked_example');
  });

  it('ignores attempts for other concepts', () => {
    const attempts: ExplanationAttempt[] = [
      {
        conceptId: 'c-other',
        explanationType: 'analogy',
        outcome: 'successful',
        usedAt: '2026-04-14T00:00:00.000Z',
      },
    ];

    const type = selectNextExplanationType(null, attempts, 'c-1');
    expect(type).toBe('analogy');
  });
});

describe('selectRecoveryAction', () => {
  it('starts with reteach', () => {
    expect(selectRecoveryAction(0)).toBe('reteach');
  });

  it('escalates to simpler', () => {
    expect(selectRecoveryAction(2)).toBe('simpler');
  });

  it('eventually reaches skip', () => {
    expect(selectRecoveryAction(6)).toBe('skip');
  });

  it('clamps at max', () => {
    expect(selectRecoveryAction(100)).toBe('skip');
  });
});

describe('shouldThrottlePacing', () => {
  it('throttles when confusion is high', () => {
    const mastery: ConceptMasteryRecord = {
      ...createInitialMastery('c-1'),
      confusionScore: 0.7,
    };
    expect(shouldThrottlePacing(mastery, 0)).toBe(true);
  });

  it('does not throttle with low confusion and few evaluations', () => {
    const mastery: ConceptMasteryRecord = {
      ...createInitialMastery('c-1'),
      confusionScore: 0.1,
    };
    expect(shouldThrottlePacing(mastery, 0)).toBe(false);
  });

  it('throttles when too many consecutive evaluations', () => {
    const mastery: ConceptMasteryRecord = {
      ...createInitialMastery('c-1'),
      confusionScore: 0.2,
    };
    expect(shouldThrottlePacing(mastery, 4)).toBe(true);
  });

  it('returns false when no mastery', () => {
    expect(shouldThrottlePacing(null, 5)).toBe(false);
  });
});

describe('diversityState', () => {
  it('tracks consecutive failures', () => {
    let state = createDiversityState();

    state = updateDiversityState(state, {
      conceptId: 'c-1',
      explanationType: 'analogy',
      outcome: 'failed',
      usedAt: '2026-04-14T00:00:00.000Z',
    });
    expect(state.consecutiveFailures).toBe(1);

    state = updateDiversityState(state, {
      conceptId: 'c-1',
      explanationType: 'concrete_example',
      outcome: 'failed',
      usedAt: '2026-04-14T00:01:00.000Z',
    });
    expect(state.consecutiveFailures).toBe(2);

    state = updateDiversityState(state, {
      conceptId: 'c-1',
      explanationType: 'worked_example',
      outcome: 'successful',
      usedAt: '2026-04-14T00:02:00.000Z',
    });
    expect(state.consecutiveFailures).toBe(0);
  });
});
