import { randomUUID } from 'node:crypto';

import { createPrismaClient } from '@ai-tutor-pwa/db';
import {
  AUTH_PATHS,
  SESSION_PATHS,
  TUTOR_PATHS,
  type AuthSessionResponse,
  type MiniCalibrationInput,
  type StudySessionLifecycleResponse,
  type TutorAssistantQuestionResponse,
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
const testEmailPrefix = `tutor-assistant-test-${randomUUID()}`;

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
    rateLimitKeyPrefix: `rate-limit:tutor-assistant-test:${randomUUID()}`,
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

describe('tutor assistant route', () => {
  it('returns an owner-scoped grounded answer for an active study session', async () => {
    const owner = await signUpAndAuthenticate('owner');
    const document = await createOwnedSessionDocument(owner.userId, 'cells-owner.pdf');
    const startedSession = await startStudySession(owner.cookie, document.id);

    const response = await app.inject({
      headers: {
        cookie: owner.cookie,
        origin: 'http://localhost:3000',
      },
      method: 'POST',
      payload: {
        question: 'Why are cells the basic unit of life?',
        sessionId: startedSession.session.id,
      },
      url: TUTOR_PATHS.question,
    });

    expect(response.statusCode).toBe(200);

    const body = parseJson<TutorAssistantQuestionResponse>(response.body);

    expect(body.outcome).toBe('answered');
    expect(body.currentSegmentId).toBe(startedSession.session.currentSegmentId);
    expect(body.documentId).toBe(document.id);
    expect(body.groundedEvidence.length).toBeGreaterThan(0);
    expect(body.groundedEvidence[0]?.content).toContain('basic unit of life');
    expect(body.answer).toContain("Based on your document's Cells material");
    expect(body.understandingCheck).toContain('Cells');
  });

  it('returns a weak-grounding response when only partial evidence matches the question', async () => {
    const owner = await signUpAndAuthenticate('weak-grounding');
    const document = await createOwnedSessionDocument(owner.userId, 'cells-weak.pdf');
    const startedSession = await startStudySession(owner.cookie, document.id);

    const response = await app.inject({
      headers: {
        cookie: owner.cookie,
        origin: 'http://localhost:3000',
      },
      method: 'POST',
      payload: {
        question: 'How do cells grow?',
        sessionId: startedSession.session.id,
      },
      url: TUTOR_PATHS.question,
    });

    expect(response.statusCode).toBe(200);

    const body = parseJson<TutorAssistantQuestionResponse>(response.body);

    expect(body.outcome).toBe('weak_grounding');
    expect(body.groundedEvidence.length).toBeGreaterThan(0);
    expect(body.answer).toContain('partial support');
    expect(body.understandingCheck).not.toBeNull();
  });

  it('refuses cross-document questions instead of pulling chunks from another document', async () => {
    const owner = await signUpAndAuthenticate('cross-document');
    const sessionDocument = await createOwnedSessionDocument(
      owner.userId,
      'biology-only.pdf',
    );
    await createDocumentWithKnowledgeGraph(prismaClient, {
      concepts: [
        {
          description: 'How gravity pulls matter together',
          sectionContent:
            'Gravity pulls objects together because mass curves spacetime.',
          title: 'Gravity',
        },
      ],
      title: 'physics-other.pdf',
      userId: owner.userId,
    });
    const startedSession = await startStudySession(owner.cookie, sessionDocument.id);

    const response = await app.inject({
      headers: {
        cookie: owner.cookie,
        origin: 'http://localhost:3000',
      },
      method: 'POST',
      payload: {
        question: 'How does gravity pull objects together?',
        sessionId: startedSession.session.id,
      },
      url: TUTOR_PATHS.question,
    });

    expect(response.statusCode).toBe(200);

    const body = parseJson<TutorAssistantQuestionResponse>(response.body);

    expect(body.outcome).toBe('refused');
    expect(body.documentId).toBe(sessionDocument.id);
    expect(body.groundedEvidence).toEqual([]);
  });

  it('rejects cross-user assistant access without leaking session metadata', async () => {
    const owner = await signUpAndAuthenticate('cross-owner');
    const intruder = await signUpAndAuthenticate('cross-intruder');
    const document = await createOwnedSessionDocument(owner.userId, 'owner-private.pdf');
    const startedSession = await startStudySession(owner.cookie, document.id);

    const response = await app.inject({
      headers: {
        cookie: intruder.cookie,
        origin: 'http://localhost:3000',
      },
      method: 'POST',
      payload: {
        question: 'Why are cells important?',
        sessionId: startedSession.session.id,
      },
      url: TUTOR_PATHS.question,
    });

    expect(response.statusCode).toBe(404);
    expect(parseJson<{ message: string }>(response.body)).toEqual({
      message: 'Study session not found',
    });
  });

  it('rate limits repeated assistant questions per authenticated user', async () => {
    const owner = await signUpAndAuthenticate('rate-limit');
    const document = await createOwnedSessionDocument(owner.userId, 'rate-limit.pdf');
    const startedSession = await startStudySession(owner.cookie, document.id);

    for (let attempt = 0; attempt < 30; attempt++) {
      const response = await app.inject({
        headers: {
          cookie: owner.cookie,
          origin: 'http://localhost:3000',
        },
        method: 'POST',
        payload: {
          question: 'Why are cells important to life?',
          sessionId: startedSession.session.id,
        },
        url: TUTOR_PATHS.question,
      });

      expect(response.statusCode).toBe(200);
    }

    const limitedResponse = await app.inject({
      headers: {
        cookie: owner.cookie,
        origin: 'http://localhost:3000',
      },
      method: 'POST',
      payload: {
        question: 'Why are cells important to life?',
        sessionId: startedSession.session.id,
      },
      url: TUTOR_PATHS.question,
    });

    expect(limitedResponse.statusCode).toBe(429);
    expect(parseJson<{ message: string }>(limitedResponse.body)).toEqual({
      message: 'Too many requests',
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
