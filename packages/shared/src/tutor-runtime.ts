import { z } from 'zod';

import {
  cognitiveLoadSchema,
  confusionSignalSchema,
  errorClassificationSchema,
  responseQualitySchema,
  sessionExplanationOutcomeSchema,
  sessionExplanationTypeSchema,
  sessionMasteryStatusSchema,
  tutorActionSchema,
} from './session-handoff.js';
import {
  lessonSegmentSelectionReasonSchema,
  masteryQuestionTypeSchema,
} from './lesson-plan.js';
import { STUDY_SESSION_MODES } from './sessions.js';

export { tutorActionSchema };
type TutorAction = z.infer<typeof tutorActionSchema>;

export const learnerResponseSchema = z
  .object({
    content: z.string().trim().min(1, 'Response content is required'),
    segmentId: z.string().min(1),
    sessionId: z.string().min(1),
  })
  .strict();
export type LearnerResponse = z.infer<typeof learnerResponseSchema>;

export { errorClassificationSchema };
type ErrorClassification = z.infer<typeof errorClassificationSchema>;

export { confusionSignalSchema };
type ConfusionSignal = z.infer<typeof confusionSignalSchema>;

export const responseEvaluationSchema = z.object({
  cognitiveLoad: cognitiveLoadSchema,
  confusionScore: z.number().min(0).max(1),
  confusionSignals: z.array(confusionSignalSchema),
  errorClassification: errorClassificationSchema,
  illusionOfUnderstanding: z.boolean(),
  isCorrect: z.boolean(),
  reasoning: z.string().min(1),
  recommendedAction: tutorActionSchema.nullable(),
  responseQuality: responseQualitySchema,
  unknownTerms: z.array(z.string().trim().min(1)),
});
export type ResponseEvaluation = z.infer<typeof responseEvaluationSchema>;

export const checkQuestionTypeSchema = z.enum([
  'recall',
  'paraphrase',
  'compare_and_contrast',
  'apply_to_new_case',
  'transfer_to_new_domain',
  'error_spotting',
  'sequence_the_steps',
  'cause_effect_reasoning',
  'prerequisite_link',
  'compression',
  'reverse_reasoning',
  'boundary_case',
]);
export type CheckQuestionType = z.infer<typeof checkQuestionTypeSchema>;

export const masteryEvidenceSchema = z.object({
  checkType: checkQuestionTypeSchema,
  conceptId: z.string().min(1),
  confusionScore: z.number().min(0).max(1),
  evaluatedAt: z.string().datetime({ offset: true }),
  isCorrect: z.boolean(),
  questionType: z.string().min(1),
});
export type MasteryEvidence = z.infer<typeof masteryEvidenceSchema>;

export const conceptMasteryRecordSchema = z.object({
  conceptId: z.string().min(1),
  confusionScore: z.number().min(0).max(1),
  evidenceHistory: z.array(masteryEvidenceSchema),
  explanationTypes: z.array(sessionExplanationTypeSchema),
  status: sessionMasteryStatusSchema,
});
export type ConceptMasteryRecord = z.infer<typeof conceptMasteryRecordSchema>;

export const tutorStepDecisionSchema = z.object({
  action: tutorActionSchema,
  conceptId: z.string().min(1),
  nextCheckType: checkQuestionTypeSchema.nullable(),
  reasoning: z.string().min(1),
  segmentId: z.string().min(1),
});
export type TutorStepDecision = z.infer<typeof tutorStepDecisionSchema>;

export const groundedChunkSchema = z.object({
  content: z.string().min(1),
  id: z.string().min(1),
  score: z.number(),
});
export type GroundedChunk = z.infer<typeof groundedChunkSchema>;

export const tutorModeContextSchema = z.object({
  activeMode: z.enum(STUDY_SESSION_MODES),
  checkTypeBias: z.array(masteryQuestionTypeSchema),
  currentSelectionReason: lessonSegmentSelectionReasonSchema,
  degradedReason: z.string().trim().min(1).nullable(),
  queueCursor: z.number().int().nonnegative(),
  queueSize: z.number().int().nonnegative(),
  reviewPriority: z.number().min(0).max(1).nullable(),
});
export type TutorModeContext = z.infer<typeof tutorModeContextSchema>;

export const tutorPromptContextSchema = z.object({
  action: tutorActionSchema,
  calibration: z.object({
    academicLevel: z.string().min(1),
    explanationPreference: z.string().min(1),
    sessionGoal: z.string().min(1),
  }),
  conceptTitle: z.string().min(1),
  explanationStrategy: z.string().min(1),
  groundedEvidence: z.array(groundedChunkSchema),
  masteryState: conceptMasteryRecordSchema.nullable(),
  modeContext: tutorModeContextSchema,
  previousExplanationTypes: z.array(sessionExplanationTypeSchema),
  segmentCheckPrompt: z.string().min(1),
  segmentAnalogyPrompt: z.string().min(1),
  unknownTermsQueue: z.array(z.string().trim().min(1)),
});
export type TutorPromptContext = z.infer<typeof tutorPromptContextSchema>;

export const explanationAttemptSchema = z.object({
  conceptId: z.string().min(1),
  explanationType: sessionExplanationTypeSchema,
  outcome: sessionExplanationOutcomeSchema,
  usedAt: z.string().datetime({ offset: true }),
});
export type ExplanationAttempt = z.infer<typeof explanationAttemptSchema>;

export const coverageAuditResultSchema = z.object({
  canComplete: z.boolean(),
  checkedCount: z.number().int().nonnegative(),
  masteredCount: z.number().int().nonnegative(),
  partialCount: z.number().int().nonnegative(),
  resolvedAtuCount: z.number().int().nonnegative(),
  taughtCount: z.number().int().nonnegative(),
  totalConcepts: z.number().int().nonnegative(),
  totalAtus: z.number().int().nonnegative(),
  unresolvedConceptIds: z.array(z.string().min(1)),
  unresolvedAtuIds: z.array(z.string().min(1)),
  weakCount: z.number().int().nonnegative(),
});
export type CoverageAuditResult = z.infer<typeof coverageAuditResultSchema>;

export const compressedLearningStateSchema = z.object({
  compressedAt: z.string().datetime({ offset: true }),
  conceptCount: z.number().int().positive(),
  masteredConcepts: z.array(z.string().min(1)),
  summary: z.string().min(1),
  weakConcepts: z.array(z.string().min(1)),
});
export type CompressedLearningState = z.infer<
  typeof compressedLearningStateSchema
>;

export const TUTOR_RUNTIME_PATHS = {
  evaluate: '/api/v1/tutor/evaluate',
  next: '/api/v1/tutor/next',
} as const;
