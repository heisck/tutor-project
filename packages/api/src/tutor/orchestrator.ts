import type {
  ConceptMasteryRecord,
  GroundedChunk,
  LessonSegmentRecord,
  SessionExplanationType,
  StudySessionStateResponse,
  TutorModeContext,
  TutorPromptContext,
  TutorStepDecision,
} from '@ai-tutor-pwa/shared';

import type { RetrievedChunk } from '../knowledge/retrieval.js';
import {
  mapMasteryQuestionTypeToCheckType,
  selectNextTutorCheckType,
} from './check-types.js';
import { validateMasteryGate } from './mastery.js';

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
  const currentSegment = resolveCurrentSegment(
    teachingPlan.segments,
    session.currentSegmentId ?? teachingPlan.currentSegmentId,
  );

  if (currentSegment === null) {
    throw new TutorOrchestrationError(
      'Cannot determine next step without an active lesson segment',
    );
  }

  const mastery = attachExplanationHistory(
    masteryRecords.get(currentSegment.conceptId) ?? null,
    currentSegment.conceptId,
    sessionState.handoffSnapshot?.explanationHistory ?? [],
  );
  const groundedEvidence = toGroundedChunks(retrievedChunks, currentSegment.chunkIds);

  if (groundedEvidence.length === 0) {
    throw new TutorOrchestrationError(
      `No grounded evidence available for concept "${currentSegment.conceptTitle}"`,
    );
  }

  const decision = decideTutorAction(currentSegment, mastery, sessionState);
  const promptContext: TutorPromptContext = {
    action: decision.action,
    calibration: {
      academicLevel: learningProfile?.academicLevel ?? 'undergraduate',
      explanationPreference:
        learningProfile?.explanationStartPreference ?? 'example_first',
      sessionGoal: learningProfile?.sessionGoal ?? 'deep_understanding',
    },
    conceptTitle: currentSegment.conceptTitle,
    explanationStrategy: currentSegment.explanationStrategy,
    groundedEvidence,
    masteryState: mastery,
    modeContext: toTutorModeContext(sessionState, currentSegment),
    previousExplanationTypes: mastery?.explanationTypes ?? [],
    segmentAnalogyPrompt: currentSegment.analogyPrompt,
    segmentCheckPrompt: currentSegment.checkPrompt,
    unknownTermsQueue:
      sessionState.handoffSnapshot?.turnState.unknownTermsQueue ?? [],
  };

  return { decision, promptContext };
}

function decideTutorAction(
  segment: LessonSegmentRecord,
  mastery: ConceptMasteryRecord | null,
  sessionState: StudySessionStateResponse,
): TutorStepDecision {
  const conceptId = segment.conceptId;
  const segmentId = segment.id;
  const currentTurnState = sessionState.handoffSnapshot?.turnState ?? null;
  const lastErrorClassification = currentTurnState?.lastErrorClassification ?? null;
  const cognitiveLoad = currentTurnState?.currentCognitiveLoad ?? 'low';
  const responseQuality = currentTurnState?.responseQuality ?? 'adequate';

  if (mastery === null || mastery.status === 'not_taught') {
    if (
      sessionState.session.mode === 'quiz' ||
      sessionState.session.mode === 'exam'
    ) {
      return {
        action: 'check',
        conceptId,
        nextCheckType: selectInitialCheckType(segment),
        reasoning: `Mode ${sessionState.session.mode} starts with a question-first check`,
        segmentId,
      };
    }

    return {
      action: 'teach',
      conceptId,
      nextCheckType: null,
      reasoning: `Concept "${segment.conceptTitle}" has not been taught yet`,
      segmentId,
    };
  }

  if (cognitiveLoad === 'high' && mastery.status !== 'mastered') {
    return {
      action: 'simpler',
      conceptId,
      nextCheckType: null,
      reasoning: 'High cognitive load detected, so the tutor should simplify before advancing.',
      segmentId,
    };
  }

  if (mastery.status === 'weak') {
    return {
      action: 'reteach',
      conceptId,
      nextCheckType: null,
      reasoning: `Learner shows weak understanding of "${segment.conceptTitle}", so the tutor should reteach with explanation diversity.`,
      segmentId,
    };
  }

  if (
    mastery.status === 'partial' &&
    (responseQuality === 'adequate' ||
      lastErrorClassification === 'partial_understanding')
  ) {
    return {
      action: 'refine',
      conceptId,
      nextCheckType: selectNextTutorCheckType(mastery, segment),
      reasoning: 'The learner is close but incomplete, so the tutor should refine the missing piece.',
      segmentId,
    };
  }

  if (mastery.status === 'taught') {
    const nextCheckType = selectNextTutorCheckType(mastery, segment);
    return {
      action: 'check',
      conceptId,
      nextCheckType,
      reasoning: `Concept was taught, now checking understanding with a ${nextCheckType} question.`,
      segmentId,
    };
  }

  if (mastery.status === 'partial') {
    const nextCheckType = selectNextTutorCheckType(mastery, segment);
    return {
      action: 'check',
      conceptId,
      nextCheckType,
      reasoning: `Partial understanding remains, so the tutor should recheck with ${nextCheckType}.`,
      segmentId,
    };
  }

  if (mastery.status === 'checked') {
    const gateResult = validateMasteryGate(mastery, segment.masteryGate);
    if (gateResult.passed) {
      return advanceDecision(segment, sessionState.teachingPlan.segments);
    }

    if (responseQuality === 'adequate') {
      return {
        action: 'refine',
        conceptId,
        nextCheckType: selectNextTutorCheckType(mastery, segment),
        reasoning: `The learner has evidence on record but still needs ${gateResult.reason}.`,
        segmentId,
      };
    }

    const nextCheckType = selectNextTutorCheckType(mastery, segment);
    return {
      action: 'check',
      conceptId,
      nextCheckType,
      reasoning: `Checked but mastery gate not met yet: ${gateResult.reason}.`,
      segmentId,
    };
  }

  if (mastery.status === 'mastered') {
    return advanceDecision(segment, sessionState.teachingPlan.segments);
  }

  return {
    action: 'teach',
    conceptId,
    nextCheckType: null,
    reasoning: 'Unrecognized mastery state, defaulting to teach.',
    segmentId,
  };
}

function advanceDecision(
  segment: LessonSegmentRecord,
  allSegments: readonly LessonSegmentRecord[],
): TutorStepDecision {
  const nextSegment = allSegments.find((candidate) => candidate.ordinal === segment.ordinal + 1);

  if (nextSegment !== undefined) {
    return {
      action: 'advance',
      conceptId: segment.conceptId,
      nextCheckType: null,
      reasoning: `Concept "${segment.conceptTitle}" satisfied its mastery gate, so the tutor can advance.`,
      segmentId: segment.id,
    };
  }

  return {
    action: 'complete_session',
    conceptId: segment.conceptId,
    nextCheckType: null,
    reasoning: 'Final concept is complete, so the session can end.',
    segmentId: segment.id,
  };
}

function selectInitialCheckType(
  segment: LessonSegmentRecord,
) {
  for (const masteryQuestionType of segment.checkTypeBias) {
    const mappedCheckType = mapMasteryQuestionTypeToCheckType(masteryQuestionType);
    if (mappedCheckType !== null) {
      return mappedCheckType;
    }
  }

  return mapMasteryQuestionTypeToCheckType(
    segment.masteryGate.requiredQuestionTypes[0] ?? 'explanation',
  );
}

function attachExplanationHistory(
  mastery: ConceptMasteryRecord | null,
  conceptId: string,
  explanationHistory: ReadonlyArray<{
    conceptId: string;
    explanationType: SessionExplanationType;
  }>,
): ConceptMasteryRecord | null {
  if (mastery === null) {
    return null;
  }

  if (mastery.explanationTypes.length > 0) {
    return mastery;
  }

  return {
    ...mastery,
    explanationTypes: explanationHistory
      .filter((entry) => entry.conceptId === conceptId)
      .map((entry) => entry.explanationType),
  };
}

function resolveCurrentSegment(
  segments: readonly LessonSegmentRecord[],
  currentSegmentId: string | null,
): LessonSegmentRecord | null {
  if (currentSegmentId === null) {
    return segments[0] ?? null;
  }

  return segments.find((segment) => segment.id === currentSegmentId) ?? null;
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

function toTutorModeContext(
  sessionState: StudySessionStateResponse,
  currentSegment: LessonSegmentRecord,
): TutorModeContext {
  return {
    activeMode: sessionState.modeContext.activeMode,
    checkTypeBias: currentSegment.checkTypeBias,
    currentSelectionReason: currentSegment.selectionReason,
    degradedReason: sessionState.modeContext.degradedReason,
    queueCursor: sessionState.modeContext.queueCursor,
    queueSize: sessionState.modeContext.queueSize,
    reviewPriority: currentSegment.reviewPriority,
  };
}
