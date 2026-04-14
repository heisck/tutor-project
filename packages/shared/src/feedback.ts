import { z } from 'zod';

export const FEEDBACK_PATHS = {
  submit: '/api/v1/feedback',
} as const;

export const FEEDBACK_CONTENT_TYPES = [
  'tutor_explanation',
  'assistant_answer',
] as const;
export const FEEDBACK_REASONS = [
  'hallucination',
  'poor_explanation',
] as const;
export const FEEDBACK_THRESHOLD_STATUSES = [
  'recorded',
  'threshold_triggered',
  'already_triggered',
] as const;

export const feedbackContentTypeSchema = z.enum(FEEDBACK_CONTENT_TYPES);
export const feedbackReasonSchema = z.enum(FEEDBACK_REASONS);
export const feedbackThresholdStatusSchema = z.enum(
  FEEDBACK_THRESHOLD_STATUSES,
);

export type FeedbackContentType = z.infer<typeof feedbackContentTypeSchema>;
export type FeedbackReason = z.infer<typeof feedbackReasonSchema>;
export type FeedbackThresholdStatus = z.infer<
  typeof feedbackThresholdStatusSchema
>;

export const feedbackSubmissionRequestSchema = z
  .object({
    contentType: feedbackContentTypeSchema,
    lessonSegmentId: z.string().trim().min(1, 'lessonSegmentId is required'),
    messageId: z.string().trim().min(1).nullable().optional(),
    reason: feedbackReasonSchema,
    sessionId: z.string().trim().min(1, 'sessionId is required'),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.contentType === 'tutor_explanation' && value.messageId == null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'messageId is required for tutor explanation feedback',
        path: ['messageId'],
      });
    }
  });
export type FeedbackSubmissionRequest = z.infer<
  typeof feedbackSubmissionRequestSchema
>;

export const feedbackRecordSchema = z
  .object({
    conceptId: z.string().min(1),
    contentType: feedbackContentTypeSchema,
    createdAt: z.string().datetime({ offset: true }),
    documentId: z.string().min(1),
    id: z.string().min(1),
    lessonSegmentId: z.string().min(1),
    messageId: z.string().min(1).nullable(),
    reason: feedbackReasonSchema,
    scopeKey: z.string().min(1),
    sessionId: z.string().min(1),
  })
  .strict();
export type FeedbackRecord = z.infer<typeof feedbackRecordSchema>;

export const feedbackThresholdResultSchema = z
  .object({
    feedbackCount: z.number().int().positive(),
    requiresReview: z.boolean(),
    status: feedbackThresholdStatusSchema,
    threshold: z.number().int().positive(),
  })
  .strict();
export type FeedbackThresholdResult = z.infer<
  typeof feedbackThresholdResultSchema
>;

export const feedbackSubmissionResponseSchema = z
  .object({
    feedback: feedbackRecordSchema,
    threshold: feedbackThresholdResultSchema,
  })
  .strict();
export type FeedbackSubmissionResponse = z.infer<
  typeof feedbackSubmissionResponseSchema
>;
