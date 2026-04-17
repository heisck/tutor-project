import { describe, expect, it } from 'vitest';

import {
  shouldTriggerCalibration,
  buildCalibrationPromptRules,
} from '../src/tutor/calibration.js';

describe('shouldTriggerCalibration', () => {
  it('triggers for new learner with no sessions', () => {
    const result = shouldTriggerCalibration({
      recentConfusionSignals: [],
      hasLearningProfile: true,
      lastCalibratedAt: '2026-04-14T00:00:00.000Z',
      sessionCount: 0,
      averageConfusionScore: 0,
    });

    expect(result.shouldCalibrate).toBe(true);
    expect(result.reason).toBe('new_learner');
  });

  it('triggers when learning profile is missing', () => {
    const result = shouldTriggerCalibration({
      recentConfusionSignals: [],
      hasLearningProfile: false,
      lastCalibratedAt: null,
      sessionCount: 5,
      averageConfusionScore: 0.2,
    });

    expect(result.shouldCalibrate).toBe(true);
    expect(result.reason).toBe('weak_profile');
  });

  it('triggers when profile was never calibrated', () => {
    const result = shouldTriggerCalibration({
      recentConfusionSignals: [],
      hasLearningProfile: true,
      lastCalibratedAt: null,
      sessionCount: 3,
      averageConfusionScore: 0.1,
    });

    expect(result.shouldCalibrate).toBe(true);
    expect(result.reason).toBe('weak_profile');
  });

  it('triggers on repeated confusion patterns', () => {
    const result = shouldTriggerCalibration({
      recentConfusionSignals: ['filler_phrases', 'hesitation', 'vague_answer'],
      hasLearningProfile: true,
      lastCalibratedAt: '2026-04-14T00:00:00.000Z',
      sessionCount: 10,
      averageConfusionScore: 0.3,
    });

    expect(result.shouldCalibrate).toBe(true);
    expect(result.reason).toBe('repeated_confusion');
  });

  it('triggers on high average confusion score', () => {
    const result = shouldTriggerCalibration({
      recentConfusionSignals: [],
      hasLearningProfile: true,
      lastCalibratedAt: '2026-04-14T00:00:00.000Z',
      sessionCount: 5,
      averageConfusionScore: 0.7,
    });

    expect(result.shouldCalibrate).toBe(true);
    expect(result.reason).toBe('repeated_confusion');
  });

  it('does not trigger for established learner with low confusion', () => {
    const result = shouldTriggerCalibration({
      recentConfusionSignals: ['no_signal'],
      hasLearningProfile: true,
      lastCalibratedAt: '2026-04-14T00:00:00.000Z',
      sessionCount: 10,
      averageConfusionScore: 0.2,
    });

    expect(result.shouldCalibrate).toBe(false);
    expect(result.reason).toBeNull();
  });

  it('ignores no_signal when counting confusion signals', () => {
    const result = shouldTriggerCalibration({
      recentConfusionSignals: ['no_signal', 'no_signal', 'no_signal', 'no_signal'],
      hasLearningProfile: true,
      lastCalibratedAt: '2026-04-14T00:00:00.000Z',
      sessionCount: 5,
      averageConfusionScore: 0.1,
    });

    expect(result.shouldCalibrate).toBe(false);
  });
});

describe('buildCalibrationPromptRules', () => {
  it('includes safe-start rules for new learner', () => {
    const rules = buildCalibrationPromptRules('new_learner');
    expect(rules).toContain('CALIBRATION MODE');
    expect(rules).toContain('Do NOT start with a technical definition');
    expect(rules).toContain('welcoming and patient');
  });

  it('includes profile-filling rules for weak profile', () => {
    const rules = buildCalibrationPromptRules('weak_profile');
    expect(rules).toContain('profile is incomplete');
    expect(rules).toContain('vocabulary level');
  });

  it('includes extra-simple rules for repeated confusion', () => {
    const rules = buildCalibrationPromptRules('repeated_confusion');
    expect(rules).toContain('repeated confusion');
    expect(rules).toContain('lower difficulty level');
    expect(rules).toContain('extra-simple language');
  });

  it('always includes micro-concept teaching rule', () => {
    for (const reason of ['new_learner', 'weak_profile', 'repeated_confusion'] as const) {
      const rules = buildCalibrationPromptRules(reason);
      expect(rules).toContain('teaching one simple micro-concept');
    }
  });
});
