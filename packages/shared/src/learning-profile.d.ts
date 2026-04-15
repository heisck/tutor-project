import type { AcademicLevel } from './profile.js';
export declare const STUDY_GOAL_PREFERENCES: readonly ["pass_exam", "deep_understanding", "quick_overview", "build_project"];
export declare const EXPLANATION_START_PREFERENCES: readonly ["example_first", "direct", "why_first"];
export type StudyGoalPreference = (typeof STUDY_GOAL_PREFERENCES)[number];
export type ExplanationStartPreference = (typeof EXPLANATION_START_PREFERENCES)[number];
export interface MiniCalibrationInput {
    academicLevel: AcademicLevel;
    explanationStartPreference: ExplanationStartPreference;
    sessionGoal: StudyGoalPreference;
}
export interface LearningProfileSummary {
    academicLevel: AcademicLevel;
    explanationStartPreference: ExplanationStartPreference;
    lastCalibratedAt: string | null;
    sessionGoal: StudyGoalPreference;
}
//# sourceMappingURL=learning-profile.d.ts.map