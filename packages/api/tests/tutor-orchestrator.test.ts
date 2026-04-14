import { describe, expect, it } from 'vitest';

import type {
  ConceptMasteryRecord,
  LessonSegmentRecord,
  StudySessionStateResponse,
  TutorAction,
} from '@ai-tutor-pwa/shared';

import { orchestrateTutorNextStep, TutorOrchestrationError } from '../src/tutor/orchestrator.js';

function createTestSegment(overrides: Partial<LessonSegmentRecord> = {}): LessonSegmentRecord {
  return {
    analogyPrompt: 'Ground cells in an everyday example',
    atuIds: ['atu-1'],
    checkPrompt: 'Explain cells in your own words',
    chunkIds: ['chunk-1'],
    conceptDescription: 'What a cell is',
    conceptId: 'concept-1',
    conceptTitle: 'Cells',
    coverageSummary: { assessed: 0, inProgress: 0, notTaught: 1, taught: 0 },
    explanationStrategy: 'example_first',
    id: 'segment-1',
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

function createTestSessionState(
  segments: LessonSegmentRecord[],
  currentSegmentId: string | null = null,
): StudySessionStateResponse {
  return {
    handoffSnapshot: null,
    learningProfile: {
      academicLevel: 'undergraduate',
      explanationStartPreference: 'example_first',
      lastCalibratedAt: null,
      sessionGoal: 'deep_understanding',
    },
    session: {
      createdAt: '2026-04-14T00:00:00.000Z',
      currentSectionId: null,
      currentSegmentId: currentSegmentId ?? segments[0]?.id ?? null,
      currentStep: 0,
      documentId: 'doc-1',
      frustrationFlagCount: 0,
      id: 'session-1',
      lastActiveAt: null,
      mode: 'full',
      motivationState: 'neutral',
      startedAt: '2026-04-14T00:00:00.000Z',
      status: 'active',
      updatedAt: '2026-04-14T00:00:00.000Z',
    },
    teachingPlan: {
      currentSegmentId: currentSegmentId ?? segments[0]?.id ?? null,
      segments,
      sessionId: 'session-1',
    },
  };
}

function createTestChunk(id: string) {
  return {
    content: 'Cells are the basic unit of life.',
    documentId: 'doc-1',
    id,
    ordinal: 0,
    score: 0.95,
    sourceTrace: {},
    sourceUnitId: 'su-1',
    tokenCount: 10,
  };
}

describe('orchestrateTutorNextStep', () => {
  it('decides to teach when concept has no mastery record', () => {
    const segment = createTestSegment();
    const state = createTestSessionState([segment]);

    const result = orchestrateTutorNextStep({
      masteryRecords: new Map(),
      retrievedChunks: [createTestChunk('chunk-1')],
      sessionState: state,
    });

    expect(result.decision.action).toBe('teach');
    expect(result.decision.conceptId).toBe('concept-1');
    expect(result.promptContext.action).toBe('teach');
    expect(result.promptContext.groundedEvidence.length).toBeGreaterThan(0);
  });

  it('decides to check when concept status is taught', () => {
    const segment = createTestSegment();
    const state = createTestSessionState([segment]);
    const mastery: ConceptMasteryRecord = {
      conceptId: 'concept-1',
      confusionScore: 0,
      evidenceHistory: [],
      explanationTypes: ['analogy'],
      status: 'taught',
    };

    const result = orchestrateTutorNextStep({
      masteryRecords: new Map([['concept-1', mastery]]),
      retrievedChunks: [createTestChunk('chunk-1')],
      sessionState: state,
    });

    expect(result.decision.action).toBe('check');
    expect(result.decision.nextCheckType).not.toBeNull();
  });

  it('decides to reteach when concept is weak', () => {
    const segment = createTestSegment();
    const state = createTestSessionState([segment]);
    const mastery: ConceptMasteryRecord = {
      conceptId: 'concept-1',
      confusionScore: 0.7,
      evidenceHistory: [
        {
          checkType: 'paraphrase',
          conceptId: 'concept-1',
          confusionScore: 0.7,
          evaluatedAt: '2026-04-14T00:00:00.000Z',
          isCorrect: false,
          questionType: 'paraphrase',
        },
      ],
      explanationTypes: ['analogy'],
      status: 'weak',
    };

    const result = orchestrateTutorNextStep({
      masteryRecords: new Map([['concept-1', mastery]]),
      retrievedChunks: [createTestChunk('chunk-1')],
      sessionState: state,
    });

    expect(result.decision.action).toBe('reteach');
  });

  it('decides to complete segment when mastery gate passes and next segment exists', () => {
    const segment1 = createTestSegment({ id: 'segment-1', ordinal: 0 });
    const segment2 = createTestSegment({
      conceptId: 'concept-2',
      conceptTitle: 'Mitosis',
      id: 'segment-2',
      ordinal: 1,
    });
    const state = createTestSessionState([segment1, segment2], 'segment-1');
    const mastery: ConceptMasteryRecord = {
      conceptId: 'concept-1',
      confusionScore: 0.1,
      evidenceHistory: [
        {
          checkType: 'paraphrase',
          conceptId: 'concept-1',
          confusionScore: 0.1,
          evaluatedAt: '2026-04-14T00:00:00.000Z',
          isCorrect: true,
          questionType: 'paraphrase',
        },
        {
          checkType: 'transfer_to_new_domain',
          conceptId: 'concept-1',
          confusionScore: 0.05,
          evaluatedAt: '2026-04-14T00:01:00.000Z',
          isCorrect: true,
          questionType: 'transfer_to_new_domain',
        },
      ],
      explanationTypes: ['analogy'],
      status: 'checked',
    };

    const result = orchestrateTutorNextStep({
      masteryRecords: new Map([['concept-1', mastery]]),
      retrievedChunks: [createTestChunk('chunk-1')],
      sessionState: state,
    });

    expect(result.decision.action).toBe('complete_segment');
  });

  it('decides to complete session when mastered and no next segment', () => {
    const segment = createTestSegment();
    const state = createTestSessionState([segment]);
    const mastery: ConceptMasteryRecord = {
      conceptId: 'concept-1',
      confusionScore: 0.1,
      evidenceHistory: [],
      explanationTypes: ['analogy'],
      status: 'mastered',
    };

    const result = orchestrateTutorNextStep({
      masteryRecords: new Map([['concept-1', mastery]]),
      retrievedChunks: [createTestChunk('chunk-1')],
      sessionState: state,
    });

    expect(result.decision.action).toBe('complete_session');
  });

  it('throws when no grounded evidence is available', () => {
    const segment = createTestSegment();
    const state = createTestSessionState([segment]);

    expect(() =>
      orchestrateTutorNextStep({
        masteryRecords: new Map(),
        retrievedChunks: [],
        sessionState: state,
      }),
    ).toThrow(TutorOrchestrationError);
  });

  it('throws when no active segment exists', () => {
    const state = createTestSessionState([], null);
    state.session.currentSegmentId = null;
    state.teachingPlan.currentSegmentId = null;

    expect(() =>
      orchestrateTutorNextStep({
        masteryRecords: new Map(),
        retrievedChunks: [createTestChunk('chunk-1')],
        sessionState: state,
      }),
    ).toThrow(TutorOrchestrationError);
  });

  it('includes grounded evidence in prompt context filtered by segment chunk IDs', () => {
    const segment = createTestSegment({ chunkIds: ['chunk-1'] });
    const state = createTestSessionState([segment]);

    const result = orchestrateTutorNextStep({
      masteryRecords: new Map(),
      retrievedChunks: [
        createTestChunk('chunk-1'),
        createTestChunk('chunk-other'),
      ],
      sessionState: state,
    });

    expect(result.promptContext.groundedEvidence).toHaveLength(1);
    expect(result.promptContext.groundedEvidence[0]!.id).toBe('chunk-1');
  });

  it('rotates check question types using unused types first', () => {
    const segment = createTestSegment();
    const state = createTestSessionState([segment]);
    const mastery: ConceptMasteryRecord = {
      conceptId: 'concept-1',
      confusionScore: 0.2,
      evidenceHistory: [
        {
          checkType: 'paraphrase',
          conceptId: 'concept-1',
          confusionScore: 0.2,
          evaluatedAt: '2026-04-14T00:00:00.000Z',
          isCorrect: true,
          questionType: 'paraphrase',
        },
      ],
      explanationTypes: ['analogy'],
      status: 'checked',
    };

    const result = orchestrateTutorNextStep({
      masteryRecords: new Map([['concept-1', mastery]]),
      retrievedChunks: [createTestChunk('chunk-1')],
      sessionState: state,
    });

    // Should pick transfer_to_new_domain (mapped from 'transfer') since paraphrase was used
    expect(result.decision.action).toBe('check');
    expect(result.decision.nextCheckType).toBe('transfer_to_new_domain');
  });
});
