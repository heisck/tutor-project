import { randomUUID } from 'node:crypto';

import { createPrismaClient } from '@ai-tutor-pwa/db';
import {
  SESSION_PATHS,
  TUTOR_PATHS,
  type MiniCalibrationInput,
  type StudySessionLifecycleResponse,
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
import { createDocumentWithKnowledgeGraph } from './fixtures/knowledge-graph.js';
import { createApiTestEnv } from './test-env.js';
import { createNoopDocumentProcessingQueue } from './test-doubles.js';
import { buildInjectHeaders, createInjectAuthSession } from './auth-test-helpers.js';

const baseEnv = createApiTestEnv();
const prismaClient = createPrismaClient({
  DATABASE_URL: baseEnv.DATABASE_URL,
});
const redisClient = createRedisClient(baseEnv);
const testEmailPrefix = `tutor-runtime-guardrails-test-${randomUUID()}`;

let app: Awaited<ReturnType<typeof buildApp>>;
let rateLimitKeyPrefix: string;

beforeAll(async () => {
  await redisClient.ping();
});

afterAll(async () => {
  await closeRedisClient(redisClient);
  await prismaClient.$disconnect();
});

beforeEach(async () => {
  rateLimitKeyPrefix = `rate-limit:tutor-runtime-guardrails:${randomUUID()}`;
  app = await buildApp({
    documentProcessingQueue: createNoopDocumentProcessingQueue(),
    env: createApiTestEnv(),
    prismaClient,
    rateLimitKeyPrefix,
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

describe('tutor runtime guardrails', () => {
  it('records runtime usage for tutor streaming, evaluation, and assistant answers', async () => {
    const owner = await signUpAndAuthenticate('usage-owner');
    const document = await createOwnedSessionDocument(owner.userId, 'usage-owner.pdf');
    const startedSession = await startStudySession(owner, document.id);

    const streamResponse = await app.inject({
      headers: buildInjectHeaders(owner),
      method: 'POST',
      payload: {
        sessionId: startedSession.session.id,
      },
      url: TUTOR_PATHS.next,
    });

    expect(streamResponse.statusCode).toBe(200);

    const evaluationResponse = await app.inject({
      headers: buildInjectHeaders(owner),
      method: 'POST',
      payload: {
        content:
          'Cells matter because every organism depends on them as the basic living unit.',
        segmentId: startedSession.session.currentSegmentId,
        sessionId: startedSession.session.id,
      },
      url: TUTOR_PATHS.evaluate,
    });

    expect(evaluationResponse.statusCode).toBe(200);

    const questionResponse = await app.inject({
      headers: buildInjectHeaders(owner),
      method: 'POST',
      payload: {
        question: 'Why are cells the basic unit of life?',
        sessionId: startedSession.session.id,
      },
      url: TUTOR_PATHS.question,
    });

    expect(questionResponse.statusCode).toBe(200);

    const usageLogs = await prismaClient.aiRuntimeUsage.findMany({
      orderBy: {
        createdAt: 'asc',
      },
      where: {
        studySessionId: startedSession.session.id,
      },
    });

    expect(usageLogs).toHaveLength(3);
    expect(usageLogs.map((entry) => entry.route)).toEqual([
      'tutor_next',
      'tutor_evaluate',
      'assistant_question',
    ]);
    expect(usageLogs.map((entry) => entry.outcome)).toEqual([
      'streamed',
      'checked',
      'answered',
    ]);
    expect(usageLogs.every((entry) => entry.userId === owner.userId)).toBe(true);
    expect(
      usageLogs.every((entry) => entry.studySessionId === startedSession.session.id),
    ).toBe(true);
    expect(usageLogs.every((entry) => entry.documentId === document.id)).toBe(true);
    expect(usageLogs.every((entry) => entry.providerCallCount === 0)).toBe(true);
    expect(usageLogs[0]?.inputTokenCount).toBe(0);
    expect(usageLogs[0]?.outputTokenCount).toBeGreaterThan(0);
    expect(usageLogs[1]?.inputTokenCount).toBeGreaterThan(0);
    expect(usageLogs[1]?.outputTokenCount).toBeGreaterThan(0);
    expect(usageLogs[2]?.inputTokenCount).toBeGreaterThan(0);
    expect(usageLogs[2]?.outputTokenCount).toBeGreaterThan(0);
  });

  it('shares the 60 requests per minute tutor runtime limit across next and evaluate', async () => {
    const owner = await signUpAndAuthenticate('tutor-rate-limit');
    const document = await createOwnedSessionDocument(owner.userId, 'tutor-rate-limit.pdf');
    const startedSession = await startStudySession(owner, document.id);
    const rateLimitKey = `${rateLimitKeyPrefix}:tutor-runtime:${owner.userId}`;

    await redisClient.set(rateLimitKey, '59');
    await redisClient.expire(rateLimitKey, 60);

    const streamResponse = await app.inject({
      headers: buildInjectHeaders(owner),
      method: 'POST',
      payload: {
        sessionId: startedSession.session.id,
      },
      url: TUTOR_PATHS.next,
    });

    expect(streamResponse.statusCode).toBe(200);

    const limitedEvaluationResponse = await app.inject({
      headers: buildInjectHeaders(owner),
      method: 'POST',
      payload: {
        content:
          'Cells matter because every organism depends on them as the basic living unit.',
        segmentId: startedSession.session.currentSegmentId,
        sessionId: startedSession.session.id,
      },
      url: TUTOR_PATHS.evaluate,
    });

    expect(limitedEvaluationResponse.statusCode).toBe(429);
    expect(parseJson<{ message: string }>(limitedEvaluationResponse.body)).toEqual({
      message: 'Too many requests',
    });

    const usageLogs = await prismaClient.aiRuntimeUsage.findMany({
      where: {
        studySessionId: startedSession.session.id,
      },
    });

    expect(usageLogs).toHaveLength(1);
    expect(usageLogs[0]?.route).toBe('tutor_next');
  });

  it('rejects cross-user evaluation access before recording runtime usage', async () => {
    const owner = await signUpAndAuthenticate('cross-user-owner');
    const intruder = await signUpAndAuthenticate('cross-user-intruder');
    const document = await createOwnedSessionDocument(owner.userId, 'cross-user-private.pdf');
    const startedSession = await startStudySession(owner, document.id);

    const response = await app.inject({
      headers: buildInjectHeaders(intruder),
      method: 'POST',
      payload: {
        content:
          'Cells matter because every organism depends on them as the basic living unit.',
        segmentId: startedSession.session.currentSegmentId,
        sessionId: startedSession.session.id,
      },
      url: TUTOR_PATHS.evaluate,
    });

    expect(response.statusCode).toBe(404);
    expect(parseJson<{ message: string }>(response.body)).toEqual({
      message: 'Study session not found',
    });

    const usageLogs = await prismaClient.aiRuntimeUsage.findMany({
      where: {
        studySessionId: startedSession.session.id,
      },
    });

    expect(usageLogs).toHaveLength(0);
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

function parseJson<T>(body: string): T {
  return JSON.parse(body) as T;
}

async function signUpAndAuthenticate(label: string): Promise<{
  cookie: string;
  csrfToken: string;
  userId: string;
}> {
  return createInjectAuthSession(app, {
    email: `${testEmailPrefix}-${label}@example.com`,
    password: 'password123',
  });
}

async function startStudySession(
  auth: { cookie: string; csrfToken: string },
  documentId: string,
): Promise<StudySessionLifecycleResponse> {
  const response = await app.inject({
    headers: buildInjectHeaders(auth),
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
