import { describe, expect, it } from 'vitest';

import {
  getRequiredActionForError,
  validateActionForError,
} from '../src/tutor/error-action-map.js';

describe('getRequiredActionForError', () => {
  it('maps misconception to reteach', () => {
    const result = getRequiredActionForError('misconception');
    expect(result.action).toBe('reteach');
    expect(result.description).toContain('contrast');
  });

  it('maps partial_understanding to refine', () => {
    const result = getRequiredActionForError('partial_understanding');
    expect(result.action).toBe('refine');
    expect(result.description).toContain('missing link');
  });

  it('maps memorization to check', () => {
    const result = getRequiredActionForError('memorization');
    expect(result.action).toBe('check');
    expect(result.description).toContain('deeper why/how');
  });

  it('maps careless_mistake to check', () => {
    const result = getRequiredActionForError('careless_mistake');
    expect(result.action).toBe('check');
  });

  it('maps guessing to reteach', () => {
    const result = getRequiredActionForError('guessing');
    expect(result.action).toBe('reteach');
    expect(result.description).toContain('reasoning');
  });

  it('maps vocabulary_block to simpler', () => {
    const result = getRequiredActionForError('vocabulary_block');
    expect(result.action).toBe('simpler');
    expect(result.description).toContain('simplify wording');
  });

  it('maps none to advance', () => {
    const result = getRequiredActionForError('none');
    expect(result.action).toBe('advance');
  });
});

describe('validateActionForError', () => {
  it('returns null when action matches required', () => {
    expect(validateActionForError('reteach', 'misconception')).toBeNull();
    expect(validateActionForError('refine', 'partial_understanding')).toBeNull();
    expect(validateActionForError('check', 'memorization')).toBeNull();
    expect(validateActionForError('simpler', 'vocabulary_block')).toBeNull();
  });

  it('returns null for none classification', () => {
    expect(validateActionForError('advance', 'none')).toBeNull();
    expect(validateActionForError('check', 'none')).toBeNull();
  });

  it('allows simpler as a valid alternative for any error', () => {
    expect(validateActionForError('simpler', 'misconception')).toBeNull();
    expect(validateActionForError('simpler', 'partial_understanding')).toBeNull();
    expect(validateActionForError('simpler', 'guessing')).toBeNull();
  });

  it('allows reteach as a superset of refine', () => {
    expect(validateActionForError('reteach', 'partial_understanding')).toBeNull();
  });

  it('allows reteach as a superset of check for memorization', () => {
    expect(validateActionForError('reteach', 'memorization')).toBeNull();
  });

  it('allows reteach as a superset of check for careless_mistake', () => {
    expect(validateActionForError('reteach', 'careless_mistake')).toBeNull();
  });

  it('rejects advance when misconception exists', () => {
    const result = validateActionForError('advance', 'misconception');
    expect(result).not.toBeNull();
    expect(result!.correctedAction).toBe('reteach');
  });

  it('rejects teach when guessing was detected', () => {
    const result = validateActionForError('teach', 'guessing');
    expect(result).not.toBeNull();
    expect(result!.correctedAction).toBe('reteach');
  });

  it('rejects advance when vocabulary_block exists', () => {
    const result = validateActionForError('advance', 'vocabulary_block');
    expect(result).not.toBeNull();
    expect(result!.correctedAction).toBe('simpler');
  });

  it('rejects check when vocabulary_block exists (should simplify first)', () => {
    const result = validateActionForError('check', 'vocabulary_block');
    expect(result).not.toBeNull();
    expect(result!.correctedAction).toBe('simpler');
  });
});
