import { describe, expect, it } from 'vitest';

import type { ConceptMasteryRecord, LessonSegmentRecord } from '@ai-tutor-pwa/shared';

import { createInitialMastery } from '../src/tutor/evaluation.js';
import {
  auditSessionCoverage,
  buildCrossConceptLinks,
  buildSessionEndSummary,
  compressLearningState,
  shouldBlockCompletion,
  shouldCompressMemory,
} from '../src/tutor/coverage-audit.js';

function createSegment(overrides: Partial<LessonSegmentRecord> = {}): LessonSegmentRecord {
  return {
    analogyPrompt: 'test',
    atuIds: ['atu-1'],
    checkPrompt: 'test',
    chunkIds: ['chunk-1'],
    conceptDescription: 'test',
    conceptId: 'c-1',
    conceptTitle: 'Cells',
    coverageSummary: { assessed: 0, inProgress: 0, notTaught: 1, taught: 0 },
    explanationStrategy: 'example_first',
    id: 'seg-1',
    masteryGate: {
      confusionThreshold: 0.4,
      minimumChecks: 2,
      requiredQuestionTypes: ['explanation', 'transfer'],
      requiresDistinctQuestionTypes: true,
    },
    ordinal: 0,
    prerequisiteConceptIds: [],
    sectionId: null,
    sourceOrdinal: 0,
    sourceUnitIds: ['su-1'],
    studySessionId: 'session-1',
    ...overrides,
  };
}

describe('auditSessionCoverage', () => {
  it('reports all concepts unresolved when none are mastered', () => {
    const segments = [
      createSegment({ conceptId: 'c-1' }),
      createSegment({ conceptId: 'c-2', id: 'seg-2', ordinal: 1 }),
    ];
    const mastery = new Map<string, ConceptMasteryRecord>();

    const result = auditSessionCoverage(segments, mastery);

    expect(result.canComplete).toBe(false);
    expect(result.totalConcepts).toBe(2);
    expect(result.unresolvedConceptIds).toHaveLength(2);
  });

  it('allows completion when all concepts are mastered', () => {
    const segments = [
      createSegment({ conceptId: 'c-1' }),
      createSegment({ conceptId: 'c-2', id: 'seg-2', ordinal: 1 }),
    ];
    const mastery = new Map<string, ConceptMasteryRecord>([
      ['c-1', { ...createInitialMastery('c-1'), status: 'mastered' }],
      ['c-2', { ...createInitialMastery('c-2'), status: 'mastered' }],
    ]);

    const result = auditSessionCoverage(segments, mastery);

    expect(result.canComplete).toBe(true);
    expect(result.masteredCount).toBe(2);
    expect(result.unresolvedConceptIds).toHaveLength(0);
  });

  it('blocks completion with weak concepts', () => {
    const segments = [createSegment({ conceptId: 'c-1' })];
    const mastery = new Map<string, ConceptMasteryRecord>([
      ['c-1', { ...createInitialMastery('c-1'), status: 'weak' }],
    ]);

    const result = auditSessionCoverage(segments, mastery);

    expect(result.canComplete).toBe(false);
    expect(result.weakCount).toBe(1);
  });

  it('counts partial and taught correctly', () => {
    const segments = [
      createSegment({ conceptId: 'c-1' }),
      createSegment({ conceptId: 'c-2', id: 'seg-2', ordinal: 1 }),
      createSegment({ conceptId: 'c-3', id: 'seg-3', ordinal: 2 }),
    ];
    const mastery = new Map<string, ConceptMasteryRecord>([
      ['c-1', { ...createInitialMastery('c-1'), status: 'mastered' }],
      ['c-2', { ...createInitialMastery('c-2'), status: 'partial' }],
      ['c-3', { ...createInitialMastery('c-3'), status: 'taught' }],
    ]);

    const result = auditSessionCoverage(segments, mastery);

    expect(result.masteredCount).toBe(1);
    expect(result.partialCount).toBe(1);
    expect(result.taughtCount).toBe(1);
    expect(result.canComplete).toBe(false);
  });
});

describe('shouldBlockCompletion', () => {
  it('blocks when there are unresolved concepts', () => {
    const result = shouldBlockCompletion({
      canComplete: false,
      masteredCount: 1,
      partialCount: 1,
      taughtCount: 0,
      totalConcepts: 2,
      unresolvedConceptIds: ['c-2'],
      weakCount: 0,
    });

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('1 concept(s) still unresolved');
  });

  it('allows completion when all mastered', () => {
    const result = shouldBlockCompletion({
      canComplete: true,
      masteredCount: 3,
      partialCount: 0,
      taughtCount: 0,
      totalConcepts: 3,
      unresolvedConceptIds: [],
      weakCount: 0,
    });

    expect(result.blocked).toBe(false);
  });
});

describe('buildCrossConceptLinks', () => {
  it('links to mastered prerequisite concepts', () => {
    const segment2 = createSegment({
      conceptId: 'c-2',
      conceptTitle: 'Mitosis',
      id: 'seg-2',
      ordinal: 1,
      prerequisiteConceptIds: ['c-1'],
    });
    const segment1 = createSegment({
      conceptId: 'c-1',
      conceptTitle: 'Cells',
      id: 'seg-1',
      ordinal: 0,
    });
    const mastery = new Map<string, ConceptMasteryRecord>([
      ['c-1', { ...createInitialMastery('c-1'), status: 'mastered' }],
    ]);

    const links = buildCrossConceptLinks(segment2, mastery, [segment1, segment2]);

    expect(links).toHaveLength(1);
    expect(links[0]).toContain('Cells');
    expect(links[0]).toContain('Mitosis');
  });

  it('returns empty when no mastered prerequisites', () => {
    const segment = createSegment({ prerequisiteConceptIds: ['c-99'] });
    const mastery = new Map<string, ConceptMasteryRecord>();

    const links = buildCrossConceptLinks(segment, mastery, [segment]);
    expect(links).toHaveLength(0);
  });
});

describe('shouldCompressMemory', () => {
  it('compresses at intervals of 5', () => {
    expect(shouldCompressMemory(0)).toBe(false);
    expect(shouldCompressMemory(4)).toBe(false);
    expect(shouldCompressMemory(5)).toBe(true);
    expect(shouldCompressMemory(10)).toBe(true);
  });
});

describe('compressLearningState', () => {
  it('summarizes mastered and weak concepts', () => {
    const segments = [
      createSegment({ conceptId: 'c-1', conceptTitle: 'Cells' }),
      createSegment({
        conceptId: 'c-2',
        conceptTitle: 'Mitosis',
        id: 'seg-2',
        ordinal: 1,
      }),
    ];
    const mastery = new Map<string, ConceptMasteryRecord>([
      ['c-1', { ...createInitialMastery('c-1'), status: 'mastered' }],
      ['c-2', { ...createInitialMastery('c-2'), status: 'weak' }],
    ]);

    const result = compressLearningState(segments, mastery);

    expect(result.masteredConcepts).toContain('Cells');
    expect(result.weakConcepts).toContain('Mitosis');
    expect(result.summary).toContain('Mastered');
    expect(result.summary).toContain('Needs review');
  });
});

describe('buildSessionEndSummary', () => {
  it('provides accurate readiness estimate', () => {
    const segments = [
      createSegment({ conceptId: 'c-1', conceptTitle: 'Cells' }),
      createSegment({
        conceptId: 'c-2',
        conceptTitle: 'Mitosis',
        id: 'seg-2',
        ordinal: 1,
      }),
    ];
    const mastery = new Map<string, ConceptMasteryRecord>([
      ['c-1', { ...createInitialMastery('c-1'), status: 'mastered' }],
      ['c-2', { ...createInitialMastery('c-2'), status: 'mastered' }],
    ]);

    const audit = auditSessionCoverage(segments, mastery);
    const summary = buildSessionEndSummary(audit, segments, mastery);

    expect(summary.masteredTopics).toEqual(['Cells', 'Mitosis']);
    expect(summary.shakyTopics).toHaveLength(0);
    expect(summary.readinessEstimate).toContain('Strong understanding');
  });
});
