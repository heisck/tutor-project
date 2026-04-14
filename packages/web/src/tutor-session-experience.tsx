'use client';

import {
  ACADEMIC_LEVELS,
  EXPLANATION_START_PREFERENCES,
  STUDY_GOAL_PREFERENCES,
  type SessionHandoffSnapshotInput,
  type TutorStreamEvent,
} from '@ai-tutor-pwa/shared';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { ExplanationRenderer } from './explanation-renderer';
import {
  ApiClientError,
  askTutorAssistant,
  fetchStudySessionState,
  pauseStudySession,
  resumeStudySession,
  startStudySession,
  streamTutorSession,
  submitFeedback,
  submitLearnerResponse,
} from './tutor-session-api';
import {
  startSessionFormSchema,
  tutorMessageRecordSchema,
  type FeedbackSubmissionResponseModel,
  type StartSessionForm,
  type TutorAssistantQuestionResponseModel,
  type StudySessionStateResponseModel,
  type TutorEvaluationResponseModel,
  type TutorMessageRecord,
} from './tutor-session-contracts';

interface TutorSessionExperienceProps {
  apiBaseUrl: string;
}

type RequestState = 'idle' | 'loading' | 'success' | 'error';
type StreamState = 'idle' | 'connecting' | 'streaming' | 'ready' | 'error';
type HydrateBehavior = 'auto' | 'always' | 'never';
type FeedbackSubmissionContentType = 'assistant_answer' | 'tutor_explanation';
type FeedbackSubmissionReason = 'hallucination' | 'poor_explanation';

const defaultStartForm: StartSessionForm = {
  academicLevel: 'undergraduate',
  documentId: '',
  explanationStartPreference: 'example_first',
  sessionGoal: 'deep_understanding',
};

export function TutorSessionExperience({
  apiBaseUrl,
}: TutorSessionExperienceProps) {
  const [startForm, setStartForm] = useState<StartSessionForm>(defaultStartForm);
  const [startRequestState, setStartRequestState] = useState<RequestState>('idle');
  const [startError, setStartError] = useState<string | null>(null);
  const [sessionState, setSessionState] =
    useState<StudySessionStateResponseModel | null>(null);
  const [sessionLoadState, setSessionLoadState] =
    useState<RequestState>('idle');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionActionState, setSessionActionState] =
    useState<RequestState>('idle');
  const [actionError, setActionError] = useState<string | null>(null);
  const [streamState, setStreamState] = useState<StreamState>('idle');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [messages, setMessages] = useState<TutorMessageRecord[]>([]);
  const [responseDraft, setResponseDraft] = useState('');
  const [responseState, setResponseState] = useState<RequestState>('idle');
  const [responseError, setResponseError] = useState<string | null>(null);
  const [evaluation, setEvaluation] =
    useState<TutorEvaluationResponseModel | null>(null);
  const [assistantDraft, setAssistantDraft] = useState('');
  const [assistantState, setAssistantState] = useState<RequestState>('idle');
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [assistantResponse, setAssistantResponse] =
    useState<TutorAssistantQuestionResponseModel | null>(null);
  const [feedbackStates, setFeedbackStates] = useState<Record<string, RequestState>>(
    {},
  );
  const [feedbackMessages, setFeedbackMessages] = useState<Record<string, string>>(
    {},
  );
  const streamAbortControllerRef = useRef<AbortController | null>(null);

  const currentSegment =
    sessionState?.teachingPlan.segments.find(
      (segment) => segment.id === sessionState.session.currentSegmentId,
    ) ??
    sessionState?.teachingPlan.segments.find(
      (segment) => segment.id === sessionState?.continuity.resumeSegmentId,
    ) ??
    sessionState?.teachingPlan.segments[0] ??
    null;
  const learningProfile = sessionState?.learningProfile ?? null;
  const continuity = sessionState?.continuity ?? null;
  const summary = sessionState?.summary ?? null;
  const isSessionActive = sessionState?.session.status === 'active';
  const isSessionPaused = sessionState?.session.status === 'paused';

  useEffect(() => {
    const sessionId = readSessionIdFromUrl();

    if (sessionId !== null) {
      void hydrateSessionFromServer(sessionId, 'auto');
    }

    return () => {
      disconnectTutorStream();
    };
  }, []);

  async function hydrateSessionFromServer(
    sessionId: string,
    behavior: HydrateBehavior,
  ): Promise<void> {
    setSessionLoadState('loading');
    setSessionError(null);

    try {
      const nextState = await fetchStudySessionState(apiBaseUrl, sessionId);
      applySessionState(nextState);
      setSessionLoadState('success');

      const shouldStartStream =
        behavior === 'always' ||
        (behavior === 'auto' && nextState.session.status === 'active');

      if (shouldStartStream) {
        await connectTutorStream(nextState.session.id);
      } else if (nextState.session.status !== 'active') {
        disconnectTutorStream();
      }
    } catch (error) {
      setSessionLoadState('error');
      setSessionError(toErrorMessage(error));
    }
  }

  async function connectTutorStream(sessionId: string): Promise<void> {
    streamAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    streamAbortControllerRef.current = abortController;
    setStreamState('connecting');
    setStreamError(null);

    try {
      await streamTutorSession(
        apiBaseUrl,
        sessionId,
        (event) => {
          handleTutorStreamEvent(event);
        },
        abortController.signal,
      );

      setStreamState('ready');
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      setStreamState('error');
      setStreamError(toErrorMessage(error));
    }
  }

  function disconnectTutorStream(): void {
    streamAbortControllerRef.current?.abort();
    streamAbortControllerRef.current = null;
    setStreamState('idle');
  }

  function applySessionState(nextState: StudySessionStateResponseModel): void {
    setSessionState(nextState);
    setStartForm((currentForm) => ({
      academicLevel:
        nextState.learningProfile?.academicLevel ?? currentForm.academicLevel,
      documentId: nextState.session.documentId,
      explanationStartPreference:
        nextState.learningProfile?.explanationStartPreference ??
        currentForm.explanationStartPreference,
      sessionGoal:
        nextState.learningProfile?.sessionGoal ?? currentForm.sessionGoal,
    }));
    writeSessionIdToUrl(nextState.session.id);
  }

  function handleTutorStreamEvent(event: TutorStreamEvent): void {
    switch (event.type) {
      case 'control':
        setStreamState('streaming');
        return;
      case 'progress':
        setStreamState('streaming');
        setSessionState((currentState) => {
          if (currentState === null || currentState.session.id !== event.data.sessionId) {
            return currentState;
          }

          return {
            ...currentState,
            session: {
              ...currentState.session,
              currentSegmentId: event.data.currentSegmentId,
              currentStep: event.data.currentStep,
            },
          };
        });
        return;
      case 'message':
        setMessages((currentMessages) => {
          const parsedMessage = tutorMessageRecordSchema.parse({
            content: event.data.content,
            id: event.data.messageId,
            segmentId: event.data.segmentId,
          });
          const existingIndex = currentMessages.findIndex(
            (message) => message.id === parsedMessage.id,
          );

          if (existingIndex >= 0) {
            return currentMessages.map((message, index) =>
              index === existingIndex ? parsedMessage : message,
            );
          }

          return [...currentMessages, parsedMessage];
        });
        return;
      case 'completion':
        setStreamState('ready');
        return;
    }
  }

  async function handleStartSession(): Promise<void> {
    setStartRequestState('loading');
    setStartError(null);
    setSessionError(null);
    setActionError(null);
    setMessages([]);
    setEvaluation(null);
    setResponseDraft('');
    setResponseError(null);
    setResponseState('idle');
    setAssistantDraft('');
    setAssistantError(null);
    setAssistantResponse(null);
    setAssistantState('idle');
    setFeedbackMessages({});
    setFeedbackStates({});

    try {
      const parsedForm = startSessionFormSchema.parse(startForm);
      const createdSession = await startStudySession(apiBaseUrl, parsedForm);
      await hydrateSessionFromServer(createdSession.session.id, 'always');
      setStartRequestState('success');
    } catch (error) {
      setStartRequestState('error');
      setStartError(toErrorMessage(error));
    }
  }

  async function handlePauseSession(): Promise<void> {
    if (sessionState === null) {
      setSessionActionState('error');
      setActionError('Start a study session before pausing it.');
      return;
    }

    setSessionActionState('loading');
    setActionError(null);

    try {
      await pauseStudySession(
        apiBaseUrl,
        sessionState.session.id,
        buildPauseHandoffInput(sessionState),
      );
      await hydrateSessionFromServer(sessionState.session.id, 'never');
      setSessionActionState('success');
    } catch (error) {
      setSessionActionState('error');
      setActionError(toErrorMessage(error));
    }
  }

  async function handleResumeSession(): Promise<void> {
    if (sessionState === null) {
      setSessionActionState('error');
      setActionError('Reload a paused study session before resuming it.');
      return;
    }

    setSessionActionState('loading');
    setActionError(null);

    try {
      await resumeStudySession(apiBaseUrl, sessionState.session.id);
      await hydrateSessionFromServer(sessionState.session.id, 'always');
      setSessionActionState('success');
    } catch (error) {
      setSessionActionState('error');
      setActionError(toErrorMessage(error));
    }
  }

  async function handleSubmitLearnerResponse(): Promise<void> {
    if (sessionState === null || currentSegment === null) {
      setResponseState('error');
      setResponseError('Start or reload a study session before submitting a response.');
      return;
    }

    setResponseState('loading');
    setResponseError(null);
    setEvaluation(null);

    try {
      const result = await submitLearnerResponse(apiBaseUrl, {
        content: responseDraft,
        segmentId: currentSegment.id,
        sessionId: sessionState.session.id,
      });
      setEvaluation(result);
      setResponseDraft('');
      await hydrateSessionFromServer(sessionState.session.id, 'never');
      setResponseState('success');
    } catch (error) {
      setResponseState('error');
      setResponseError(toErrorMessage(error));
    }
  }

  async function handleAskAssistant(): Promise<void> {
    if (sessionState === null) {
      setAssistantState('error');
      setAssistantError('Start or reload a study session before asking the assistant.');
      return;
    }

    setAssistantState('loading');
    setAssistantError(null);

    try {
      const result = await askTutorAssistant(apiBaseUrl, {
        question: assistantDraft,
        sessionId: sessionState.session.id,
      });
      setAssistantResponse(result);
      setAssistantState('success');
    } catch (error) {
      setAssistantState('error');
      setAssistantError(toErrorMessage(error));
    }
  }

  async function handleSubmitFeedback(input: {
    contentType: FeedbackSubmissionContentType;
    lessonSegmentId: string;
    messageId: string | null;
    reason: FeedbackSubmissionReason;
  }): Promise<void> {
    if (sessionState === null) {
      return;
    }

    const targetKey = buildFeedbackTargetKey(input);
    setFeedbackStates((current) => ({
      ...current,
      [targetKey]: 'loading',
    }));
    setFeedbackMessages((current) => {
      const next = { ...current };
      delete next[targetKey];
      return next;
    });

    try {
      const result = await submitFeedback(apiBaseUrl, {
        contentType: input.contentType,
        lessonSegmentId: input.lessonSegmentId,
        messageId: input.messageId,
        reason: input.reason,
        sessionId: sessionState.session.id,
      });
      setFeedbackStates((current) => ({
        ...current,
        [targetKey]: 'success',
      }));
      setFeedbackMessages((current) => ({
        ...current,
        [targetKey]: buildFeedbackSuccessMessage(result),
      }));
    } catch (error) {
      setFeedbackStates((current) => ({
        ...current,
        [targetKey]: 'error',
      }));
      setFeedbackMessages((current) => ({
        ...current,
        [targetKey]: toErrorMessage(error),
      }));
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-5 py-10 md:px-8 lg:px-10">
      <section className="grid gap-5 rounded-[2rem] border border-amber-200/80 bg-white/78 p-6 shadow-[0_24px_80px_rgba(86,46,24,0.12)] backdrop-blur lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">
            Session Experience
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            Tutor with durable continuity, pause safely, and resume from the last
            persisted learning checkpoint.
          </h1>
          <p className="max-w-3xl text-base leading-7 text-slate-700">
            This surface uses the server-backed session read model for calibration,
            pause and resume controls, continuity indicators, and the learner summary.
            No study progress is reconstructed from browser-only state.
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950/[0.04] p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatusChip label="Start request" state={startRequestState} />
            <StatusChip label="Session state" state={sessionLoadState} />
            <StatusChip label="Session actions" state={sessionActionState} />
            <StatusChip label="Tutor stream" state={mapStreamState(streamState)} />
            <StatusChip label="Learner response" state={responseState} />
            <StatusChip label="Assistant" state={assistantState} />
          </div>
          <div className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
            <p>
              Authenticated API origin: <span className="font-semibold">{apiBaseUrl}</span>
            </p>
            <p>
              Active session ID:{' '}
              <span className="font-semibold">{sessionState?.session.id ?? 'none yet'}</span>
            </p>
            {learningProfile !== null ? (
              <p>
                Current calibration: {humanizeValue(learningProfile.academicLevel)} /{' '}
                {humanizeValue(learningProfile.sessionGoal)} /{' '}
                {humanizeValue(learningProfile.explanationStartPreference)}
              </p>
            ) : (
              <p>Submit the mini-calibration below to bootstrap the first tutoring plan.</p>
            )}
            {continuity?.hasInterruptedState ? (
              <p>
                Saved interruption: {continuity.resumeSegmentTitle ?? 'unknown concept'} at
                step {continuity.resumeStep ?? 0}.
              </p>
            ) : null}
          </div>
        </div>

      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.3fr]">
        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/84 p-6 shadow-[0_20px_70px_rgba(30,40,70,0.09)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">
                  Mini Calibration
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  These values shape the teaching plan and the first explanation style.
                </p>
              </div>
              {sessionState !== null ? (
                <button
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                  onClick={() => void hydrateSessionFromServer(sessionState.session.id, 'never')}
                  type="button"
                >
                  Refresh Server State
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4">
              <Field label="Document ID">
                <input
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-amber-600"
                  onChange={(event) =>
                    setStartForm((currentForm) => ({
                      ...currentForm,
                      documentId: event.target.value,
                    }))
                  }
                  placeholder="Paste the processed document ID"
                  value={startForm.documentId}
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Academic Level">
                  <select
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-amber-600"
                    onChange={(event) =>
                      setStartForm((currentForm) => ({
                        ...currentForm,
                        academicLevel: event.target.value as StartSessionForm['academicLevel'],
                      }))
                    }
                    value={startForm.academicLevel}
                  >
                    {ACADEMIC_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {humanizeValue(level)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Session Goal">
                  <select
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-amber-600"
                    onChange={(event) =>
                      setStartForm((currentForm) => ({
                        ...currentForm,
                        sessionGoal: event.target.value as StartSessionForm['sessionGoal'],
                      }))
                    }
                    value={startForm.sessionGoal}
                  >
                    {STUDY_GOAL_PREFERENCES.map((goal) => (
                      <option key={goal} value={goal}>
                        {humanizeValue(goal)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Explanation Start">
                  <select
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-amber-600"
                    onChange={(event) =>
                      setStartForm((currentForm) => ({
                        ...currentForm,
                        explanationStartPreference:
                          event.target.value as StartSessionForm['explanationStartPreference'],
                      }))
                    }
                    value={startForm.explanationStartPreference}
                  >
                    {EXPLANATION_START_PREFERENCES.map((preference) => (
                      <option key={preference} value={preference}>
                        {humanizeValue(preference)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            {startError !== null ? (
              <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {startError}
              </p>
            ) : null}

            <button
              className="mt-5 inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={startRequestState === 'loading'}
              onClick={() => void handleStartSession()}
              type="button"
            >
              {startRequestState === 'loading' ? 'Starting session...' : 'Start tutoring session'}
            </button>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/84 p-6 shadow-[0_20px_70px_rgba(30,40,70,0.09)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">
                  Learner Response
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Submit your answer against the current tutor prompt. Pause and
                  resume stay attached to the same persisted session.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {sessionState !== null ? (
                  <button
                    className="rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    disabled={!isSessionActive || sessionActionState === 'loading'}
                    onClick={() => void handlePauseSession()}
                    type="button"
                  >
                    {sessionActionState === 'loading' && isSessionActive
                      ? 'Pausing session...'
                      : 'Pause session'}
                  </button>
                ) : null}
                {sessionState !== null ? (
                  <button
                    className="rounded-full border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 transition hover:border-amber-500 hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-amber-100 disabled:bg-amber-50 disabled:text-amber-300"
                    disabled={!isSessionPaused || sessionActionState === 'loading'}
                    onClick={() => void handleResumeSession()}
                    type="button"
                  >
                    {sessionActionState === 'loading' && isSessionPaused
                      ? 'Resuming session...'
                      : 'Resume session'}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm leading-6 text-slate-700">
              <p className="font-semibold text-slate-950">Current concept</p>
              <p className="mt-1">
                {currentSegment?.conceptTitle ?? 'No active lesson segment yet'}
              </p>
              {currentSegment !== null ? (
                <p className="mt-2 text-slate-600">
                  Check prompt: {currentSegment.checkPrompt}
                </p>
              ) : null}
              {continuity?.resumeNotes !== null ? (
                <p className="mt-2 text-slate-600">
                  Saved resume note: {continuity?.resumeNotes}
                </p>
              ) : null}
            </div>

            <textarea
              className="mt-4 min-h-40 w-full rounded-[1.5rem] border border-slate-300 bg-white px-4 py-4 text-base text-slate-900 outline-none transition focus:border-amber-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              disabled={!isSessionActive}
              onChange={(event) => setResponseDraft(event.target.value)}
              placeholder={
                isSessionActive
                  ? currentSegment?.checkPrompt ??
                    'Write your explanation, answer, or reasoning here.'
                  : 'Resume the session before submitting another learner response.'
              }
              value={responseDraft}
            />

            {actionError !== null ? (
              <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {actionError}
              </p>
            ) : null}
            {responseError !== null ? (
              <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {responseError}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                className="inline-flex items-center justify-center rounded-full bg-amber-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-amber-400"
                disabled={!isSessionActive || responseState === 'loading'}
                onClick={() => void handleSubmitLearnerResponse()}
                type="button"
              >
                {responseState === 'loading' ? 'Submitting response...' : 'Submit learner response'}
              </button>

              {sessionState !== null ? (
                <button
                  className="rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  disabled={!isSessionActive}
                  onClick={() => void connectTutorStream(sessionState.session.id)}
                  type="button"
                >
                  Refresh tutor explanation
                </button>
              ) : null}
            </div>

            {evaluation !== null ? (
              <div className="mt-5 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/70 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-950">
                    Response evaluated
                  </h3>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    {humanizeValue(evaluation.mastery.status)}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-slate-950">Reasoning</dt>
                    <dd>{evaluation.evaluation.reasoning}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-950">Confusion score</dt>
                    <dd>{evaluation.evaluation.confusionScore.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-950">Previous mastery</dt>
                    <dd>{humanizeValue(evaluation.mastery.previousStatus)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-950">Signals</dt>
                    <dd>{evaluation.evaluation.confusionSignals.map(humanizeValue).join(', ')}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/84 p-6 shadow-[0_20px_70px_rgba(30,40,70,0.09)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">
                  Tutor Explanation Stream
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Formula-capable rendering stays safe by treating tutor text as content
                  and only rendering math through KaTeX.
                </p>
              </div>
              <StreamBadge state={streamState} />
            </div>

            {streamError !== null ? (
              <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {streamError}
              </p>
            ) : null}
            {sessionError !== null ? (
              <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {sessionError}
              </p>
            ) : null}

            <div className="mt-5 space-y-4">
              {messages.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center text-sm leading-6 text-slate-600">
                  {isSessionPaused
                    ? 'This session is paused. Resume it to continue streaming tutor guidance from the saved checkpoint.'
                    : 'Start a session to stream the tutor explanation here. Reloading a saved session ID from the URL will also restore the server-backed tutoring context.'}
                </div>
              ) : (
                messages.map((message) => (
                  <article
                    className="rounded-[1.5rem] border border-slate-200 bg-slate-50/90 p-5"
                    key={message.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
                        Tutor message
                      </p>
                      <p className="text-xs text-slate-500">
                        Segment {message.segmentId ?? 'unscoped'}
                      </p>
                    </div>
                    <div className="mt-4">
                      <ExplanationRenderer content={message.content} />
                    </div>
                    {message.segmentId !== null ? (
                      <FeedbackActionRow
                        message={feedbackMessages[
                          buildFeedbackTargetKey({
                            contentType: 'tutor_explanation',
                            lessonSegmentId: message.segmentId,
                            messageId: message.id,
                          })
                        ]}
                        onReport={(reason) =>
                          void handleSubmitFeedback({
                            contentType: 'tutor_explanation',
                            lessonSegmentId: message.segmentId!,
                            messageId: message.id,
                            reason,
                          })
                        }
                        state={
                          feedbackStates[
                            buildFeedbackTargetKey({
                              contentType: 'tutor_explanation',
                              lessonSegmentId: message.segmentId,
                              messageId: message.id,
                            })
                          ] ?? 'idle'
                        }
                      />
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/84 p-6 shadow-[0_20px_70px_rgba(30,40,70,0.09)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">
                  Session Assistant
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Ask a freeform question without leaving the tutoring flow. The
                  backend scopes every question to the authenticated session and
                  its current document automatically.
                </p>
              </div>
              {assistantResponse !== null ? (
                <AssistantOutcomeBadge outcome={assistantResponse.outcome} />
              ) : null}
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-700">
              Active document scope:{' '}
              <span className="font-semibold">
                {sessionState?.session.documentId ?? 'not loaded yet'}
              </span>
            </p>

            <textarea
              className="mt-4 min-h-32 w-full rounded-[1.5rem] border border-slate-300 bg-white px-4 py-4 text-base text-slate-900 outline-none transition focus:border-amber-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              disabled={!isSessionActive}
              onChange={(event) => setAssistantDraft(event.target.value)}
              placeholder={
                isSessionActive
                  ? 'Ask a question about this session document.'
                  : 'Resume or start an active session before asking the assistant.'
              }
              value={assistantDraft}
            />

            {assistantError !== null ? (
              <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {assistantError}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={!isSessionActive || assistantState === 'loading'}
                onClick={() => void handleAskAssistant()}
                type="button"
              >
                {assistantState === 'loading'
                  ? 'Asking assistant...'
                  : 'Ask session assistant'}
              </button>
            </div>

            {assistantResponse === null ? (
              <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm leading-6 text-slate-600">
                Answers render here with explicit grounding or refusal states so
                the learner can see when the assistant has enough document support.
              </div>
            ) : (
              <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-sm leading-6 text-slate-700">
                  {describeAssistantOutcome(assistantResponse.outcome)}
                </p>
                <div className="mt-4 rounded-[1.3rem] border border-slate-200 bg-white p-4">
                  <ExplanationRenderer content={assistantResponse.answer} />
                </div>
                {assistantResponse.understandingCheck !== null ? (
                  <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Understanding check: {assistantResponse.understandingCheck}
                  </p>
                ) : null}
                {assistantResponse.currentSegmentId !== null ? (
                  <FeedbackActionRow
                    message={feedbackMessages[
                      buildFeedbackTargetKey({
                        contentType: 'assistant_answer',
                        lessonSegmentId: assistantResponse.currentSegmentId,
                        messageId: null,
                      })
                    ]}
                    onReport={(reason) =>
                      void handleSubmitFeedback({
                        contentType: 'assistant_answer',
                        lessonSegmentId: assistantResponse.currentSegmentId!,
                        messageId: null,
                        reason,
                      })
                    }
                    state={
                      feedbackStates[
                        buildFeedbackTargetKey({
                          contentType: 'assistant_answer',
                          lessonSegmentId: assistantResponse.currentSegmentId,
                          messageId: null,
                        })
                      ] ?? 'idle'
                    }
                  />
                ) : null}
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Grounding evidence
                  </p>
                  {assistantResponse.groundedEvidence.length === 0 ? (
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      No document chunks met the grounding threshold for this
                      question.
                    </p>
                  ) : (
                    <ul className="mt-3 grid gap-3 text-sm leading-6 text-slate-700">
                      {assistantResponse.groundedEvidence.map((chunk) => (
                        <li
                          className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3"
                          key={chunk.id}
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Score {chunk.score.toFixed(2)}
                          </p>
                          <p className="mt-2">{chunk.content}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/84 p-6 shadow-[0_20px_70px_rgba(30,40,70,0.09)]">
            <h2 className="text-2xl font-semibold text-slate-950">
              Session Continuity
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Resume points, interruptions, and tutor handoff data come directly from
              the persisted session read model.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <MetricCard
                label="Session status"
                value={sessionState?.session.status ?? 'not started'}
              />
              <MetricCard
                label="Resume point"
                value={continuity?.resumeSegmentTitle ?? currentSegment?.conceptTitle ?? 'none'}
              />
              <MetricCard
                label="Resume step"
                value={
                  continuity?.resumeStep === null || continuity?.resumeStep === undefined
                    ? 'not captured'
                    : String(continuity.resumeStep)
                }
              />
              <MetricCard
                label="Saved interruptions"
                value={continuity?.hasInterruptedState ? 'captured' : 'none'}
              />
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5 text-sm leading-6 text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Persisted handoff
              </p>
              <p className="mt-2">
                Interrupted at: {formatDateTime(continuity?.interruptedAt ?? null)}
              </p>
              <p className="mt-2">
                Resume note: {continuity?.resumeNotes ?? 'No resume note saved yet.'}
              </p>
              <p className="mt-2">
                Unresolved ATUs captured: {summary?.unresolvedAtuIds.length ?? 0}
              </p>
              <p className="mt-2">
                Mastery snapshot entries: {continuity?.masterySnapshot.length ?? 0}
              </p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/84 p-6 shadow-[0_20px_70px_rgba(30,40,70,0.09)]">
            <h2 className="text-2xl font-semibold text-slate-950">
              {sessionState?.session.status === 'completed' ||
              sessionState?.session.status === 'incomplete'
                ? 'Session Summary'
                : 'Persisted Learning Summary'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Coverage, mastery, and readiness are rendered from the server-backed
              summary projection, not from client-side reconstruction.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <MetricCard
                label="Readiness"
                value={summary?.readinessEstimate ?? 'not available'}
              />
              <MetricCard
                label="Completion gate"
                value={
                  summary === null
                    ? 'not available'
                    : summary.canComplete
                      ? 'ready to complete'
                      : 'more work required'
                }
              />
              <MetricCard
                label="Coverage assessed"
                value={String(summary?.coverageSummary.assessed ?? 0)}
              />
              <MetricCard
                label="Coverage unresolved"
                value={String(summary?.unresolvedAtuIds.length ?? 0)}
              />
            </div>

            {summary !== null ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <SummaryList
                  emptyLabel="No mastered topics recorded yet."
                  items={summary.masteredTopics}
                  title="Owned now"
                />
                <SummaryList
                  emptyLabel="No shaky topics recorded."
                  items={summary.shakyTopics}
                  title="Still shaky"
                />
                <SummaryList
                  emptyLabel="No unresolved topics remain."
                  items={summary.unresolvedTopics}
                  title="Unresolved topics"
                />
                <SummaryList
                  emptyLabel="No unresolved ATUs remain."
                  items={summary.unresolvedAtuIds}
                  title="Unresolved ATUs"
                />
              </div>
            ) : null}

            {summary !== null ? (
              <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5 text-sm leading-6 text-slate-700">
                <p className="font-semibold text-slate-950">Completion check</p>
                <p className="mt-2">{summary.completionBlockedReason}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <CompactMetric
                    label="Assessed"
                    value={summary.coverageSummary.assessed}
                  />
                  <CompactMetric
                    label="In progress"
                    value={summary.coverageSummary.inProgress}
                  />
                  <CompactMetric
                    label="Taught"
                    value={summary.coverageSummary.taught}
                  />
                  <CompactMetric
                    label="Not taught"
                    value={summary.coverageSummary.notTaught}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  children,
  label,
}: Readonly<{
  children: ReactNode;
  label: string;
}>) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function MetricCard({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/75 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-950">
        {humanizeValue(value)}
      </p>
    </div>
  );
}

function CompactMetric({
  label,
  value,
}: Readonly<{
  label: string;
  value: number;
}>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function SummaryList({
  emptyLabel,
  items,
  title,
}: Readonly<{
  emptyLabel: string;
  items: readonly string[];
  title: string;
}>) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
          {items.map((item) => (
            <li
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2"
              key={item}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatusChip({
  label,
  state,
}: Readonly<{
  label: string;
  state: RequestState;
}>) {
  const palette = getRequestStatePalette(state);

  return (
    <div className={`rounded-2xl border px-4 py-3 ${palette.containerClassName}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-sm font-semibold ${palette.labelClassName}`}>
        {humanizeValue(state)}
      </p>
    </div>
  );
}

function StreamBadge({
  state,
}: Readonly<{
  state: StreamState;
}>) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${getStreamStatePalette(state)}`}>
      {humanizeValue(state)}
    </span>
  );
}

function FeedbackActionRow({
  message,
  onReport,
  state,
}: Readonly<{
  message: string | undefined;
  onReport: (reason: FeedbackSubmissionReason) => void;
  state: RequestState;
}>) {
  return (
    <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 transition hover:border-rose-500 hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-rose-100 disabled:bg-rose-50 disabled:text-rose-300"
          disabled={state === 'loading'}
          onClick={() => onReport('hallucination')}
          type="button"
        >
          Report hallucination
        </button>
        <button
          className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800 transition hover:border-amber-500 hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-amber-100 disabled:bg-amber-50 disabled:text-amber-300"
          disabled={state === 'loading'}
          onClick={() => onReport('poor_explanation')}
          type="button"
        >
          Report poor explanation
        </button>
      </div>
      {message !== undefined ? (
        <p className={`mt-3 text-sm leading-6 ${getFeedbackMessageClassName(state)}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

function AssistantOutcomeBadge({
  outcome,
}: Readonly<{
  outcome: TutorAssistantQuestionResponseModel['outcome'];
}>) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${getAssistantOutcomePalette(
        outcome,
      )}`}
    >
      {humanizeValue(outcome)}
    </span>
  );
}

function buildFeedbackTargetKey(input: {
  contentType: FeedbackSubmissionContentType;
  lessonSegmentId: string;
  messageId: string | null;
}): string {
  return `${input.contentType}:${input.lessonSegmentId}:${input.messageId ?? 'none'}`;
}

function buildFeedbackSuccessMessage(
  response: FeedbackSubmissionResponseModel,
): string {
  switch (response.threshold.status) {
    case 'threshold_triggered':
      return 'Feedback recorded and escalated for operator review.';
    case 'already_triggered':
      return 'Feedback recorded. This tutoring path is already queued for review.';
    case 'recorded':
      return 'Feedback recorded for review.';
  }
}

function getRequestStatePalette(state: RequestState) {
  switch (state) {
    case 'loading':
      return {
        containerClassName: 'border-sky-200 bg-sky-50',
        labelClassName: 'text-sky-700',
      };
    case 'success':
      return {
        containerClassName: 'border-emerald-200 bg-emerald-50',
        labelClassName: 'text-emerald-700',
      };
    case 'error':
      return {
        containerClassName: 'border-rose-200 bg-rose-50',
        labelClassName: 'text-rose-700',
      };
    default:
      return {
        containerClassName: 'border-slate-200 bg-white/80',
        labelClassName: 'text-slate-700',
      };
  }
}

function getStreamStatePalette(state: StreamState): string {
  switch (state) {
    case 'connecting':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'streaming':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'ready':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'error':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-slate-200 bg-white text-slate-700';
  }
}

function getAssistantOutcomePalette(
  outcome: TutorAssistantQuestionResponseModel['outcome'],
): string {
  switch (outcome) {
    case 'answered':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'weak_grounding':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'refused':
      return 'border-rose-200 bg-rose-50 text-rose-700';
  }
}

function getFeedbackMessageClassName(state: RequestState): string {
  switch (state) {
    case 'error':
      return 'text-rose-700';
    case 'success':
      return 'text-emerald-700';
    case 'loading':
      return 'text-sky-700';
    case 'idle':
      return 'text-slate-600';
  }
}

function mapStreamState(streamState: StreamState): RequestState {
  switch (streamState) {
    case 'connecting':
    case 'streaming':
      return 'loading';
    case 'ready':
      return 'success';
    case 'error':
      return 'error';
    case 'idle':
      return 'idle';
  }
}

function describeAssistantOutcome(
  outcome: TutorAssistantQuestionResponseModel['outcome'],
): string {
  switch (outcome) {
    case 'answered':
      return 'The assistant found enough document support to answer directly.';
    case 'weak_grounding':
      return 'The assistant found only partial support, so the answer is intentionally cautious.';
    case 'refused':
      return 'The assistant refused to guess because the question was not grounded strongly enough in the document.';
  }
}

function buildPauseHandoffInput(
  sessionState: StudySessionStateResponseModel,
): SessionHandoffSnapshotInput | undefined {
  const resumeSegmentId =
    sessionState.continuity.resumeSegmentId ??
    sessionState.session.currentSegmentId ??
    sessionState.teachingPlan.currentSegmentId;

  if (resumeSegmentId === null) {
    return undefined;
  }

  return {
    currentSectionId:
      sessionState.continuity.resumeSectionId ?? sessionState.session.currentSectionId,
    currentSegmentId: resumeSegmentId,
    currentStep:
      sessionState.continuity.resumeStep ?? sessionState.session.currentStep,
    explanationHistory: sessionState.handoffSnapshot?.explanationHistory ?? [],
    masterySnapshot: sessionState.continuity.masterySnapshot,
    resumeNotes:
      sessionState.continuity.resumeNotes ??
      (sessionState.continuity.resumeSegmentTitle === null
        ? null
        : `Resume from ${sessionState.continuity.resumeSegmentTitle} after the last saved checkpoint.`),
    unresolvedAtuIds: sessionState.summary.unresolvedAtuIds,
  };
}

function readSessionIdFromUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const sessionId = new URL(window.location.href).searchParams.get('sessionId');
  return sessionId === null || sessionId.trim().length === 0 ? null : sessionId;
}

function writeSessionIdToUrl(sessionId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set('sessionId', sessionId);
  window.history.replaceState({}, '', url.toString());
}

function humanizeValue(value: string): string {
  return value.replace(/_/g, ' ');
}

function formatDateTime(value: string | null): string {
  if (value === null) {
    return 'No interruption saved';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while contacting the tutoring API.';
}
