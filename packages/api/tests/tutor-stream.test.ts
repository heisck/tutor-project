import { randomUUID } from 'node:crypto';

import { createPrismaClient } from '@ai-tutor-pwa/db';
import {
  AUTH_PATHS,
  SESSION_PATHS,
  TUTOR_PATHS,
  tutorStreamEventSchema,
  type AuthSessionResponse,
  type MiniCalibrationInput,
  type StudySessionLifecycleResponse,
  type TutorStreamEvent,
} from '@ai-tutor-pwa/shared';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { closeRedisClient, createRedisClient } from '../src/lib/redis.js';
import { createDocumentWithKnowledgeGraph } from './fixtures/knowledge-graph.js';
import { createApiTestEnv } from './test-env.js';
import { createNoopDocumentProcessingQueue } from './test-doubles.js';

const baseEnv = createApiTestEnv();
const prismaClient = createPrismaClient({
  DATABASE_URL: baseEnv.DATABASE_URL,
});
const redisClient = createRedisClient(baseEnv);
const testEmailPrefix = `tutor-stream-test-${randomUUID()}`;

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
    rateLimitKeyPrefix: `rate-limit:tutor-stream-test:${randomUUID()}`,
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

describe('tutor stream route', () => {
  it('streams owner-scoped tutor events in order and closes cleanly', async () => {
    const owner = await signUpAndAuthenticate('owner');
    const document = await createOwnedSessionDocument(owner.userId, 'owner.pdf');
    const startedSession = await startStudySession(owner.cookie, document.id);

    const response = await app.inject({
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

    expect(response.statusCode).toBe(200);
    expect(String(response.headers['content-type'])).toContain(
      'text/event-stream',
    );

    const events = parseTutorStreamEvents(response.body);

    expect(events.map((event) => event.type)).toEqual([
      'control',
      'progress',
      'message',
      'completion',
    ]);
    expect(events.map((event) => event.sequence)).toEqual([1, 2, 3, 4]);
    expect(events[0]).toMatchObject({
      data: {
        action: 'stream_open',
        sessionId: startedSession.session.id,
      },
      type: 'control',
    });
    expect(events[1]).toMatchObject({
      data: {
        currentSegmentId: startedSession.session.currentSegmentId,
        sessionId: startedSession.session.id,
        stage: 'segment_ready',
      },
      type: 'progress',
    });
    expect(events[2]).toMatchObject({
      data: {
        format: 'markdown',
        role: 'tutor',
        segmentId: startedSession.session.currentSegmentId,
      },
      type: 'message',
    });
    const messageEvent = events[2]!;
    expect(messageEvent.type).toBe('message');
    if (messageEvent.type === 'message') {
      expect(messageEvent.data.content).toContain("Let's begin with");
    }
    expect(events[3]).toMatchObject({
      data: {
        currentSegmentId: startedSession.session.currentSegmentId,
        deliveredEventCount: 4,
        reason: 'await_learner_response',
        sessionId: startedSession.session.id,
      },
      type: 'completion',
    });
  });

  it('rejects unauthenticated tutor stream access', async () => {
    const response = await app.inject({
      headers: {
        origin: 'http://localhost:3000',
      },
      method: 'POST',
      payload: {
        sessionId: 'session-id',
      },
      url: TUTOR_PATHS.next,
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects cross-user tutor stream access without leaking session metadata', async () => {
    const owner = await signUpAndAuthenticate('cross-owner');
    const intruder = await signUpAndAuthenticate('cross-intruder');
    const document = await createOwnedSessionDocument(owner.userId, 'cross.pdf');
    const startedSession = await startStudySession(owner.cookie, document.id);

    const response = await app.inject({
      headers: {
        cookie: intruder.cookie,
        origin: 'http://localhost:3000',
      },
      method: 'POST',
      payload: {
        sessionId: startedSession.session.id,
      },
      url: TUTOR_PATHS.next,
    });

    expect(response.statusCode).toBe(404);
    expect(parseJson<{ message: string }>(response.body)).toEqual({
      message: 'Study session not found',
    });
  });
});

async function createOwnedSessionDocument(userId: string, title: string) {
  const { document } = await createDocumentWithKnowledgeGraph(prismaClient, {
    concepts: [
      {
        description: 'What a cell is and why it matters',
        sectionContent:
          'Cells are the basic unit of life and every organism depends on them.',
        title: 'Cells',
      },
      {
        description: 'How cells divide',
        prerequisiteTitles: ['Cells'],
        sectionContent:
          'Mitosis explains how one cell divides into two similar cells.',
        title: 'Mitosis',
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
