import { z } from 'zod';

export const tutorActionSchema = z.enum([
  'teach',
  'check',
  'reteach',
  'refine',
  'simpler',
  'skip',
  'advance',
  'complete_session',
]);
export type TutorAction = z.infer<typeof tutorActionSchema>;

export const sessionMasteryStatusSchema = z.enum([
  'not_taught',
  'taught',
  'checked',
  'weak',
  'partial',
  'mastered',
]);
export type SessionMasteryStatus = z.infer<typeof sessionMasteryStatusSchema>;

export const sessionExplanationTypeSchema = z.enum([
  'analogy',
  'formal_definition',
  'worked_example',
  'concrete_example',
  'contrast',
  'visual_word_picture',
  'step_by_step',
  'common_mistake',
]);
export type SessionExplanationType = z.infer<
  typeof sessionExplanationTypeSchema
>;

export const sessionExplanationOutcomeSchema = z.enum([
  'successful',
  'weak',
  'failed',
]);
export type SessionExplanationOutcome = z.infer<
  typeof sessionExplanationOutcomeSchema
>;

export const errorClassificationSchema = z.enum([
  'misconception',
  'partial_understanding',
  'memorization',
  'careless_mistake',
  'guessing',
  'vocabulary_block',
  'none',
]);
export type ErrorClassification = z.infer<typeof errorClassificationSchema>;

export const confusionSignalSchema = z.enum([
  'vague_answer',
  'filler_phrases',
  'repeated_paraphrasing',
  'correct_words_weak_reasoning',
  'long_pause',
  'hesitation',
  'no_signal',
]);
export type ConfusionSignal = z.infer<typeof confusionSignalSchema>;

export const responseQualitySchema = z.enum(['strong', 'adequate', 'weak']);
export type ResponseQuality = z.infer<typeof responseQualitySchema>;

export const cognitiveLoadSchema = z.enum(['low', 'moderate', 'high']);
export type CognitiveLoad = z.infer<typeof cognitiveLoadSchema>;

export const voiceCommandSchema = z.enum([
  'pause',
  'continue',
  'slower',
  'repeat',
  'simpler',
  'example',
  'go_back',
  'test_me',
]);
export type VoiceCommand = z.infer<typeof voiceCommandSchema>;

export const sessionMasterySnapshotItemSchema = z.object({
  conceptId: z.string().min(1),
  confusionScore: z.number().min(0).max(1),
  evidenceCount: z.number().int().nonnegative(),
  status: sessionMasteryStatusSchema,
});
export type SessionMasterySnapshotItem = z.infer<
  typeof sessionMasterySnapshotItemSchema
>;

export const sessionExplanationHistoryItemSchema = z.object({
  conceptId: z.string().min(1),
  explanationType: sessionExplanationTypeSchema,
  outcome: sessionExplanationOutcomeSchema,
  usedAt: z.string().datetime({ offset: true }),
});
export type SessionExplanationHistoryItem = z.infer<
  typeof sessionExplanationHistoryItemSchema
>;

export const voiceSessionStateSchema = z.object({
  isHandsFree: z.boolean().default(false),
  lastTranscript: z.string().trim().min(1).nullable().default(null),
  lastTutorMessageId: z.string().min(1).nullable().default(null),
  pendingCommand: voiceCommandSchema.nullable().default(null),
  playbackRate: z.number().min(0.5).max(2).default(1),
});
export type VoiceSessionState = z.infer<typeof voiceSessionStateSchema>;

export const sessionTutorTurnStateSchema = z.object({
  currentCognitiveLoad: cognitiveLoadSchema.default('low'),
  lastErrorClassification: errorClassificationSchema.nullable().default(null),
  lastRecommendedAction: tutorActionSchema.nullable().default(null),
  modeQueueCursor: z.number().int().nonnegative().default(0),
  recentConfusionSignals: z.array(confusionSignalSchema).default([]),
  responseQuality: responseQualitySchema.default('adequate'),
  unknownTermsQueue: z.array(z.string().min(1)).default([]),
});
export type SessionTutorTurnState = z.infer<
  typeof sessionTutorTurnStateSchema
>;

export const sessionHandoffSnapshotSchema = z.object({
  currentSectionId: z.string().min(1).nullable(),
  currentSegmentId: z.string().min(1),
  currentStep: z.number().int().nonnegative(),
  explanationHistory: z.array(sessionExplanationHistoryItemSchema).default([]),
  masterySnapshot: z.array(sessionMasterySnapshotItemSchema).default([]),
  resumeNotes: z.string().trim().min(1).max(2000).nullable().default(null),
  turnState: sessionTutorTurnStateSchema.default({
    currentCognitiveLoad: 'low',
    lastErrorClassification: null,
    lastRecommendedAction: null,
    modeQueueCursor: 0,
    recentConfusionSignals: [],
    responseQuality: 'adequate',
    unknownTermsQueue: [],
  }),
  unresolvedAtuIds: z.array(z.string().min(1)).default([]),
  voiceState: voiceSessionStateSchema.default({
    isHandsFree: false,
    lastTranscript: null,
    lastTutorMessageId: null,
    pendingCommand: null,
    playbackRate: 1,
  }),
});
export type SessionHandoffSnapshot = z.infer<
  typeof sessionHandoffSnapshotSchema
>;

export const sessionHandoffSnapshotInputSchema =
  sessionHandoffSnapshotSchema.partial({
    currentSectionId: true,
    currentSegmentId: true,
    currentStep: true,
  });
export type SessionHandoffSnapshotInput = z.infer<
  typeof sessionHandoffSnapshotInputSchema
>;

export const sessionHandoffSnapshotRecordSchema =
  sessionHandoffSnapshotSchema.extend({
    createdAt: z.string().datetime({ offset: true }),
    sessionId: z.string().min(1),
    updatedAt: z.string().datetime({ offset: true }),
  });
export type SessionHandoffSnapshotRecord = z.infer<
  typeof sessionHandoffSnapshotRecordSchema
>;
