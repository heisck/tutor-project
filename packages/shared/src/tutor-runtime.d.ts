import { z } from 'zod';
export declare const tutorActionSchema: z.ZodEnum<{
    check: "check";
    skip: "skip";
    teach: "teach";
    reteach: "reteach";
    simpler: "simpler";
    complete_segment: "complete_segment";
    complete_session: "complete_session";
}>;
export type TutorAction = z.infer<typeof tutorActionSchema>;
export declare const learnerResponseSchema: z.ZodObject<{
    content: z.ZodString;
    segmentId: z.ZodString;
    sessionId: z.ZodString;
}, z.core.$strict>;
export type LearnerResponse = z.infer<typeof learnerResponseSchema>;
export declare const errorClassificationSchema: z.ZodEnum<{
    misconception: "misconception";
    partial_understanding: "partial_understanding";
    surface_memorization: "surface_memorization";
    careless_mistake: "careless_mistake";
    guessing: "guessing";
    vocabulary_block: "vocabulary_block";
    none: "none";
}>;
export type ErrorClassification = z.infer<typeof errorClassificationSchema>;
export declare const confusionSignalSchema: z.ZodEnum<{
    vague_answer: "vague_answer";
    filler_phrases: "filler_phrases";
    repeated_paraphrasing: "repeated_paraphrasing";
    correct_words_weak_reasoning: "correct_words_weak_reasoning";
    long_pause: "long_pause";
    no_signal: "no_signal";
}>;
export type ConfusionSignal = z.infer<typeof confusionSignalSchema>;
export declare const responseEvaluationSchema: z.ZodObject<{
    confusionScore: z.ZodNumber;
    confusionSignals: z.ZodArray<z.ZodEnum<{
        vague_answer: "vague_answer";
        filler_phrases: "filler_phrases";
        repeated_paraphrasing: "repeated_paraphrasing";
        correct_words_weak_reasoning: "correct_words_weak_reasoning";
        long_pause: "long_pause";
        no_signal: "no_signal";
    }>>;
    errorClassification: z.ZodEnum<{
        misconception: "misconception";
        partial_understanding: "partial_understanding";
        surface_memorization: "surface_memorization";
        careless_mistake: "careless_mistake";
        guessing: "guessing";
        vocabulary_block: "vocabulary_block";
        none: "none";
    }>;
    illusionOfUnderstanding: z.ZodBoolean;
    isCorrect: z.ZodBoolean;
    reasoning: z.ZodString;
}, z.core.$strip>;
export type ResponseEvaluation = z.infer<typeof responseEvaluationSchema>;
export declare const checkQuestionTypeSchema: z.ZodEnum<{
    error_spotting: "error_spotting";
    recall: "recall";
    paraphrase: "paraphrase";
    compare_and_contrast: "compare_and_contrast";
    apply_to_new_case: "apply_to_new_case";
    transfer_to_new_domain: "transfer_to_new_domain";
    sequence_the_steps: "sequence_the_steps";
    cause_effect_reasoning: "cause_effect_reasoning";
    prerequisite_link: "prerequisite_link";
    compression: "compression";
    reverse_reasoning: "reverse_reasoning";
    boundary_case: "boundary_case";
}>;
export type CheckQuestionType = z.infer<typeof checkQuestionTypeSchema>;
export declare const masteryEvidenceSchema: z.ZodObject<{
    checkType: z.ZodEnum<{
        error_spotting: "error_spotting";
        recall: "recall";
        paraphrase: "paraphrase";
        compare_and_contrast: "compare_and_contrast";
        apply_to_new_case: "apply_to_new_case";
        transfer_to_new_domain: "transfer_to_new_domain";
        sequence_the_steps: "sequence_the_steps";
        cause_effect_reasoning: "cause_effect_reasoning";
        prerequisite_link: "prerequisite_link";
        compression: "compression";
        reverse_reasoning: "reverse_reasoning";
        boundary_case: "boundary_case";
    }>;
    conceptId: z.ZodString;
    confusionScore: z.ZodNumber;
    evaluatedAt: z.ZodString;
    isCorrect: z.ZodBoolean;
    questionType: z.ZodString;
}, z.core.$strip>;
export type MasteryEvidence = z.infer<typeof masteryEvidenceSchema>;
export declare const conceptMasteryRecordSchema: z.ZodObject<{
    conceptId: z.ZodString;
    confusionScore: z.ZodNumber;
    evidenceHistory: z.ZodArray<z.ZodObject<{
        checkType: z.ZodEnum<{
            error_spotting: "error_spotting";
            recall: "recall";
            paraphrase: "paraphrase";
            compare_and_contrast: "compare_and_contrast";
            apply_to_new_case: "apply_to_new_case";
            transfer_to_new_domain: "transfer_to_new_domain";
            sequence_the_steps: "sequence_the_steps";
            cause_effect_reasoning: "cause_effect_reasoning";
            prerequisite_link: "prerequisite_link";
            compression: "compression";
            reverse_reasoning: "reverse_reasoning";
            boundary_case: "boundary_case";
        }>;
        conceptId: z.ZodString;
        confusionScore: z.ZodNumber;
        evaluatedAt: z.ZodString;
        isCorrect: z.ZodBoolean;
        questionType: z.ZodString;
    }, z.core.$strip>>;
    explanationTypes: z.ZodArray<z.ZodEnum<{
        analogy: "analogy";
        formal_definition: "formal_definition";
        worked_example: "worked_example";
        concrete_example: "concrete_example";
        contrast: "contrast";
        visual_word_picture: "visual_word_picture";
        step_by_step: "step_by_step";
        common_mistake: "common_mistake";
    }>>;
    status: z.ZodEnum<{
        taught: "taught";
        not_taught: "not_taught";
        checked: "checked";
        weak: "weak";
        partial: "partial";
        mastered: "mastered";
    }>;
}, z.core.$strip>;
export type ConceptMasteryRecord = z.infer<typeof conceptMasteryRecordSchema>;
export declare const tutorStepDecisionSchema: z.ZodObject<{
    action: z.ZodEnum<{
        check: "check";
        skip: "skip";
        teach: "teach";
        reteach: "reteach";
        simpler: "simpler";
        complete_segment: "complete_segment";
        complete_session: "complete_session";
    }>;
    conceptId: z.ZodString;
    nextCheckType: z.ZodNullable<z.ZodEnum<{
        error_spotting: "error_spotting";
        recall: "recall";
        paraphrase: "paraphrase";
        compare_and_contrast: "compare_and_contrast";
        apply_to_new_case: "apply_to_new_case";
        transfer_to_new_domain: "transfer_to_new_domain";
        sequence_the_steps: "sequence_the_steps";
        cause_effect_reasoning: "cause_effect_reasoning";
        prerequisite_link: "prerequisite_link";
        compression: "compression";
        reverse_reasoning: "reverse_reasoning";
        boundary_case: "boundary_case";
    }>>;
    reasoning: z.ZodString;
    segmentId: z.ZodString;
}, z.core.$strip>;
export type TutorStepDecision = z.infer<typeof tutorStepDecisionSchema>;
export declare const groundedChunkSchema: z.ZodObject<{
    content: z.ZodString;
    id: z.ZodString;
    score: z.ZodNumber;
}, z.core.$strip>;
export type GroundedChunk = z.infer<typeof groundedChunkSchema>;
export declare const tutorPromptContextSchema: z.ZodObject<{
    action: z.ZodEnum<{
        check: "check";
        skip: "skip";
        teach: "teach";
        reteach: "reteach";
        simpler: "simpler";
        complete_segment: "complete_segment";
        complete_session: "complete_session";
    }>;
    calibration: z.ZodObject<{
        academicLevel: z.ZodString;
        explanationPreference: z.ZodString;
        sessionGoal: z.ZodString;
    }, z.core.$strip>;
    conceptTitle: z.ZodString;
    explanationStrategy: z.ZodString;
    groundedEvidence: z.ZodArray<z.ZodObject<{
        content: z.ZodString;
        id: z.ZodString;
        score: z.ZodNumber;
    }, z.core.$strip>>;
    masteryState: z.ZodNullable<z.ZodObject<{
        conceptId: z.ZodString;
        confusionScore: z.ZodNumber;
        evidenceHistory: z.ZodArray<z.ZodObject<{
            checkType: z.ZodEnum<{
                error_spotting: "error_spotting";
                recall: "recall";
                paraphrase: "paraphrase";
                compare_and_contrast: "compare_and_contrast";
                apply_to_new_case: "apply_to_new_case";
                transfer_to_new_domain: "transfer_to_new_domain";
                sequence_the_steps: "sequence_the_steps";
                cause_effect_reasoning: "cause_effect_reasoning";
                prerequisite_link: "prerequisite_link";
                compression: "compression";
                reverse_reasoning: "reverse_reasoning";
                boundary_case: "boundary_case";
            }>;
            conceptId: z.ZodString;
            confusionScore: z.ZodNumber;
            evaluatedAt: z.ZodString;
            isCorrect: z.ZodBoolean;
            questionType: z.ZodString;
        }, z.core.$strip>>;
        explanationTypes: z.ZodArray<z.ZodEnum<{
            analogy: "analogy";
            formal_definition: "formal_definition";
            worked_example: "worked_example";
            concrete_example: "concrete_example";
            contrast: "contrast";
            visual_word_picture: "visual_word_picture";
            step_by_step: "step_by_step";
            common_mistake: "common_mistake";
        }>>;
        status: z.ZodEnum<{
            taught: "taught";
            not_taught: "not_taught";
            checked: "checked";
            weak: "weak";
            partial: "partial";
            mastered: "mastered";
        }>;
    }, z.core.$strip>>;
    previousExplanationTypes: z.ZodArray<z.ZodEnum<{
        analogy: "analogy";
        formal_definition: "formal_definition";
        worked_example: "worked_example";
        concrete_example: "concrete_example";
        contrast: "contrast";
        visual_word_picture: "visual_word_picture";
        step_by_step: "step_by_step";
        common_mistake: "common_mistake";
    }>>;
    segmentCheckPrompt: z.ZodString;
    segmentAnalogyPrompt: z.ZodString;
}, z.core.$strip>;
export type TutorPromptContext = z.infer<typeof tutorPromptContextSchema>;
export declare const explanationAttemptSchema: z.ZodObject<{
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
export type ExplanationAttempt = z.infer<typeof explanationAttemptSchema>;
export declare const coverageAuditResultSchema: z.ZodObject<{
    canComplete: z.ZodBoolean;
    masteredCount: z.ZodNumber;
    partialCount: z.ZodNumber;
    taughtCount: z.ZodNumber;
    totalConcepts: z.ZodNumber;
    unresolvedConceptIds: z.ZodArray<z.ZodString>;
    weakCount: z.ZodNumber;
}, z.core.$strip>;
export type CoverageAuditResult = z.infer<typeof coverageAuditResultSchema>;
export declare const compressedLearningStateSchema: z.ZodObject<{
    compressedAt: z.ZodString;
    conceptCount: z.ZodNumber;
    masteredConcepts: z.ZodArray<z.ZodString>;
    summary: z.ZodString;
    weakConcepts: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type CompressedLearningState = z.infer<typeof compressedLearningStateSchema>;
export declare const TUTOR_RUNTIME_PATHS: {
    readonly evaluate: "/api/v1/tutor/evaluate";
    readonly next: "/api/v1/tutor/next";
};
//# sourceMappingURL=tutor-runtime.d.ts.map