import { z } from 'zod';

import {
  tutorActionSchema,
  type VoiceCommand,
  voiceCommandSchema,
  voiceSessionStateSchema,
} from './session-handoff.js';
import { groundedChunkSchema, responseEvaluationSchema } from './tutor-runtime.js';

export const TUTOR_PATHS = {
  evaluate: '/api/v1/tutor/evaluate',
  next: '/api/v1/tutor/next',
  question: '/api/v1/tutor/question',
  voiceCommand: '/api/v1/tutor/voice/command',
  voiceSynthesize: '/api/v1/tutor/voice/synthesize',
  voiceTranscribe: '/api/v1/tutor/voice/transcribe',
} as const;

export const startTutorStreamRequestSchema = z
  .object({
    sessionId: z.string().trim().min(1, 'sessionId is required'),
  })
  .strict();
export type StartTutorStreamRequest = z.infer<
  typeof startTutorStreamRequestSchema
>;

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
export type TutorAssistantQuestionRequest = z.infer<
  typeof tutorAssistantQuestionRequestSchema
>;

export const tutorAssistantOutcomeSchema = z.enum([
  'answered',
  'weak_grounding',
  'refused',
]);
export type TutorAssistantOutcome = z.infer<
  typeof tutorAssistantOutcomeSchema
>;

export const tutorAssistantQuestionResponseSchema = z
  .object({
    answer: z.string().min(1),
    currentSegmentId: z.string().min(1).nullable(),
    documentId: z.string().min(1),
    evaluation: responseEvaluationSchema.nullable().default(null),
    groundedEvidence: z.array(groundedChunkSchema).max(3),
    outcome: tutorAssistantOutcomeSchema,
    understandingCheck: z.string().min(1).nullable(),
  })
  .strict();
export type TutorAssistantQuestionResponse = z.infer<
  typeof tutorAssistantQuestionResponseSchema
>;

export const tutorStreamControlActionSchema = z.enum(['stream_open']);
export type TutorStreamControlAction = z.infer<
  typeof tutorStreamControlActionSchema
>;

export const tutorStreamProgressStageSchema = z.enum(['segment_ready']);
export type TutorStreamProgressStage = z.infer<
  typeof tutorStreamProgressStageSchema
>;

export const tutorStreamCompletionReasonSchema = z.enum([
  'await_learner_response',
]);
export type TutorStreamCompletionReason = z.infer<
  typeof tutorStreamCompletionReasonSchema
>;

export const tutorStreamControlPayloadSchema = z.object({
  action: tutorStreamControlActionSchema,
  connectionId: z.string().min(1),
  protocolVersion: z.literal('v1'),
  retryAfterMs: z.number().int().positive(),
  sessionId: z.string().min(1),
});
export type TutorStreamControlPayload = z.infer<
  typeof tutorStreamControlPayloadSchema
>;

export const tutorStreamProgressPayloadSchema = z.object({
  currentSegmentId: z.string().min(1).nullable(),
  currentStep: z.number().int().nonnegative(),
  segmentOrdinal: z.number().int().nonnegative(),
  sessionId: z.string().min(1),
  stage: tutorStreamProgressStageSchema,
  totalSegments: z.number().int().positive(),
});
export type TutorStreamProgressPayload = z.infer<
  typeof tutorStreamProgressPayloadSchema
>;

export const tutorStreamMessagePayloadSchema = z.object({
  content: z.string().min(1),
  format: z.literal('markdown'),
  messageId: z.string().min(1),
  role: z.literal('tutor'),
  segmentId: z.string().min(1).nullable(),
});
export type TutorStreamMessagePayload = z.infer<
  typeof tutorStreamMessagePayloadSchema
>;

export const tutorStreamCompletionPayloadSchema = z.object({
  currentSegmentId: z.string().min(1).nullable(),
  deliveredEventCount: z.number().int().positive(),
  reason: tutorStreamCompletionReasonSchema,
  sessionId: z.string().min(1),
});
export type TutorStreamCompletionPayload = z.infer<
  typeof tutorStreamCompletionPayloadSchema
>;

const tutorStreamEventBaseSchema = z.object({
  sentAt: z.string().datetime({ offset: true }),
  sequence: z.number().int().positive(),
});

export const tutorStreamControlEventSchema = tutorStreamEventBaseSchema.extend({
  data: tutorStreamControlPayloadSchema,
  type: z.literal('control'),
});
export type TutorStreamControlEvent = z.infer<
  typeof tutorStreamControlEventSchema
>;

export const tutorStreamProgressEventSchema = tutorStreamEventBaseSchema.extend({
  data: tutorStreamProgressPayloadSchema,
  type: z.literal('progress'),
});
export type TutorStreamProgressEvent = z.infer<
  typeof tutorStreamProgressEventSchema
>;

export const tutorStreamMessageEventSchema = tutorStreamEventBaseSchema.extend({
  data: tutorStreamMessagePayloadSchema,
  type: z.literal('message'),
});
export type TutorStreamMessageEvent = z.infer<
  typeof tutorStreamMessageEventSchema
>;

export const tutorStreamCompletionEventSchema =
  tutorStreamEventBaseSchema.extend({
    data: tutorStreamCompletionPayloadSchema,
    type: z.literal('completion'),
  });
export type TutorStreamCompletionEvent = z.infer<
  typeof tutorStreamCompletionEventSchema
>;

export const tutorStreamEventSchema = z.discriminatedUnion('type', [
  tutorStreamControlEventSchema,
  tutorStreamProgressEventSchema,
  tutorStreamMessageEventSchema,
  tutorStreamCompletionEventSchema,
]);
export type TutorStreamEvent = z.infer<typeof tutorStreamEventSchema>;

export const tutorVoiceTranscriptionRequestSchema = z
  .object({
    audioBase64: z.string().trim().min(1, 'audioBase64 is required'),
    mimeType: z
      .string()
      .trim()
      .min(1, 'mimeType is required')
      .max(100, 'mimeType must be 100 characters or fewer'),
    sessionId: z.string().trim().min(1, 'sessionId is required'),
  })
  .strict();
export type TutorVoiceTranscriptionRequest = z.infer<
  typeof tutorVoiceTranscriptionRequestSchema
>;

export const tutorVoiceTranscriptionResponseSchema = z
  .object({
    transcript: z.string().min(1),
    voiceState: voiceSessionStateSchema,
  })
  .strict();
export type TutorVoiceTranscriptionResponse = z.infer<
  typeof tutorVoiceTranscriptionResponseSchema
>;

export const tutorVoiceSynthesisRequestSchema = z
  .object({
    playbackRate: z.number().min(0.5).max(2).optional(),
    sessionId: z.string().trim().min(1, 'sessionId is required'),
    text: z
      .string()
      .trim()
      .min(1, 'text is required')
      .max(4000, 'text must be 4000 characters or fewer'),
  })
  .strict();
export type TutorVoiceSynthesisRequest = z.infer<
  typeof tutorVoiceSynthesisRequestSchema
>;

export const tutorVoiceSynthesisResponseSchema = z
  .object({
    audioBase64: z.string().min(1),
    contentType: z.string().min(1),
    playbackRate: z.number().min(0.5).max(2),
    voiceState: voiceSessionStateSchema,
  })
  .strict();
export type TutorVoiceSynthesisResponse = z.infer<
  typeof tutorVoiceSynthesisResponseSchema
>;

export const tutorVoiceCommandRequestSchema = z
  .object({
    command: voiceCommandSchema,
    sessionId: z.string().trim().min(1, 'sessionId is required'),
  })
  .strict();
export type TutorVoiceCommandRequest = z.infer<
  typeof tutorVoiceCommandRequestSchema
>;

export const tutorVoiceCommandResponseSchema = z
  .object({
    appliedCommand: voiceCommandSchema,
    nextAction: tutorActionSchema,
    responseText: z.string().min(1),
    voiceState: voiceSessionStateSchema,
  })
  .strict();
export type TutorVoiceCommandResponse = z.infer<
  typeof tutorVoiceCommandResponseSchema
>;

export function getTutorStreamEventName(
  type: TutorStreamEvent['type'],
): string {
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

export function serializeTutorStreamEvent(event: TutorStreamEvent): string {
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

export function serializeTutorStreamEvents(
  events: readonly TutorStreamEvent[],
): string {
  return events.map((event) => serializeTutorStreamEvent(event)).join('');
}

export function normalizeVoiceCommandText(value: string): VoiceCommand | null {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case 'pause':
      return 'pause';
    case 'continue':
      return 'continue';
    case 'slower':
      return 'slower';
    case 'repeat':
      return 'repeat';
    case 'simpler':
      return 'simpler';
    case 'example':
      return 'example';
    case 'go back':
    case 'go_back':
      return 'go_back';
    case 'test me':
    case 'test_me':
      return 'test_me';
    default:
      return null;
  }
}
