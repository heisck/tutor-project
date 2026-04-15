import { z } from 'zod';
export declare const FEEDBACK_PATHS: {
    readonly submit: "/api/v1/feedback";
};
export declare const FEEDBACK_CONTENT_TYPES: readonly ["tutor_explanation", "assistant_answer"];
export declare const FEEDBACK_REASONS: readonly ["hallucination", "poor_explanation"];
export declare const FEEDBACK_THRESHOLD_STATUSES: readonly ["recorded", "threshold_triggered", "already_triggered"];
export declare const feedbackContentTypeSchema: z.ZodEnum<{
    tutor_explanation: "tutor_explanation";
    assistant_answer: "assistant_answer";
}>;
export declare const feedbackReasonSchema: z.ZodEnum<{
    hallucination: "hallucination";
    poor_explanation: "poor_explanation";
}>;
export declare const feedbackThresholdStatusSchema: z.ZodEnum<{
    recorded: "recorded";
    threshold_triggered: "threshold_triggered";
    already_triggered: "already_triggered";
}>;
export type FeedbackContentType = z.infer<typeof feedbackContentTypeSchema>;
export type FeedbackReason = z.infer<typeof feedbackReasonSchema>;
export type FeedbackThresholdStatus = z.infer<typeof feedbackThresholdStatusSchema>;
export declare const feedbackSubmissionRequestSchema: z.ZodObject<{
    contentType: z.ZodEnum<{
        tutor_explanation: "tutor_explanation";
        assistant_answer: "assistant_answer";
    }>;
    lessonSegmentId: z.ZodString;
    messageId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    reason: z.ZodEnum<{
        hallucination: "hallucination";
        poor_explanation: "poor_explanation";
    }>;
    sessionId: z.ZodString;
}, z.core.$strict>;
export type FeedbackSubmissionRequest = z.infer<typeof feedbackSubmissionRequestSchema>;
export declare const feedbackRecordSchema: z.ZodObject<{
    conceptId: z.ZodString;
    contentType: z.ZodEnum<{
        tutor_explanation: "tutor_explanation";
        assistant_answer: "assistant_answer";
    }>;
    createdAt: z.ZodString;
    documentId: z.ZodString;
    id: z.ZodString;
    lessonSegmentId: z.ZodString;
    messageId: z.ZodNullable<z.ZodString>;
    reason: z.ZodEnum<{
        hallucination: "hallucination";
        poor_explanation: "poor_explanation";
    }>;
    scopeKey: z.ZodString;
    sessionId: z.ZodString;
}, z.core.$strict>;
export type FeedbackRecord = z.infer<typeof feedbackRecordSchema>;
export declare const feedbackThresholdResultSchema: z.ZodObject<{
    feedbackCount: z.ZodNumber;
    requiresReview: z.ZodBoolean;
    status: z.ZodEnum<{
        recorded: "recorded";
        threshold_triggered: "threshold_triggered";
        already_triggered: "already_triggered";
    }>;
    threshold: z.ZodNumber;
}, z.core.$strict>;
export type FeedbackThresholdResult = z.infer<typeof feedbackThresholdResultSchema>;
export declare const feedbackSubmissionResponseSchema: z.ZodObject<{
    feedback: z.ZodObject<{
        conceptId: z.ZodString;
        contentType: z.ZodEnum<{
            tutor_explanation: "tutor_explanation";
            assistant_answer: "assistant_answer";
        }>;
        createdAt: z.ZodString;
        documentId: z.ZodString;
        id: z.ZodString;
        lessonSegmentId: z.ZodString;
        messageId: z.ZodNullable<z.ZodString>;
        reason: z.ZodEnum<{
            hallucination: "hallucination";
            poor_explanation: "poor_explanation";
        }>;
        scopeKey: z.ZodString;
        sessionId: z.ZodString;
    }, z.core.$strict>;
    threshold: z.ZodObject<{
        feedbackCount: z.ZodNumber;
        requiresReview: z.ZodBoolean;
        status: z.ZodEnum<{
            recorded: "recorded";
            threshold_triggered: "threshold_triggered";
            already_triggered: "already_triggered";
        }>;
        threshold: z.ZodNumber;
    }, z.core.$strict>;
}, z.core.$strict>;
export type FeedbackSubmissionResponse = z.infer<typeof feedbackSubmissionResponseSchema>;
//# sourceMappingURL=feedback.d.ts.map