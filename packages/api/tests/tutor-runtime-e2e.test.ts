import { randomUUID } from 'node:crypto';

import {
  StudySessionStatus as PrismaStudySessionStatus,
  createPrismaClient,
} from '@ai-tutor-pwa/db';
import {
  AUTH_PATHS,
  SESSION_PATHS,
  TUTOR_PATHS,
  tutorStreamEventSchema,
  type AuthSessionResponse,
  type MiniCalibrationInput,
  type StudySessionLifecycleResponse,
  type StudySessionStateResponse,
  type TutorAssistantQuestionResponse,
  type TutorStreamEvent,
} from '@ai-tutor-pwa/shared';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { buildApp } from '../src/app.js';
import { closeRedisClient, createRedisClient } from '../src/lib/redis.js';
import { transitionOwnedStudySession } from '../src/sessions/service.js';
import { createDocumentWithKnowledgeGraph } from './fixtures/knowledge-graph.js';
import { createApiTestEnv } from './test-env.js';
import { createNoopDocumentProcessingQueue } from './test-doubles.js';

const baseEnv = createApiTestEnv();
const prismaClient = createPrismaClient({
  DATABASE_URL: baseEnv.DATABASE_URL,
});
const redisClient = createRedisClient(baseEnv);
const testEmailPrefix = `tutor-runtime-e2e-${randomUUID()}`;

let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  await redisClient.ping();
});

afterAll(async () => {
  await closeRedisClient(redisClient);
  await prismaClient.$disconnect();
});

beforeEach(async () => {
  app = await buildApp({
    documentProcessingQueue: createNoopDocumentProcessingQueue(),
    env: createApiTestEnv(),
    prismaClient,
    rateLimitKeyPrefix: `rate-limit:tutor-runtime-e2e:${randomUUID()}`,
    redisClient,
  });
  await app.ready();
});

afterEach(async () => {
  await app.close();
  await prismaClient.user.deleteMany({
    where: {
      email: {
        startsWith: testEmailPrefix,
      },
    },
  });
});

describe('tutor runtime end-to-end verification', () => {
  it(
    'verifies the owner-scoped tutoring journey from processed document to completed session state',
    async () => {
      const owner = await signUpAndAuthenticate('owner');
      const intruder = await signUpAndAuthenticate('intruder');
      const document = await createOwnedSessionDocument(owner.userId, 'forces.pdf');
      const startedSession = await startStudySession(owner.cookie, document.id);

      const initialState = await fetchSessionState(owner.cookie, startedSession.session.id);
      expect(initialState.session.status).toBe('active');
      expect(initialState.summary.canComplete).toBe(false);
      expect(initialState.summary.unresolvedAtuIds).toHaveLength(1);

      const intruderStateResponse = await app.inject({
        headers: {
          cookie: intruder.cookie,
        },
        method: 'GET',
        url: SESSION_PATHS.state(startedSession.session.id),
      });

      expect(intruderStateResponse.statusCode).toBe(404);
      expect(parseJson<{ message: string }>(intruderStateResponse.body)).toEqual({
        message: 'Study session not found',
      });

      const firstStreamEvents = await fetchTutorStream(owner.cookie, startedSession.session.id);
      expect(firstStreamEvents.map((event) => event.type)).toEqual([
        'control',
        'progress',
        'message',
        'completion',
      ]);

      const firstMessageEvent = firstStreamEvents[2];
      expect(firstMessageEvent?.type).toBe('message');

      const assistantResponse = await askAssistant(
        owner.cookie,
        startedSession.session.id,
        'Why does force change when mass changes?',
      );
      expect(assistantResponse.outcome).toBe('answered');
      expect(assistantResponse.groundedEvidence.length).toBeGreaterThan(0);

      const firstEvaluation = await submitLearnerResponse(
        owner.cookie,
        startedSession.session.id,
        startedSession.session.currentSegmentId!,
        'Force must increase when mass increases because more inertia has to be overcome for the same acceleration.',
      );
      expect(firstEvaluation.mastery.previousStatus).toBe('taught');
      expect(firstEvaluation.mastery.status).toBe('checked');
      const stateBeforePause = await fetchSessionState(
        owner.cookie,
        startedSession.session.id,
      );

      const pauseResponse = await app.inject({
        headers: {
          cookie: owner.cookie,
          origin: 'http://localhost:3000',
        },
        method: 'POST',
        payload: {
          handoff: buildPauseHandoff(stateBeforePause),
        },
        url: SESSION_PATHS.pause(startedSession.session.id),
      });

      expect(pauseResponse.statusCode).toBe(200);
      expect(
        parseJson<StudySessionLifecycleResponse>(pauseResponse.body).session.status,
      ).toBe('paused');

      const resumeResponse = await app.inject({
        headers: {
          cookie: owner.cookie,
          origin: 'http://localhost:3000',
        },
        method: 'POST',
        url: SESSION_PATHS.resume(startedSession.session.id),
      });

      expect(resumeResponse.statusCode).toBe(200);
      expect(
        parseJson<StudySessionLifecycleResponse>(resumeResponse.body).session.status,
      ).toBe('active');

      const resumedStreamEvents = await fetchTutorStream(
        owner.cookie,
        startedSession.session.id,
      );
      const resumedMessageEvent = resumedStreamEvents[2];

      expect(resumedMessageEvent?.type).toBe('message');
      if (
        firstMessageEvent?.type === 'message' &&
        resumedMessageEvent?.type === 'message'
      ) {
        expect(resumedMessageEvent.data.messageId).toBe(
          firstMessageEvent.data.messageId,
        );
      }

      const secondEvaluation = await submitLearnerResponse(
        owner.cookie,
        startedSession.session.id,
        startedSession.session.currentSegmentId!,
        'In a new example, a heavier cart needs more force than a lighter cart to speed up at the same rate.',
      );
      expect(secondEvaluation.mastery.previousStatus).toBe('checked');
      expect(secondEvaluation.mastery.status).toBe('mastered');

      const readyState = await fetchSessionState(owner.cookie, startedSession.session.id);
      expect(readyState.summary.canComplete).toBe(true);
      expect(readyState.summary.completionBlockedReason).toBe(
        'All 1 concepts mastered',
      );
      expect(readyState.summary.masteredTopics).toEqual(['Forces']);
      expect(readyState.summary.readinessEstimate).toBe(
        'Strong understanding — ready for assessment',
      );
      expect(readyState.summary.unresolvedAtuIds).toEqual([]);

      const completedSession = await transitionOwnedStudySession(prismaClient, {
        nextStatus: PrismaStudySessionStatus.COMPLETED,
        sessionId: startedSession.session.id,
        userId: owner.userId,
      });

      expect(completedSession).not.toBeNull();

      const completedState = await fetchSessionState(
        owner.cookie,
        startedSession.session.id,
      );
      expect(completedState.session.status).toBe('completed');
      expect(completedState.summary.canComplete).toBe(true);

      const completedStreamResponse = await app.inject({
        headers: {
          cookie: owner.cookie,
          origin: 'http://localhost:3000',
        },
        method: 'POST',
        payload: {
          sessionId: startedSession.session.id,
        },
        url: TUTOR_PATHS.next,
      });

      expect(completedStreamResponse.statusCode).toBe(409);
      expect(parseJson<{ message: string }>(completedStreamResponse.body)).toEqual({
        message: 'Tutor streaming requires an active study session',
      });
    },
    20_000,
  );
});

async function askAssistant(
  cookie: string,
  sessionId: string,
  question: string,
): Promise<TutorAssistantQuestionResponse> {
  const response = await app.inject({
    headers: {
      cookie,
      origin: 'http://localhost:3000',
    },
    method: 'POST',
    payload: {
      question,
      sessionId,
    },
    url: TUTOR_PATHS.question,
  });

  expect(response.statusCode).toBe(200);

  return parseJson<TutorAssistantQuestionResponse>(response.body);
}

function buildPauseHandoff(
  state: StudySessionStateResponse,
): {
  currentSectionId: string | null;
  currentSegmentId: string;
  currentStep: number;
  explanationHistory: readonly unknown[];
  masterySnapshot: readonly unknown[];
  resumeNotes: string | null;
  unresolvedAtuIds: readonly string[];
} {
  return {
    currentSectionId:
      state.continuity.resumeSectionId ?? state.session.currentSectionId,
    currentSegmentId:
      state.continuity.resumeSegmentId ?? state.session.currentSegmentId!,
    currentStep: state.continuity.resumeStep ?? state.session.currentStep,
    explanationHistory: state.handoffSnapshot?.explanationHistory ?? [],
    masterySnapshot: state.continuity.masterySnapshot,
    resumeNotes: state.continuity.resumeNotes,
    unresolvedAtuIds: state.summary.unresolvedAtuIds,
  };
}

async function createOwnedSessionDocument(userId: string, title: string) {
  const { document } = await createDocumentWithKnowledgeGraph(prismaClient, {
    concepts: [
      {
        description: 'How force relates to mass and acceleration',
        sectionContent:
          'Force changes when mass or acceleration changes. More mass needs more force to produce the same acceleration.',
        title: 'Forces',
      },
    ],
    title,
    userId,
  });

  return document;
}

function createMiniCalibrationInput(): MiniCalibrationInput {
  return {
    academicLevel: 'undergraduate',
    explanationStartPreference: 'example_first',
    sessionGoal: 'deep_understanding',
  };
}

function extractSessionCookie(
  setCookieHeader: string | readonly string[] | undefined,
): string {
  const rawCookie = Array.isArray(setCookieHeader)
    ? setCookieHeader.find((value) => value.startsWith('ai_tutor_pwa_session='))
    : setCookieHeader;

  if (rawCookie === undefined) {
    throw new Error('Expected an authenticated session cookie');
  }

  const [cookie] = rawCookie.split(';');

  if (cookie === undefined) {
    throw new Error('Expected a serializable session cookie');
  }

  return cookie;
}

async function fetchSessionState(
  cookie: string,
  sessionId: string,
): Promise<StudySessionStateResponse> {
  const response = await app.inject({
    headers: {
      cookie,
    },
    method: 'GET',
    url: SESSION_PATHS.state(sessionId),
  });

  expect(response.statusCode).toBe(200);

  return parseJson<StudySessionStateResponse>(response.body);
}

async function fetchTutorStream(
  cookie: string,
  sessionId: string,
): Promise<TutorStreamEvent[]> {
  const response = await app.inject({
    headers: {
      cookie,
      origin: 'http://localhost:3000',
    },
    method: 'POST',
    payload: {
      sessionId,
    },
    url: TUTOR_PATHS.next,
  });

  expect(response.statusCode).toBe(200);

  return parseTutorStreamEvents(response.body);
}

function parseJson<T>(body: string): T {
  return JSON.parse(body) as T;
}

function parseTutorStreamEvents(body: string): TutorStreamEvent[] {
  return body
    .trim()
    .split('\n\n')
    .filter((frame) => frame.length > 0)
    .map((frame) => {
      const lines = frame.split('\n');
      const dataLine = lines.find((line) => line.startsWith('data: '));

      if (dataLine === undefined) {
        throw new Error('Expected a data line in the SSE frame');
      }

      return tutorStreamEventSchema.parse(
        JSON.parse(dataLine.slice('data: '.length)),
      );
    });
}

async function signUpAndAuthenticate(label: string): Promise<{
  cookie: string;
  userId: string;
}> {
  const signupResponse = await app.inject({
    headers: {
      origin: 'http://localhost:3000',
    },
    method: 'POST',
    payload: {
      email: `${testEmailPrefix}-${label}@example.com`,
      password: 'password123',
    },
    url: AUTH_PATHS.signup,
  });

  expect(signupResponse.statusCode).toBe(201);

  const cookie = extractSessionCookie(signupResponse.headers['set-cookie']);
  const sessionResponse = await app.inject({
    headers: {
      cookie,
    },
    method: 'GET',
    url: AUTH_PATHS.session,
  });

  expect(sessionResponse.statusCode).toBe(200);

  const sessionBody = parseJson<AuthSessionResponse>(sessionResponse.body);

  return {
    cookie,
    userId: sessionBody.user.id,
  };
}

async function startStudySession(
  cookie: string,
  documentId: string,
): Promise<StudySessionLifecycleResponse> {
  const response = await app.inject({
    headers: {
      cookie,
      origin: 'http://localhost:3000',
    },
    method: 'POST',
    payload: {
      calibration: createMiniCalibrationInput(),
      documentId,
    },
    url: SESSION_PATHS.start,
  });

  expect(response.statusCode).toBe(201);

  return parseJson<StudySessionLifecycleResponse>(response.body);
}

async function submitLearnerResponse(
  cookie: string,
  sessionId: string,
  segmentId: string,
  content: string,
): Promise<{
  mastery: {
    previousStatus: string;
    status: string;
  };
}> {
  const response = await app.inject({
    headers: {
      cookie,
      origin: 'http://localhost:3000',
    },
    method: 'POST',
    payload: {
      content,
      segmentId,
      sessionId,
    },
    url: TUTOR_PATHS.evaluate,
  });

  expect(response.statusCode).toBe(200);

  return parseJson<{
    mastery: {
      previousStatus: string;
      status: string;
    };
  }>(response.body);
}
