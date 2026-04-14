import type {
  LessonSegmentCoverageSummary,
  TeachingPlanRecord,
} from './lesson-plan.js';
import type {
  LearningProfileSummary,
  MiniCalibrationInput,
} from './learning-profile.js';
import type {
  SessionHandoffSnapshotRecord,
  SessionMasterySnapshotItem,
} from './session-handoff.js';

export const STUDY_SESSION_MODES = [
  'full',
  'summary',
  'flashcards',
  'quiz',
  'difficult_parts',
  'images',
  'voice',
  'exam',
  'revision',
] as const;

export const STUDY_SESSION_STATUSES = [
  'created',
  'active',
  'paused',
  'abandoned',
  'completed',
  'incomplete',
] as const;

export const MOTIVATION_STATES = [
  'neutral',
  'encouraged',
  'challenged',
  'frustrated',
] as const;

export type StudySessionMode = (typeof STUDY_SESSION_MODES)[number];
export type StudySessionStatus = (typeof STUDY_SESSION_STATUSES)[number];
export type MotivationState = (typeof MOTIVATION_STATES)[number];

export const SESSION_PATHS = {
  pause: (sessionId: string) => `/api/v1/sessions/${sessionId}/pause`,
  resume: (sessionId: string) => `/api/v1/sessions/${sessionId}/resume`,
  start: '/api/v1/sessions/start',
  state: (sessionId: string) => `/api/v1/sessions/${sessionId}/state`,
} as const;

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
