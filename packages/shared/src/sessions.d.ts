import type { LessonSegmentCoverageSummary, TeachingPlanRecord } from './lesson-plan.js';
import type { LearningProfileSummary, MiniCalibrationInput } from './learning-profile.js';
import type { SessionHandoffSnapshotRecord, SessionMasterySnapshotItem } from './session-handoff.js';
export declare const STUDY_SESSION_MODES: readonly ["full", "summary", "flashcards", "quiz", "difficult_parts", "images", "voice", "exam", "revision"];
export declare const STUDY_SESSION_STATUSES: readonly ["created", "active", "paused", "abandoned", "completed", "incomplete"];
export declare const MOTIVATION_STATES: readonly ["neutral", "encouraged", "challenged", "frustrated"];
export type StudySessionMode = (typeof STUDY_SESSION_MODES)[number];
export type StudySessionStatus = (typeof STUDY_SESSION_STATUSES)[number];
export type MotivationState = (typeof MOTIVATION_STATES)[number];
export declare const SESSION_PATHS: {
    readonly pause: (sessionId: string) => string;
    readonly resume: (sessionId: string) => string;
    readonly start: "/api/v1/sessions/start";
    readonly state: (sessionId: string) => string;
};
export interface StudySessionRecord {
    createdAt: string;
    currentSectionId: string | null;
    currentSegmentId: string | null;
    currentStep: number;
    documentId: string;
    frustrationFlagCount: number;
    id: string;
    lastActiveAt: string | null;
    mode: StudySessionMode;
    motivationState: MotivationState;
    startedAt: string | null;
    status: StudySessionStatus;
    updatedAt: string;
}
export interface StudySessionLifecycleResponse {
    learningProfile: LearningProfileSummary | null;
    session: StudySessionRecord;
}
export interface StudySessionContinuityState {
    hasInterruptedState: boolean;
    interruptedAt: string | null;
    isResumable: boolean;
    masterySnapshot: SessionMasterySnapshotItem[];
    resumeNotes: string | null;
    resumeSectionId: string | null;
    resumeSegmentId: string | null;
    resumeSegmentTitle: string | null;
    resumeStep: number | null;
    unresolvedAtuIds: string[];
}
export interface StudySessionSummary {
    canComplete: boolean;
    completionBlockedReason: string;
    coverageSummary: LessonSegmentCoverageSummary;
    masteredTopics: string[];
    readinessEstimate: string;
    shakyTopics: string[];
    unresolvedAtuIds: string[];
    unresolvedTopics: string[];
}
export interface StudySessionStateResponse {
    continuity: StudySessionContinuityState;
    handoffSnapshot: SessionHandoffSnapshotRecord | null;
    learningProfile: LearningProfileSummary | null;
    session: StudySessionRecord;
    summary: StudySessionSummary;
    teachingPlan: TeachingPlanRecord;
}
export interface StartStudySessionRequest {
    calibration?: MiniCalibrationInput;
    documentId: string;
    mode?: StudySessionMode;
}
//# sourceMappingURL=sessions.d.ts.map