import {
  sessionHandoffSnapshotInputSchema,
  type SessionHandoffSnapshotInput,
  type TutorStreamEvent,
} from '@ai-tutor-pwa/shared';

import {
  buildLearnerResponsePayload,
  buildStartSessionPayload,
  errorResponseSchema,
  FEEDBACK_PATHS,
  feedbackSubmissionFormSchema,
  feedbackSubmissionResponseSchema,
  learnerResponseFormSchema,
  sessionIdSchema,
  startSessionFormSchema,
  SESSION_PATHS,
  studySessionLifecycleResponseSchema,
  studySessionStateResponseSchema,
  TUTOR_PATHS,
  tutorAssistantQuestionFormSchema,
  tutorAssistantQuestionResponseSchema,
  tutorEvaluationResponseSchema,
  type FeedbackSubmissionResponseModel,
  type StartSessionForm,
  type TutorAssistantQuestionResponseModel,
  type StudySessionLifecycleResponseModel,
  type StudySessionStateResponseModel,
  type TutorEvaluationResponseModel,
} from './tutor-session-contracts';
import { consumeTutorEventStream } from './tutor-stream';

export class ApiClientError extends Error {
  public readonly status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
  }
}

export async function startStudySession(
  apiBaseUrl: string,
  form: StartSessionForm,
): Promise<StudySessionLifecycleResponseModel> {
  const parsedForm = startSessionFormSchema.parse(form);

  return requestJson(
    buildApiUrl(apiBaseUrl, SESSION_PATHS.start),
    {
      body: JSON.stringify(buildStartSessionPayload(parsedForm)),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
    studySessionLifecycleResponseSchema,
  );
}

export async function fetchStudySessionState(
  apiBaseUrl: string,
  sessionId: string,
): Promise<StudySessionStateResponseModel> {
  const parsedSessionId = sessionIdSchema.parse(sessionId);

  return requestJson(
    buildApiUrl(apiBaseUrl, SESSION_PATHS.state(parsedSessionId)),
    {
      method: 'GET',
    },
    studySessionStateResponseSchema,
  );
}

export async function pauseStudySession(
  apiBaseUrl: string,
  sessionId: string,
  handoff?: SessionHandoffSnapshotInput,
): Promise<StudySessionLifecycleResponseModel> {
  const parsedSessionId = sessionIdSchema.parse(sessionId);
  const parsedHandoff =
    handoff === undefined
      ? undefined
      : sessionHandoffSnapshotInputSchema.parse(handoff);

  return requestJson(
    buildApiUrl(apiBaseUrl, SESSION_PATHS.pause(parsedSessionId)),
    {
      body: JSON.stringify(
        parsedHandoff === undefined ? {} : { handoff: parsedHandoff },
      ),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
    studySessionLifecycleResponseSchema,
  );
}

export async function resumeStudySession(
  apiBaseUrl: string,
  sessionId: string,
): Promise<StudySessionLifecycleResponseModel> {
  const parsedSessionId = sessionIdSchema.parse(sessionId);

  return requestJson(
    buildApiUrl(apiBaseUrl, SESSION_PATHS.resume(parsedSessionId)),
    {
      method: 'POST',
    },
    studySessionLifecycleResponseSchema,
  );
}

export async function streamTutorSession(
  apiBaseUrl: string,
  sessionId: string,
  onEvent: (event: TutorStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const parsedSessionId = sessionIdSchema.parse(sessionId);
  const response = await fetch(buildApiUrl(apiBaseUrl, TUTOR_PATHS.next), {
    body: JSON.stringify({ sessionId: parsedSessionId }),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    ...(signal === undefined ? {} : { signal }),
  });

  if (!response.ok) {
    throw await toApiClientError(response);
  }

  await consumeTutorEventStream(response, onEvent, signal);
}

export async function submitLearnerResponse(
  apiBaseUrl: string,
  input: {
    content: string;
    segmentId: string;
    sessionId: string;
  },
): Promise<TutorEvaluationResponseModel> {
  const parsedForm = learnerResponseFormSchema.parse({
    content: input.content,
  });
  const payload = buildLearnerResponsePayload({
    content: parsedForm.content,
    segmentId: input.segmentId,
    sessionId: input.sessionId,
  });

  return requestJson(
    buildApiUrl(apiBaseUrl, TUTOR_PATHS.evaluate),
    {
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
    tutorEvaluationResponseSchema,
  );
}

export async function askTutorAssistant(
  apiBaseUrl: string,
  input: {
    question: string;
    sessionId: string;
  },
): Promise<TutorAssistantQuestionResponseModel> {
  const parsedSessionId = sessionIdSchema.parse(input.sessionId);
  const parsedForm = tutorAssistantQuestionFormSchema.parse({
    question: input.question,
  });

  return requestJson(
    buildApiUrl(apiBaseUrl, TUTOR_PATHS.question),
    {
      body: JSON.stringify({
        question: parsedForm.question,
        sessionId: parsedSessionId,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
    tutorAssistantQuestionResponseSchema,
  );
}

export async function submitFeedback(
  apiBaseUrl: string,
  input: {
    contentType: 'assistant_answer' | 'tutor_explanation';
    lessonSegmentId: string;
    messageId: string | null;
    reason: 'hallucination' | 'poor_explanation';
    sessionId: string;
  },
): Promise<FeedbackSubmissionResponseModel> {
  const payload = feedbackSubmissionFormSchema.parse(input);

  return requestJson(
    buildApiUrl(apiBaseUrl, FEEDBACK_PATHS.submit),
    {
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
    feedbackSubmissionResponseSchema,
  );
}

function buildApiUrl(apiBaseUrl: string, path: string): string {
  return new URL(path, apiBaseUrl).toString();
}

async function requestJson<T>(
  input: string,
  init: RequestInit,
  schema: {
    parse: (value: unknown) => T;
  },
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
  });

  if (!response.ok) {
    throw await toApiClientError(response);
  }

  const json = (await response.json()) as unknown;
  return schema.parse(json);
}

async function toApiClientError(response: Response): Promise<ApiClientError> {
  let message = `Request failed with status ${response.status}`;

  try {
    const payload = (await response.json()) as unknown;
    const parsedError = errorResponseSchema.safeParse(payload);

    if (parsedError.success) {
      message = parsedError.data.message;
    }
  } catch {
    // Ignore non-JSON error bodies and fall back to the status code.
  }

  return new ApiClientError(message, response.status);
}
