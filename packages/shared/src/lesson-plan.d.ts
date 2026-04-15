import { z } from 'zod';
export declare const lessonExplanationStrategySchema: z.ZodEnum<{
    example_first: "example_first";
    why_first: "why_first";
    direct: "direct";
}>;
export type LessonExplanationStrategy = z.infer<typeof lessonExplanationStrategySchema>;
export declare const masteryQuestionTypeSchema: z.ZodEnum<{
    explanation: "explanation";
    application: "application";
    transfer: "transfer";
    error_spotting: "error_spotting";
}>;
export type MasteryQuestionType = z.infer<typeof masteryQuestionTypeSchema>;
export declare const masteryGateSchema: z.ZodObject<{
    confusionThreshold: z.ZodNumber;
    minimumChecks: z.ZodNumber;
    requiredQuestionTypes: z.ZodArray<z.ZodEnum<{
        explanation: "explanation";
        application: "application";
        transfer: "transfer";
        error_spotting: "error_spotting";
    }>>;
    requiresDistinctQuestionTypes: z.ZodBoolean;
}, z.core.$strip>;
export type MasteryGate = z.infer<typeof masteryGateSchema>;
export declare const lessonSegmentCoverageSummarySchema: z.ZodObject<{
    assessed: z.ZodNumber;
    inProgress: z.ZodNumber;
    notTaught: z.ZodNumber;
    taught: z.ZodNumber;
}, z.core.$strip>;
export type LessonSegmentCoverageSummary = z.infer<typeof lessonSegmentCoverageSummarySchema>;
export declare const lessonSegmentSchema: z.ZodObject<{
    analogyPrompt: z.ZodString;
    atuIds: z.ZodArray<z.ZodString>;
    checkPrompt: z.ZodString;
    chunkIds: z.ZodArray<z.ZodString>;
    conceptDescription: z.ZodString;
    conceptId: z.ZodString;
    conceptTitle: z.ZodString;
    coverageSummary: z.ZodObject<{
        assessed: z.ZodNumber;
        inProgress: z.ZodNumber;
        notTaught: z.ZodNumber;
        taught: z.ZodNumber;
    }, z.core.$strip>;
    explanationStrategy: z.ZodEnum<{
        example_first: "example_first";
        why_first: "why_first";
        direct: "direct";
    }>;
    id: z.ZodString;
    masteryGate: z.ZodObject<{
        confusionThreshold: z.ZodNumber;
        minimumChecks: z.ZodNumber;
        requiredQuestionTypes: z.ZodArray<z.ZodEnum<{
            explanation: "explanation";
            application: "application";
            transfer: "transfer";
            error_spotting: "error_spotting";
        }>>;
        requiresDistinctQuestionTypes: z.ZodBoolean;
    }, z.core.$strip>;
    ordinal: z.ZodNumber;
    prerequisiteConceptIds: z.ZodArray<z.ZodString>;
    sectionId: z.ZodNullable<z.ZodString>;
    sourceOrdinal: z.ZodNumber;
    sourceUnitIds: z.ZodArray<z.ZodString>;
    studySessionId: z.ZodString;
}, z.core.$strip>;
export type LessonSegmentRecord = z.infer<typeof lessonSegmentSchema>;
export declare const teachingPlanSchema: z.ZodObject<{
    currentSegmentId: z.ZodNullable<z.ZodString>;
    segments: z.ZodArray<z.ZodObject<{
        analogyPrompt: z.ZodString;
        atuIds: z.ZodArray<z.ZodString>;
        checkPrompt: z.ZodString;
        chunkIds: z.ZodArray<z.ZodString>;
        conceptDescription: z.ZodString;
        conceptId: z.ZodString;
        conceptTitle: z.ZodString;
        coverageSummary: z.ZodObject<{
            assessed: z.ZodNumber;
            inProgress: z.ZodNumber;
            notTaught: z.ZodNumber;
            taught: z.ZodNumber;
        }, z.core.$strip>;
        explanationStrategy: z.ZodEnum<{
            example_first: "example_first";
            why_first: "why_first";
            direct: "direct";
        }>;
        id: z.ZodString;
        masteryGate: z.ZodObject<{
            confusionThreshold: z.ZodNumber;
            minimumChecks: z.ZodNumber;
            requiredQuestionTypes: z.ZodArray<z.ZodEnum<{
                explanation: "explanation";
                application: "application";
                transfer: "transfer";
                error_spotting: "error_spotting";
            }>>;
            requiresDistinctQuestionTypes: z.ZodBoolean;
        }, z.core.$strip>;
        ordinal: z.ZodNumber;
        prerequisiteConceptIds: z.ZodArray<z.ZodString>;
        sectionId: z.ZodNullable<z.ZodString>;
        sourceOrdinal: z.ZodNumber;
        sourceUnitIds: z.ZodArray<z.ZodString>;
        studySessionId: z.ZodString;
    }, z.core.$strip>>;
    sessionId: z.ZodString;
}, z.core.$strip>;
export type TeachingPlanRecord = z.infer<typeof teachingPlanSchema>;
//# sourceMappingURL=lesson-plan.d.ts.map