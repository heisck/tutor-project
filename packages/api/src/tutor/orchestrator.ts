import type {
  ConceptMasteryRecord,
  GroundedChunk,
  LessonSegmentRecord,
  StudySessionStateResponse,
  TutorPromptContext,
  TutorStepDecision,
} from '@ai-tutor-pwa/shared';

import type { RetrievedChunk } from '../knowledge/retrieval.js';
import {
  mapMasteryQuestionTypeToCheckType,
  selectNextTutorCheckType,
} from './check-types.js';

export class TutorOrchestrationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'TutorOrchestrationError';
  }
}

export interface TutorOrchestrationInput {
  masteryRecords: ReadonlyMap<string, ConceptMasteryRecord>;
  retrievedChunks: readonly RetrievedChunk[];
  sessionState: StudySessionStateResponse;
}

export interface TutorOrchestrationResult {
  decision: TutorStepDecision;
  promptContext: TutorPromptContext;
}

export function orchestrateTutorNextStep(
  input: TutorOrchestrationInput,
): TutorOrchestrationResult {
  const { masteryRecords, retrievedChunks, sessionState } = input;
  const { session, teachingPlan, learningProfile } = sessionState;

  const currentSegment = resolveCurrentSegment(teachingPlan.segments, session.currentSegmentId);

  if (currentSegment === null) {
    throw new TutorOrchestrationError(
      'Cannot determine next step without an active lesson segment',
    );
  }

  const mastery = masteryRecords.get(currentSegment.conceptId) ?? null;
  const decision = decideTutorAction(currentSegment, mastery, teachingPlan.segments);
  const groundedEvidence = toGroundedChunks(retrievedChunks, currentSegment.chunkIds);

  if (groundedEvidence.length === 0) {
    throw new TutorOrchestrationError(
      `No grounded evidence available for concept "${currentSegment.conceptTitle}"`,
    );
  }

  const promptContext: TutorPromptContext = {
    action: decision.action,
    calibration: {
      academicLevel: learningProfile?.academicLevel ?? 'undergraduate',
      explanationPreference: learningProfile?.explanationStartPreference ?? 'example_first',
      sessionGoal: learningProfile?.sessionGoal ?? 'deep_understanding',
    },
    conceptTitle: currentSegment.conceptTitle,
    explanationStrategy: currentSegment.explanationStrategy,
    groundedEvidence,
    masteryState: mastery,
    previousExplanationTypes: mastery?.explanationTypes ?? [],
    segmentAnalogyPrompt: currentSegment.analogyPrompt,
    segmentCheckPrompt: currentSegment.checkPrompt,
  };

  return { decision, promptContext };
}

function decideTutorAction(
  segment: LessonSegmentRecord,
  mastery: ConceptMasteryRecord | null,
  allSegments: readonly LessonSegmentRecord[],
): TutorStepDecision {
  const conceptId = segment.conceptId;
  const segmentId = segment.id;

  // No mastery record yet — this concept hasn't been taught
  if (mastery === null || mastery.status === 'not_taught') {
    return {
      action: 'teach',
      conceptId,
      nextCheckType: null,
      reasoning: `Concept "${segment.conceptTitle}" has not been taught yet`,
      segmentId,
    };
  }

  // Concept was taught but not yet checked
  if (mastery.status === 'taught') {
    const nextCheckType = selectNextTutorCheckType(mastery, segment);
    return {
      action: 'check',
      conceptId,
      nextCheckType,
      reasoning: `Concept was taught, now checking understanding with ${nextCheckType} question`,
      segmentId,
    };
  }

  // Concept is weak — needs reteach
  if (mastery.status === 'weak') {
    return {
      action: 'reteach',
      conceptId,
      nextCheckType: null,
      reasoning: `Learner shows weak understanding of "${segment.conceptTitle}", reteaching with different strategy`,
      segmentId,
    };
  }

  // Concept is partially understood — check again with different question type
  if (mastery.status === 'partial') {
    const nextCheckType = selectNextTutorCheckType(mastery, segment);
    return {
      action: 'check',
      conceptId,
      nextCheckType,
      reasoning: `Partial understanding, checking with different question type: ${nextCheckType}`,
      segmentId,
    };
  }

  // Concept was checked but needs more evidence for mastery
  if (mastery.status === 'checked') {
    const gate = segment.masteryGate;
    const hasEnoughEvidence = mastery.evidenceHistory.length >= gate.minimumChecks;
    const usedTypes = new Set(mastery.evidenceHistory.map((e) => e.checkType));
    const hasDistinctTypes = !gate.requiresDistinctQuestionTypes ||
      gate.requiredQuestionTypes.every((type) => {
        const mapped = mapMasteryQuestionTypeToCheckType(type);
        return mapped !== null && usedTypes.has(mapped);
      });

    if (hasEnoughEvidence && hasDistinctTypes && mastery.confusionScore <= gate.confusionThreshold) {
      // Ready to advance — check if there's a next segment
      const nextSegment = allSegments.find((s) => s.ordinal === segment.ordinal + 1);
      if (nextSegment !== undefined) {
        return {
          action: 'complete_segment',
          conceptId,
          nextCheckType: null,
          reasoning: `Concept "${segment.conceptTitle}" mastery gate passed, advancing to next segment`,
          segmentId,
        };
      }

      return {
        action: 'complete_session',
        conceptId,
        nextCheckType: null,
        reasoning: 'All segments processed and mastery gate passed for final concept',
        segmentId,
      };
    }

    // Need more evidence
    const nextCheckType = selectNextTutorCheckType(mastery, segment);
    return {
      action: 'check',
      conceptId,
      nextCheckType,
      reasoning: `Checked but mastery gate not yet met — needs ${gate.minimumChecks - mastery.evidenceHistory.length} more checks or different question types`,
      segmentId,
    };
  }

  // Mastered — advance to next segment
  if (mastery.status === 'mastered') {
    const nextSegment = allSegments.find((s) => s.ordinal === segment.ordinal + 1);
    if (nextSegment !== undefined) {
      return {
        action: 'complete_segment',
        conceptId,
        nextCheckType: null,
        reasoning: `Concept "${segment.conceptTitle}" is mastered, moving to next segment`,
        segmentId,
      };
    }

    return {
      action: 'complete_session',
      conceptId,
      nextCheckType: null,
      reasoning: 'Final concept mastered, session can complete',
      segmentId,
    };
  }

  // Fallback: teach
  return {
    action: 'teach',
    conceptId,
    nextCheckType: null,
    reasoning: 'Unrecognized mastery state, defaulting to teach',
    segmentId,
  };
}

function resolveCurrentSegment(
  segments: readonly LessonSegmentRecord[],
  currentSegmentId: string | null,
): LessonSegmentRecord | null {
  if (currentSegmentId === null) {
    return segments[0] ?? null;
  }

  return segments.find((s) => s.id === currentSegmentId) ?? null;
}

function toGroundedChunks(
  retrieved: readonly RetrievedChunk[],
  segmentChunkIds: readonly string[],
): GroundedChunk[] {
  const segmentChunkIdSet = new Set(segmentChunkIds);

  return retrieved
    .filter((chunk) => segmentChunkIdSet.has(chunk.id))
    .map((chunk) => ({
      content: chunk.content,
      id: chunk.id,
      score: chunk.score,
    }));
}
