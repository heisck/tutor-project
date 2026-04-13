import { z } from 'zod';

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

export const sessionHandoffSnapshotSchema = z.object({
  currentSectionId: z.string().min(1).nullable(),
  currentSegmentId: z.string().min(1),
  currentStep: z.number().int().nonnegative(),
  explanationHistory: z.array(sessionExplanationHistoryItemSchema).default([]),
  masterySnapshot: z.array(sessionMasterySnapshotItemSchema).default([]),
  resumeNotes: z.string().trim().min(1).max(2000).nullable().default(null),
  unresolvedAtuIds: z.array(z.string().min(1)).default([]),
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
