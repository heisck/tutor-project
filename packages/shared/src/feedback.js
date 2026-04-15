import { z } from 'zod';
export const FEEDBACK_PATHS = {
    submit: '/api/v1/feedback',
};
export const FEEDBACK_CONTENT_TYPES = [
    'tutor_explanation',
    'assistant_answer',
];
export const FEEDBACK_REASONS = [
    'hallucination',
    'poor_explanation',
];
export const FEEDBACK_THRESHOLD_STATUSES = [
    'recorded',
    'threshold_triggered',
    'already_triggered',
];
export const feedbackContentTypeSchema = z.enum(FEEDBACK_CONTENT_TYPES);
export const feedbackReasonSchema = z.enum(FEEDBACK_REASONS);
export const feedbackThresholdStatusSchema = z.enum(FEEDBACK_THRESHOLD_STATUSES);
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
export const feedbackThresholdResultSchema = z
    .object({
    feedbackCount: z.number().int().positive(),
    requiresReview: z.boolean(),
    status: feedbackThresholdStatusSchema,
    threshold: z.number().int().positive(),
})
    .strict();
export const feedbackSubmissionResponseSchema = z
    .object({
    feedback: feedbackRecordSchema,
    threshold: feedbackThresholdResultSchema,
})
    .strict();
//# sourceMappingURL=feedback.js.map