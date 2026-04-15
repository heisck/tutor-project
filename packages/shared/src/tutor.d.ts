import { z } from 'zod';
export declare const TUTOR_PATHS: {
    readonly evaluate: "/api/v1/tutor/evaluate";
    readonly next: "/api/v1/tutor/next";
    readonly question: "/api/v1/tutor/question";
};
export declare const startTutorStreamRequestSchema: z.ZodObject<{
    sessionId: z.ZodString;
}, z.core.$strict>;
export type StartTutorStreamRequest = z.infer<typeof startTutorStreamRequestSchema>;
export declare const tutorAssistantQuestionRequestSchema: z.ZodObject<{
    question: z.ZodString;
    sessionId: z.ZodString;
}, z.core.$strict>;
export type TutorAssistantQuestionRequest = z.infer<typeof tutorAssistantQuestionRequestSchema>;
export declare const tutorAssistantOutcomeSchema: z.ZodEnum<{
    answered: "answered";
    weak_grounding: "weak_grounding";
    refused: "refused";
}>;
export type TutorAssistantOutcome = z.infer<typeof tutorAssistantOutcomeSchema>;
export declare const tutorAssistantQuestionResponseSchema: z.ZodObject<{
    answer: z.ZodString;
    currentSegmentId: z.ZodNullable<z.ZodString>;
    documentId: z.ZodString;
    groundedEvidence: z.ZodArray<z.ZodObject<{
        content: z.ZodString;
        id: z.ZodString;
        score: z.ZodNumber;
    }, z.core.$strip>>;
    outcome: z.ZodEnum<{
        answered: "answered";
        weak_grounding: "weak_grounding";
        refused: "refused";
    }>;
    understandingCheck: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export type TutorAssistantQuestionResponse = z.infer<typeof tutorAssistantQuestionResponseSchema>;
export declare const tutorStreamControlActionSchema: z.ZodEnum<{
    stream_open: "stream_open";
}>;
export type TutorStreamControlAction = z.infer<typeof tutorStreamControlActionSchema>;
export declare const tutorStreamProgressStageSchema: z.ZodEnum<{
    segment_ready: "segment_ready";
}>;
export type TutorStreamProgressStage = z.infer<typeof tutorStreamProgressStageSchema>;
export declare const tutorStreamCompletionReasonSchema: z.ZodEnum<{
    await_learner_response: "await_learner_response";
}>;
export type TutorStreamCompletionReason = z.infer<typeof tutorStreamCompletionReasonSchema>;
export declare const tutorStreamControlPayloadSchema: z.ZodObject<{
    action: z.ZodEnum<{
        stream_open: "stream_open";
    }>;
    connectionId: z.ZodString;
    protocolVersion: z.ZodLiteral<"v1">;
    retryAfterMs: z.ZodNumber;
    sessionId: z.ZodString;
}, z.core.$strip>;
export type TutorStreamControlPayload = z.infer<typeof tutorStreamControlPayloadSchema>;
export declare const tutorStreamProgressPayloadSchema: z.ZodObject<{
    currentSegmentId: z.ZodNullable<z.ZodString>;
    currentStep: z.ZodNumber;
    segmentOrdinal: z.ZodNumber;
    sessionId: z.ZodString;
    stage: z.ZodEnum<{
        segment_ready: "segment_ready";
    }>;
    totalSegments: z.ZodNumber;
}, z.core.$strip>;
export type TutorStreamProgressPayload = z.infer<typeof tutorStreamProgressPayloadSchema>;
export declare const tutorStreamMessagePayloadSchema: z.ZodObject<{
    content: z.ZodString;
    format: z.ZodLiteral<"markdown">;
    messageId: z.ZodString;
    role: z.ZodLiteral<"tutor">;
    segmentId: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type TutorStreamMessagePayload = z.infer<typeof tutorStreamMessagePayloadSchema>;
export declare const tutorStreamCompletionPayloadSchema: z.ZodObject<{
    currentSegmentId: z.ZodNullable<z.ZodString>;
    deliveredEventCount: z.ZodNumber;
    reason: z.ZodEnum<{
        await_learner_response: "await_learner_response";
    }>;
    sessionId: z.ZodString;
}, z.core.$strip>;
export type TutorStreamCompletionPayload = z.infer<typeof tutorStreamCompletionPayloadSchema>;
export declare const tutorStreamControlEventSchema: z.ZodObject<{
    sentAt: z.ZodString;
    sequence: z.ZodNumber;
    data: z.ZodObject<{
        action: z.ZodEnum<{
            stream_open: "stream_open";
        }>;
        connectionId: z.ZodString;
        protocolVersion: z.ZodLiteral<"v1">;
        retryAfterMs: z.ZodNumber;
        sessionId: z.ZodString;
    }, z.core.$strip>;
    type: z.ZodLiteral<"control">;
}, z.core.$strip>;
export type TutorStreamControlEvent = z.infer<typeof tutorStreamControlEventSchema>;
export declare const tutorStreamProgressEventSchema: z.ZodObject<{
    sentAt: z.ZodString;
    sequence: z.ZodNumber;
    data: z.ZodObject<{
        currentSegmentId: z.ZodNullable<z.ZodString>;
        currentStep: z.ZodNumber;
        segmentOrdinal: z.ZodNumber;
        sessionId: z.ZodString;
        stage: z.ZodEnum<{
            segment_ready: "segment_ready";
        }>;
        totalSegments: z.ZodNumber;
    }, z.core.$strip>;
    type: z.ZodLiteral<"progress">;
}, z.core.$strip>;
export type TutorStreamProgressEvent = z.infer<typeof tutorStreamProgressEventSchema>;
export declare const tutorStreamMessageEventSchema: z.ZodObject<{
    sentAt: z.ZodString;
    sequence: z.ZodNumber;
    data: z.ZodObject<{
        content: z.ZodString;
        format: z.ZodLiteral<"markdown">;
        messageId: z.ZodString;
        role: z.ZodLiteral<"tutor">;
        segmentId: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    type: z.ZodLiteral<"message">;
}, z.core.$strip>;
export type TutorStreamMessageEvent = z.infer<typeof tutorStreamMessageEventSchema>;
export declare const tutorStreamCompletionEventSchema: z.ZodObject<{
    sentAt: z.ZodString;
    sequence: z.ZodNumber;
    data: z.ZodObject<{
        currentSegmentId: z.ZodNullable<z.ZodString>;
        deliveredEventCount: z.ZodNumber;
        reason: z.ZodEnum<{
            await_learner_response: "await_learner_response";
        }>;
        sessionId: z.ZodString;
    }, z.core.$strip>;
    type: z.ZodLiteral<"completion">;
}, z.core.$strip>;
export type TutorStreamCompletionEvent = z.infer<typeof tutorStreamCompletionEventSchema>;
export declare const tutorStreamEventSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    sentAt: z.ZodString;
    sequence: z.ZodNumber;
    data: z.ZodObject<{
        action: z.ZodEnum<{
            stream_open: "stream_open";
        }>;
        connectionId: z.ZodString;
        protocolVersion: z.ZodLiteral<"v1">;
        retryAfterMs: z.ZodNumber;
        sessionId: z.ZodString;
    }, z.core.$strip>;
    type: z.ZodLiteral<"control">;
}, z.core.$strip>, z.ZodObject<{
    sentAt: z.ZodString;
    sequence: z.ZodNumber;
    data: z.ZodObject<{
        currentSegmentId: z.ZodNullable<z.ZodString>;
        currentStep: z.ZodNumber;
        segmentOrdinal: z.ZodNumber;
        sessionId: z.ZodString;
        stage: z.ZodEnum<{
            segment_ready: "segment_ready";
        }>;
        totalSegments: z.ZodNumber;
    }, z.core.$strip>;
    type: z.ZodLiteral<"progress">;
}, z.core.$strip>, z.ZodObject<{
    sentAt: z.ZodString;
    sequence: z.ZodNumber;
    data: z.ZodObject<{
        content: z.ZodString;
        format: z.ZodLiteral<"markdown">;
        messageId: z.ZodString;
        role: z.ZodLiteral<"tutor">;
        segmentId: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    type: z.ZodLiteral<"message">;
}, z.core.$strip>, z.ZodObject<{
    sentAt: z.ZodString;
    sequence: z.ZodNumber;
    data: z.ZodObject<{
        currentSegmentId: z.ZodNullable<z.ZodString>;
        deliveredEventCount: z.ZodNumber;
        reason: z.ZodEnum<{
            await_learner_response: "await_learner_response";
        }>;
        sessionId: z.ZodString;
    }, z.core.$strip>;
    type: z.ZodLiteral<"completion">;
}, z.core.$strip>], "type">;
export type TutorStreamEvent = z.infer<typeof tutorStreamEventSchema>;
export declare function getTutorStreamEventName(type: TutorStreamEvent['type']): string;
export declare function serializeTutorStreamEvent(event: TutorStreamEvent): string;
export declare function serializeTutorStreamEvents(events: readonly TutorStreamEvent[]): string;
//# sourceMappingURL=tutor.d.ts.map