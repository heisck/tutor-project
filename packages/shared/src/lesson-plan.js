import { z } from 'zod';
export const lessonExplanationStrategySchema = z.enum([
    'example_first',
    'why_first',
    'direct',
]);
export const masteryQuestionTypeSchema = z.enum([
    'explanation',
    'application',
    'transfer',
    'error_spotting',
]);
export const masteryGateSchema = z.object({
    confusionThreshold: z.number().min(0).max(1),
    minimumChecks: z.number().int().positive(),
    requiredQuestionTypes: z.array(masteryQuestionTypeSchema).min(1),
    requiresDistinctQuestionTypes: z.boolean(),
});
export const lessonSegmentCoverageSummarySchema = z.object({
    assessed: z.number().int().nonnegative(),
    inProgress: z.number().int().nonnegative(),
    notTaught: z.number().int().nonnegative(),
    taught: z.number().int().nonnegative(),
});
export const lessonSegmentSchema = z.object({
    analogyPrompt: z.string().min(1),
    atuIds: z.array(z.string().min(1)).min(1),
    checkPrompt: z.string().min(1),
    chunkIds: z.array(z.string().min(1)).min(1),
    conceptDescription: z.string().min(1),
    conceptId: z.string().min(1),
    conceptTitle: z.string().min(1),
    coverageSummary: lessonSegmentCoverageSummarySchema,
    explanationStrategy: lessonExplanationStrategySchema,
    id: z.string().min(1),
    masteryGate: masteryGateSchema,
    ordinal: z.number().int().nonnegative(),
    prerequisiteConceptIds: z.array(z.string().min(1)),
    sectionId: z.string().min(1).nullable(),
    sourceOrdinal: z.number().int().nonnegative(),
    sourceUnitIds: z.array(z.string().min(1)).min(1),
    studySessionId: z.string().min(1),
});
export const teachingPlanSchema = z.object({
    currentSegmentId: z.string().min(1).nullable(),
    segments: z.array(lessonSegmentSchema),
    sessionId: z.string().min(1),
});
//# sourceMappingURL=lesson-plan.js.map