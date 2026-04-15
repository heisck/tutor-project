import { z } from 'zod';
export declare const sessionMasteryStatusSchema: z.ZodEnum<{
    taught: "taught";
    not_taught: "not_taught";
    checked: "checked";
    weak: "weak";
    partial: "partial";
    mastered: "mastered";
}>;
export type SessionMasteryStatus = z.infer<typeof sessionMasteryStatusSchema>;
export declare const sessionExplanationTypeSchema: z.ZodEnum<{
    analogy: "analogy";
    formal_definition: "formal_definition";
    worked_example: "worked_example";
    concrete_example: "concrete_example";
    contrast: "contrast";
    visual_word_picture: "visual_word_picture";
    step_by_step: "step_by_step";
    common_mistake: "common_mistake";
}>;
export type SessionExplanationType = z.infer<typeof sessionExplanationTypeSchema>;
export declare const sessionExplanationOutcomeSchema: z.ZodEnum<{
    failed: "failed";
    weak: "weak";
    successful: "successful";
}>;
export type SessionExplanationOutcome = z.infer<typeof sessionExplanationOutcomeSchema>;
export declare const sessionMasterySnapshotItemSchema: z.ZodObject<{
    conceptId: z.ZodString;
    confusionScore: z.ZodNumber;
    evidenceCount: z.ZodNumber;
    status: z.ZodEnum<{
        taught: "taught";
        not_taught: "not_taught";
        checked: "checked";
        weak: "weak";
        partial: "partial";
        mastered: "mastered";
    }>;
}, z.core.$strip>;
export type SessionMasterySnapshotItem = z.infer<typeof sessionMasterySnapshotItemSchema>;
export declare const sessionExplanationHistoryItemSchema: z.ZodObject<{
    conceptId: z.ZodString;
    explanationType: z.ZodEnum<{
        analogy: "analogy";
        formal_definition: "formal_definition";
        worked_example: "worked_example";
        concrete_example: "concrete_example";
        contrast: "contrast";
        visual_word_picture: "visual_word_picture";
        step_by_step: "step_by_step";
        common_mistake: "common_mistake";
    }>;
    outcome: z.ZodEnum<{
        failed: "failed";
        weak: "weak";
        successful: "successful";
    }>;
    usedAt: z.ZodString;
}, z.core.$strip>;
export type SessionExplanationHistoryItem = z.infer<typeof sessionExplanationHistoryItemSchema>;
export declare const sessionHandoffSnapshotSchema: z.ZodObject<{
    currentSectionId: z.ZodNullable<z.ZodString>;
    currentSegmentId: z.ZodString;
    currentStep: z.ZodNumber;
    explanationHistory: z.ZodDefault<z.ZodArray<z.ZodObject<{
        conceptId: z.ZodString;
        explanationType: z.ZodEnum<{
            analogy: "analogy";
            formal_definition: "formal_definition";
            worked_example: "worked_example";
            concrete_example: "concrete_example";
            contrast: "contrast";
            visual_word_picture: "visual_word_picture";
            step_by_step: "step_by_step";
            common_mistake: "common_mistake";
        }>;
        outcome: z.ZodEnum<{
            failed: "failed";
            weak: "weak";
            successful: "successful";
        }>;
        usedAt: z.ZodString;
    }, z.core.$strip>>>;
    masterySnapshot: z.ZodDefault<z.ZodArray<z.ZodObject<{
        conceptId: z.ZodString;
        confusionScore: z.ZodNumber;
        evidenceCount: z.ZodNumber;
        status: z.ZodEnum<{
            taught: "taught";
            not_taught: "not_taught";
            checked: "checked";
            weak: "weak";
            partial: "partial";
            mastered: "mastered";
        }>;
    }, z.core.$strip>>>;
    resumeNotes: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    unresolvedAtuIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type SessionHandoffSnapshot = z.infer<typeof sessionHandoffSnapshotSchema>;
export declare const sessionHandoffSnapshotInputSchema: z.ZodObject<{
    currentSectionId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    currentSegmentId: z.ZodOptional<z.ZodString>;
    currentStep: z.ZodOptional<z.ZodNumber>;
    explanationHistory: z.ZodDefault<z.ZodArray<z.ZodObject<{
        conceptId: z.ZodString;
        explanationType: z.ZodEnum<{
            analogy: "analogy";
            formal_definition: "formal_definition";
            worked_example: "worked_example";
            concrete_example: "concrete_example";
            contrast: "contrast";
            visual_word_picture: "visual_word_picture";
            step_by_step: "step_by_step";
            common_mistake: "common_mistake";
        }>;
        outcome: z.ZodEnum<{
            failed: "failed";
            weak: "weak";
            successful: "successful";
        }>;
        usedAt: z.ZodString;
    }, z.core.$strip>>>;
    masterySnapshot: z.ZodDefault<z.ZodArray<z.ZodObject<{
        conceptId: z.ZodString;
        confusionScore: z.ZodNumber;
        evidenceCount: z.ZodNumber;
        status: z.ZodEnum<{
            taught: "taught";
            not_taught: "not_taught";
            checked: "checked";
            weak: "weak";
            partial: "partial";
            mastered: "mastered";
        }>;
    }, z.core.$strip>>>;
    resumeNotes: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    unresolvedAtuIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type SessionHandoffSnapshotInput = z.infer<typeof sessionHandoffSnapshotInputSchema>;
export declare const sessionHandoffSnapshotRecordSchema: z.ZodObject<{
    currentSectionId: z.ZodNullable<z.ZodString>;
    currentSegmentId: z.ZodString;
    currentStep: z.ZodNumber;
    explanationHistory: z.ZodDefault<z.ZodArray<z.ZodObject<{
        conceptId: z.ZodString;
        explanationType: z.ZodEnum<{
            analogy: "analogy";
            formal_definition: "formal_definition";
            worked_example: "worked_example";
            concrete_example: "concrete_example";
            contrast: "contrast";
            visual_word_picture: "visual_word_picture";
            step_by_step: "step_by_step";
            common_mistake: "common_mistake";
        }>;
        outcome: z.ZodEnum<{
            failed: "failed";
            weak: "weak";
            successful: "successful";
        }>;
        usedAt: z.ZodString;
    }, z.core.$strip>>>;
    masterySnapshot: z.ZodDefault<z.ZodArray<z.ZodObject<{
        conceptId: z.ZodString;
        confusionScore: z.ZodNumber;
        evidenceCount: z.ZodNumber;
        status: z.ZodEnum<{
            taught: "taught";
            not_taught: "not_taught";
            checked: "checked";
            weak: "weak";
            partial: "partial";
            mastered: "mastered";
        }>;
    }, z.core.$strip>>>;
    resumeNotes: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    unresolvedAtuIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
    createdAt: z.ZodString;
    sessionId: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type SessionHandoffSnapshotRecord = z.infer<typeof sessionHandoffSnapshotRecordSchema>;
//# sourceMappingURL=session-handoff.d.ts.map