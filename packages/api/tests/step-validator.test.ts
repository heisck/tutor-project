import { describe, expect, it } from 'vitest';

import {
  validateTutorStep,
  hasCheckFollowup,
} from '../src/tutor/step-validator.js';

describe('validateTutorStep', () => {
  it('rejects advance without prior check evidence', () => {
    const result = validateTutorStep({
      action: 'advance',
      hasCheckFollowup: true,
      hasPriorCheckEvidence: false,
      masteryStatus: 'taught',
    });

    expect(result.isValid).toBe(false);
    expect(result.violations[0]).toContain('requires prior check evidence');
  });

  it('rejects complete_session without prior check evidence', () => {
    const result = validateTutorStep({
      action: 'complete_session',
      hasCheckFollowup: true,
      hasPriorCheckEvidence: false,
      masteryStatus: 'taught',
    });

    expect(result.isValid).toBe(false);
  });

  it('allows advance with prior check evidence', () => {
    const result = validateTutorStep({
      action: 'advance',
      hasCheckFollowup: true,
      hasPriorCheckEvidence: true,
      masteryStatus: 'mastered',
    });

    expect(result.isValid).toBe(true);
  });

  it('rejects skip when concept is not mastered', () => {
    const result = validateTutorStep({
      action: 'skip',
      hasCheckFollowup: true,
      hasPriorCheckEvidence: false,
      masteryStatus: 'taught',
    });

    expect(result.isValid).toBe(false);
    expect(result.violations[0]).toContain('Skip action is only valid');
  });

  it('allows skip when concept is mastered', () => {
    const result = validateTutorStep({
      action: 'skip',
      hasCheckFollowup: true,
      hasPriorCheckEvidence: true,
      masteryStatus: 'mastered',
    });

    expect(result.isValid).toBe(true);
  });

  it('rejects refine without check followup', () => {
    const result = validateTutorStep({
      action: 'refine',
      hasCheckFollowup: false,
      hasPriorCheckEvidence: true,
      masteryStatus: 'partial',
    });

    expect(result.isValid).toBe(false);
    expect(result.violations[0]).toContain('must be followed by a learner-generated check');
  });

  it('allows teach without explicit check followup (implicit next turn)', () => {
    const result = validateTutorStep({
      action: 'teach',
      hasCheckFollowup: true,
      hasPriorCheckEvidence: false,
      masteryStatus: 'not_taught',
    });

    expect(result.isValid).toBe(true);
  });

  it('allows check action freely', () => {
    const result = validateTutorStep({
      action: 'check',
      hasCheckFollowup: true,
      hasPriorCheckEvidence: false,
      masteryStatus: 'taught',
    });

    expect(result.isValid).toBe(true);
  });
});

describe('hasCheckFollowup', () => {
  it('returns true for check action', () => {
    expect(hasCheckFollowup({ action: 'check', nextCheckType: null })).toBe(true);
  });

  it('returns true for advance action', () => {
    expect(hasCheckFollowup({ action: 'advance', nextCheckType: null })).toBe(true);
  });

  it('returns true for teach action (implicit followup)', () => {
    expect(hasCheckFollowup({ action: 'teach', nextCheckType: null })).toBe(true);
  });

  it('returns true for refine with nextCheckType', () => {
    expect(hasCheckFollowup({ action: 'refine', nextCheckType: 'paraphrase' })).toBe(true);
  });

  it('returns false for refine without nextCheckType', () => {
    expect(hasCheckFollowup({ action: 'refine', nextCheckType: null })).toBe(false);
  });
});
