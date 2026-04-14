import {
  ACADEMIC_LEVELS,
  EXPLANATION_START_PREFERENCES,
  FEEDBACK_CONTENT_TYPES,
  FEEDBACK_PATHS,
  FEEDBACK_REASONS,
  feedbackSubmissionResponseSchema,
  MOTIVATION_STATES,
  lessonSegmentCoverageSummarySchema,
  SESSION_PATHS,
  sessionMasterySnapshotItemSchema,
  STUDY_GOAL_PREFERENCES,
  STUDY_SESSION_MODES,
  STUDY_SESSION_STATUSES,
  learnerResponseSchema,
  responseEvaluationSchema,
  sessionHandoffSnapshotRecordSchema,
  sessionMasteryStatusSchema,
  teachingPlanSchema,
  tutorAssistantQuestionResponseSchema,
  TUTOR_PATHS,
} from '@ai-tutor-pwa/shared';
import { z } from 'zod';

export { FEEDBACK_PATHS, SESSION_PATHS, TUTOR_PATHS };
export { feedbackSubmissionResponseSchema, tutorAssistantQuestionResponseSchema };

export const errorResponseSchema = z
  .object({
    message: z.string().min(1),
  })
  .strict();

export const learningProfileSummarySchema = z
  .object({
    academicLevel: z.enum(ACADEMIC_LEVELS),
    explanationStartPreference: z.enum(EXPLANATION_START_PREFERENCES),
    lastCalibratedAt: z.string().datetime({ offset: true }).nullable(),
    sessionGoal: z.enum(STUDY_GOAL_PREFERENCES),
  })
  .strict();

export const studySessionRecordSchema = z
  .object({
    createdAt: z.string().datetime({ offset: true }),
    currentSectionId: z.string().min(1).nullable(),
    currentSegmentId: z.string().min(1).nullable(),
    currentStep: z.number().int().nonnegative(),
    documentId: z.string().min(1),
    frustrationFlagCount: z.number().int().nonnegative(),
    id: z.string().min(1),
    lastActiveAt: z.string().datetime({ offset: true }).nullable(),
    mode: z.enum(STUDY_SESSION_MODES),
    motivationState: z.enum(MOTIVATION_STATES),
    startedAt: z.string().datetime({ offset: true }).nullable(),
    status: z.enum(STUDY_SESSION_STATUSES),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const studySessionLifecycleResponseSchema = z
  .object({
    learningProfile: learningProfileSummarySchema.nullable(),
    session: studySessionRecordSchema,
  })
  .strict();

export const studySessionContinuitySchema = z
  .object({
    hasInterruptedState: z.boolean(),
    interruptedAt: z.string().datetime({ offset: true }).nullable(),
    isResumable: z.boolean(),
    masterySnapshot: z.array(sessionMasterySnapshotItemSchema),
    resumeNotes: z.string().nullable(),
    resumeSectionId: z.string().min(1).nullable(),
    resumeSegmentId: z.string().min(1).nullable(),
    resumeSegmentTitle: z.string().min(1).nullable(),
    resumeStep: z.number().int().nonnegative().nullable(),
    unresolvedAtuIds: z.array(z.string().min(1)),
  })
  .strict();

export const studySessionSummarySchema = z
  .object({
    canComplete: z.boolean(),
    completionBlockedReason: z.string().min(1),
    coverageSummary: lessonSegmentCoverageSummarySchema,
    masteredTopics: z.array(z.string().min(1)),
    readinessEstimate: z.string().min(1),
    shakyTopics: z.array(z.string().min(1)),
    unresolvedAtuIds: z.array(z.string().min(1)),
    unresolvedTopics: z.array(z.string().min(1)),
  })
  .strict();

export const studySessionStateResponseSchema = z
  .object({
    continuity: studySessionContinuitySchema,
    handoffSnapshot: sessionHandoffSnapshotRecordSchema.nullable(),
    learningProfile: learningProfileSummarySchema.nullable(),
    session: studySessionRecordSchema,
    summary: studySessionSummarySchema,
    teachingPlan: teachingPlanSchema,
  })
  .strict();

export const tutorEvaluationResponseSchema = z
  .object({
    evaluation: responseEvaluationSchema,
    mastery: z
      .object({
        conceptId: z.string().min(1),
        confusionScore: z.number().min(0).max(1),
        previousStatus: z.enum(sessionMasteryStatusSchema.options),
        status: z.enum(sessionMasteryStatusSchema.options),
      })
      .strict(),
  })
  .strict();

export const tutorAssistantQuestionFormSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(1, 'Assistant question is required')
      .max(2000, 'Assistant question must be 2000 characters or fewer'),
  })
  .strict();

export const feedbackSubmissionFormSchema = z
  .object({
    contentType: z.enum(FEEDBACK_CONTENT_TYPES),
    lessonSegmentId: z.string().trim().min(1, 'Lesson segment is required'),
    messageId: z.string().trim().min(1).nullable(),
    reason: z.enum(FEEDBACK_REASONS),
    sessionId: z.string().trim().min(1, 'Session ID is required'),
  })
  .strict();

export const startSessionFormSchema = z
  .object({
    academicLevel: z.enum(ACADEMIC_LEVELS),
    documentId: z.string().trim().min(1, 'Document ID is required'),
    explanationStartPreference: z.enum(EXPLANATION_START_PREFERENCES),
    sessionGoal: z.enum(STUDY_GOAL_PREFERENCES),
  })
  .strict();

export const learnerResponseFormSchema = z
  .object({
    content: z.string().trim().min(1, 'Response content is required'),
  })
  .strict();

export const tutorMessageRecordSchema = z
  .object({
    content: z.string().min(1),
    id: z.string().min(1),
    segmentId: z.string().min(1).nullable(),
  })
  .strict();

export const sessionIdSchema = z
  .string()
  .trim()
  .min(1, 'Session ID is required');

export type StartSessionForm = z.infer<typeof startSessionFormSchema>;
export type StudySessionLifecycleResponseModel = z.infer<
  typeof studySessionLifecycleResponseSchema
>;
export type StudySessionContinuityModel = z.infer<
  typeof studySessionContinuitySchema
>;
export type StudySessionStateResponseModel = z.infer<
  typeof studySessionStateResponseSchema
>;
export type StudySessionSummaryModel = z.infer<
  typeof studySessionSummarySchema
>;
export type TutorEvaluationResponseModel = z.infer<
  typeof tutorEvaluationResponseSchema
>;
export type TutorAssistantQuestionResponseModel = z.infer<
  typeof tutorAssistantQuestionResponseSchema
>;
export type FeedbackSubmissionResponseModel = z.infer<
  typeof feedbackSubmissionResponseSchema
>;
export type TutorMessageRecord = z.infer<typeof tutorMessageRecordSchema>;

export function buildStartSessionPayload(form: StartSessionForm) {
  return {
    calibration: {
      academicLevel: form.academicLevel,
      explanationStartPreference: form.explanationStartPreference,
      sessionGoal: form.sessionGoal,
    },
    documentId: form.documentId,
  };
}

export function buildLearnerResponsePayload(input: {
  content: string;
  segmentId: string;
  sessionId: string;
}) {
  return learnerResponseSchema.parse(input);
}
