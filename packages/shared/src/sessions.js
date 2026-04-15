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
];
export const STUDY_SESSION_STATUSES = [
    'created',
    'active',
    'paused',
    'abandoned',
    'completed',
    'incomplete',
];
export const MOTIVATION_STATES = [
    'neutral',
    'encouraged',
    'challenged',
    'frustrated',
];
export const SESSION_PATHS = {
    pause: (sessionId) => `/api/v1/sessions/${sessionId}/pause`,
    resume: (sessionId) => `/api/v1/sessions/${sessionId}/resume`,
    start: '/api/v1/sessions/start',
    state: (sessionId) => `/api/v1/sessions/${sessionId}/state`,
};
//# sourceMappingURL=sessions.js.map