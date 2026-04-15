import { z } from 'zod';
import { groundedChunkSchema } from './tutor-runtime.js';
export const TUTOR_PATHS = {
    evaluate: '/api/v1/tutor/evaluate',
    next: '/api/v1/tutor/next',
    question: '/api/v1/tutor/question',
};
export const startTutorStreamRequestSchema = z
    .object({
    sessionId: z.string().trim().min(1, 'sessionId is required'),
})
    .strict();
export const tutorAssistantQuestionRequestSchema = z
    .object({
    question: z
        .string()
        .trim()
        .min(1, 'Question is required')
        .max(2000, 'Question must be 2000 characters or fewer'),
    sessionId: z.string().trim().min(1, 'sessionId is required'),
})
    .strict();
export const tutorAssistantOutcomeSchema = z.enum([
    'answered',
    'weak_grounding',
    'refused',
]);
export const tutorAssistantQuestionResponseSchema = z
    .object({
    answer: z.string().min(1),
    currentSegmentId: z.string().min(1).nullable(),
    documentId: z.string().min(1),
    groundedEvidence: z.array(groundedChunkSchema).max(3),
    outcome: tutorAssistantOutcomeSchema,
    understandingCheck: z.string().min(1).nullable(),
})
    .strict();
export const tutorStreamControlActionSchema = z.enum(['stream_open']);
export const tutorStreamProgressStageSchema = z.enum(['segment_ready']);
export const tutorStreamCompletionReasonSchema = z.enum([
    'await_learner_response',
]);
export const tutorStreamControlPayloadSchema = z.object({
    action: tutorStreamControlActionSchema,
    connectionId: z.string().min(1),
    protocolVersion: z.literal('v1'),
    retryAfterMs: z.number().int().positive(),
    sessionId: z.string().min(1),
});
export const tutorStreamProgressPayloadSchema = z.object({
    currentSegmentId: z.string().min(1).nullable(),
    currentStep: z.number().int().nonnegative(),
    segmentOrdinal: z.number().int().nonnegative(),
    sessionId: z.string().min(1),
    stage: tutorStreamProgressStageSchema,
    totalSegments: z.number().int().positive(),
});
export const tutorStreamMessagePayloadSchema = z.object({
    content: z.string().min(1),
    format: z.literal('markdown'),
    messageId: z.string().min(1),
    role: z.literal('tutor'),
    segmentId: z.string().min(1).nullable(),
});
export const tutorStreamCompletionPayloadSchema = z.object({
    currentSegmentId: z.string().min(1).nullable(),
    deliveredEventCount: z.number().int().positive(),
    reason: tutorStreamCompletionReasonSchema,
    sessionId: z.string().min(1),
});
const tutorStreamEventBaseSchema = z.object({
    sentAt: z.string().datetime({ offset: true }),
    sequence: z.number().int().positive(),
});
export const tutorStreamControlEventSchema = tutorStreamEventBaseSchema.extend({
    data: tutorStreamControlPayloadSchema,
    type: z.literal('control'),
});
export const tutorStreamProgressEventSchema = tutorStreamEventBaseSchema.extend({
    data: tutorStreamProgressPayloadSchema,
    type: z.literal('progress'),
});
export const tutorStreamMessageEventSchema = tutorStreamEventBaseSchema.extend({
    data: tutorStreamMessagePayloadSchema,
    type: z.literal('message'),
});
export const tutorStreamCompletionEventSchema = tutorStreamEventBaseSchema.extend({
    data: tutorStreamCompletionPayloadSchema,
    type: z.literal('completion'),
});
export const tutorStreamEventSchema = z.discriminatedUnion('type', [
    tutorStreamControlEventSchema,
    tutorStreamProgressEventSchema,
    tutorStreamMessageEventSchema,
    tutorStreamCompletionEventSchema,
]);
export function getTutorStreamEventName(type) {
    switch (type) {
        case 'control':
            return 'tutor.control';
        case 'progress':
            return 'tutor.progress';
        case 'message':
            return 'tutor.message';
        case 'completion':
            return 'tutor.completion';
    }
}
export function serializeTutorStreamEvent(event) {
    const parsedEvent = tutorStreamEventSchema.parse(event);
    const lines = [
        `id: ${parsedEvent.sequence}`,
        `event: ${getTutorStreamEventName(parsedEvent.type)}`,
    ];
    if (parsedEvent.type === 'control') {
        lines.push(`retry: ${parsedEvent.data.retryAfterMs}`);
    }
    lines.push(`data: ${JSON.stringify(parsedEvent)}`);
    return `${lines.join('\n')}\n\n`;
}
export function serializeTutorStreamEvents(events) {
    return events.map((event) => serializeTutorStreamEvent(event)).join('');
}
//# sourceMappingURL=tutor.js.map