import { describe, expect, it } from 'vitest';

import {
  validateProviderIntegrity,
  applyDegradedEvaluationGuard,
  checkSystemCompleteness,
} from '../src/lib/provider-integrity.js';

describe('validateProviderIntegrity', () => {
  it('passes with current configuration (Claude for core, OpenAI for voice/embedding)', () => {
    const report = validateProviderIntegrity();
    expect(report.passed).toBe(true);
    expect(report.violations).toHaveLength(0);
  });

  it('validates all call types are classified', () => {
    // This test ensures new call types get classified
    const report = validateProviderIntegrity();
    expect(report.violations.filter((v) => v.reason.includes('not classified'))).toHaveLength(0);
  });
});

describe('applyDegradedEvaluationGuard', () => {
  it('allows mastery when evaluation is not degraded', () => {
    const guard = applyDegradedEvaluationGuard(null);
    expect(guard.allowMastery).toBe(true);
    expect(guard.maxMasteryStatus).toBe('mastered');
    expect(guard.reason).toBeNull();
  });

  it('blocks mastery when evaluation is degraded', () => {
    const guard = applyDegradedEvaluationGuard('Tutor evaluation fallback: timeout');
    expect(guard.allowMastery).toBe(false);
    expect(guard.maxMasteryStatus).toBe('checked');
    expect(guard.reason).toContain('Degraded evaluation cannot award mastery');
  });

  it('blocks mastery for heuristic fallback', () => {
    const guard = applyDegradedEvaluationGuard(
      'Tutor evaluation fallback: provider output could not be parsed',
    );
    expect(guard.allowMastery).toBe(false);
    expect(guard.maxMasteryStatus).toBe('checked');
  });

  it('blocks mastery for deterministic fallback mode', () => {
    const guard = applyDegradedEvaluationGuard(
      'Tutor evaluation is running in deterministic fallback mode.',
    );
    expect(guard.allowMastery).toBe(false);
  });
});

describe('checkSystemCompleteness', () => {
  it('reports no incomplete paths for current configuration', () => {
    const incomplete = checkSystemCompleteness();
    expect(incomplete).toHaveLength(0);
  });
});
