import { z } from 'zod';
import { sessionExplanationOutcomeSchema, sessionExplanationTypeSchema, sessionMasteryStatusSchema, } from './session-handoff.js';
// ── Tutor Actions ──────────────────────────────────────────────────────
export const tutorActionSchema = z.enum([
    'teach',
    'check',
    'reteach',
    'simpler',
    'skip',
    'complete_segment',
    'complete_session',
]);
// ── Learner Response ───────────────────────────────────────────────────
export const learnerResponseSchema = z
    .object({
    content: z.string().trim().min(1, 'Response content is required'),
    segmentId: z.string().min(1),
    sessionId: z.string().min(1),
})
    .strict();
// ── Error Classification ───────────────────────────────────────────────
export const errorClassificationSchema = z.enum([
    'misconception',
    'partial_understanding',
    'surface_memorization',
    'careless_mistake',
    'guessing',
    'vocabulary_block',
    'none',
]);
// ── Confusion Signal ───────────────────────────────────────────────────
export const confusionSignalSchema = z.enum([
    'vague_answer',
    'filler_phrases',
    'repeated_paraphrasing',
    'correct_words_weak_reasoning',
    'long_pause',
    'no_signal',
]);
// ── Response Evaluation ────────────────────────────────────────────────
export const responseEvaluationSchema = z.object({
    confusionScore: z.number().min(0).max(1),
    confusionSignals: z.array(confusionSignalSchema),
    errorClassification: errorClassificationSchema,
    illusionOfUnderstanding: z.boolean(),
    isCorrect: z.boolean(),
    reasoning: z.string().min(1),
});
// ── Question Types (12-type rotation) ──────────────────────────────────
export const checkQuestionTypeSchema = z.enum([
    'recall',
    'paraphrase',
    'compare_and_contrast',
    'apply_to_new_case',
    'transfer_to_new_domain',
    'error_spotting',
    'sequence_the_steps',
    'cause_effect_reasoning',
    'prerequisite_link',
    'compression',
    'reverse_reasoning',
    'boundary_case',
]);
// ── Mastery Evidence ───────────────────────────────────────────────────
export const masteryEvidenceSchema = z.object({
    checkType: checkQuestionTypeSchema,
    conceptId: z.string().min(1),
    confusionScore: z.number().min(0).max(1),
    evaluatedAt: z.string().datetime({ offset: true }),
    isCorrect: z.boolean(),
    questionType: z.string().min(1),
});
// ── Concept Mastery Record ─────────────────────────────────────────────
export const conceptMasteryRecordSchema = z.object({
    conceptId: z.string().min(1),
    confusionScore: z.number().min(0).max(1),
    evidenceHistory: z.array(masteryEvidenceSchema),
    explanationTypes: z.array(sessionExplanationTypeSchema),
    status: sessionMasteryStatusSchema,
});
// ── Tutor Step Decision ────────────────────────────────────────────────
export const tutorStepDecisionSchema = z.object({
    action: tutorActionSchema,
    conceptId: z.string().min(1),
    nextCheckType: checkQuestionTypeSchema.nullable(),
    reasoning: z.string().min(1),
    segmentId: z.string().min(1),
});
// ── Grounded Prompt Context ────────────────────────────────────────────
export const groundedChunkSchema = z.object({
    content: z.string().min(1),
    id: z.string().min(1),
    score: z.number(),
});
// ── Tutor Prompt Assembly ──────────────────────────────────────────────
export const tutorPromptContextSchema = z.object({
    action: tutorActionSchema,
    calibration: z.object({
        academicLevel: z.string().min(1),
        explanationPreference: z.string().min(1),
        sessionGoal: z.string().min(1),
    }),
    conceptTitle: z.string().min(1),
    explanationStrategy: z.string().min(1),
    groundedEvidence: z.array(groundedChunkSchema),
    masteryState: conceptMasteryRecordSchema.nullable(),
    previousExplanationTypes: z.array(sessionExplanationTypeSchema),
    segmentCheckPrompt: z.string().min(1),
    segmentAnalogyPrompt: z.string().min(1),
});
// ── Explanation Diversity ──────────────────────────────────────────────
export const explanationAttemptSchema = z.object({
    conceptId: z.string().min(1),
    explanationType: sessionExplanationTypeSchema,
    outcome: sessionExplanationOutcomeSchema,
    usedAt: z.string().datetime({ offset: true }),
});
// ── Coverage Audit ─────────────────────────────────────────────────────
export const coverageAuditResultSchema = z.object({
    canComplete: z.boolean(),
    masteredCount: z.number().int().nonnegative(),
    partialCount: z.number().int().nonnegative(),
    taughtCount: z.number().int().nonnegative(),
    totalConcepts: z.number().int().nonnegative(),
    unresolvedConceptIds: z.array(z.string().min(1)),
    weakCount: z.number().int().nonnegative(),
});
// ── Memory Compression ─────────────────────────────────────────────────
export const compressedLearningStateSchema = z.object({
    compressedAt: z.string().datetime({ offset: true }),
    conceptCount: z.number().int().positive(),
    masteredConcepts: z.array(z.string().min(1)),
    summary: z.string().min(1),
    weakConcepts: z.array(z.string().min(1)),
});
// ── Tutor Runtime API Paths ────────────────────────────────────────────
export const TUTOR_RUNTIME_PATHS = {
    evaluate: '/api/v1/tutor/evaluate',
    next: '/api/v1/tutor/next',
};
//# sourceMappingURL=tutor-runtime.js.map