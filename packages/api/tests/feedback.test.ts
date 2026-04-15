import { randomUUID } from 'node:crypto';

import { createPrismaClient } from '@ai-tutor-pwa/db';
import {
  FEEDBACK_PATHS,
  SESSION_PATHS,
  type FeedbackSubmissionResponse,
  type MiniCalibrationInput,
  type StudySessionLifecycleResponse,
  type StudySessionStateResponse,
} from '@ai-tutor-pwa/shared';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

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
const testEmailPrefix = `feedback-test-${randomUUID()}`;

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
    rateLimitKeyPrefix: `rate-limit:feedback-test:${randomUUID()}`,
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

describe('feedback route', () => {
  it('persists tutor explanation feedback with ownership-safe tutoring context linkage', async () => {
    const owner = await signUpAndAuthenticate('owner');
    const document = await createOwnedSessionDocument(owner.userId, 'feedback-owner.pdf');
    const startedSession = await startStudySession(owner, document.id);
    const sessionState = await readSessionState(owner.cookie, startedSession.session.id);
    const currentSegment = sessionState.teachingPlan.segments[0]!;

    const response = await app.inject({
      headers: buildInjectHeaders(owner),
      method: 'POST',
      payload: {
        contentType: 'tutor_explanation',
        lessonSegmentId: currentSegment.id,
        messageId: 'message-1',
        reason: 'poor_explanation',
        sessionId: startedSession.session.id,
      },
      url: FEEDBACK_PATHS.submit,
    });

    expect(response.statusCode).toBe(201);

    const body = parseJson<FeedbackSubmissionResponse>(response.body);

    expect(body.feedback.contentType).toBe('tutor_explanation');
    expect(body.feedback.reason).toBe('poor_explanation');
    expect(body.feedback.sessionId).toBe(startedSession.session.id);
    expect(body.feedback.lessonSegmentId).toBe(currentSegment.id);
    expect(body.threshold.requiresReview).toBe(false);
    expect(body.threshold.status).toBe('recorded');

    const storedFeedback = await prismaClient.userFeedback.findUnique({
      where: {
        id: body.feedback.id,
      },
    });

    expect(storedFeedback?.userId).toBe(owner.userId);
    expect(storedFeedback?.documentId).toBe(document.id);
    expect(storedFeedback?.conceptId).toBe(currentSegment.conceptId);
  });

  it('creates a threshold alert after repeated hallucination feedback for the same tutoring scope', async () => {
    const owner = await signUpAndAuthenticate('threshold');
    const document = await createOwnedSessionDocument(owner.userId, 'feedback-threshold.pdf');
    const startedSession = await startStudySession(owner, document.id);
    const sessionState = await readSessionState(owner.cookie, startedSession.session.id);
    const currentSegment = sessionState.teachingPlan.segments[0]!;

    let finalBody: FeedbackSubmissionResponse | null = null;

    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await app.inject({
        headers: buildInjectHeaders(owner),
        method: 'POST',
        payload: {
          contentType: 'assistant_answer',
          lessonSegmentId: currentSegment.id,
          messageId: null,
          reason: 'hallucination',
          sessionId: startedSession.session.id,
        },
        url: FEEDBACK_PATHS.submit,
      });

      expect(response.statusCode).toBe(201);
      finalBody = parseJson<FeedbackSubmissionResponse>(response.body);
    }

    expect(finalBody).not.toBeNull();
    expect(finalBody?.threshold.requiresReview).toBe(true);
    expect(finalBody?.threshold.status).toBe('threshold_triggered');
    expect(finalBody?.threshold.feedbackCount).toBe(4);

    const alert = await prismaClient.feedbackAlert.findUnique({
      where: {
        scopeKey: `assistant_answer:${currentSegment.conceptId}`,
      },
    });

    expect(alert).not.toBeNull();
    expect(alert?.feedbackCount).toBe(4);
    expect(alert?.threshold).toBe(4);
  });

  it('rejects cross-user feedback submission without leaking tutoring context', async () => {
    const owner = await signUpAndAuthenticate('cross-owner');
    const intruder = await signUpAndAuthenticate('cross-intruder');
    const document = await createOwnedSessionDocument(owner.userId, 'feedback-private.pdf');
    const startedSession = await startStudySession(owner, document.id);
    const sessionState = await readSessionState(owner.cookie, startedSession.session.id);
    const currentSegment = sessionState.teachingPlan.segments[0]!;

    const response = await app.inject({
      headers: buildInjectHeaders(intruder),
      method: 'POST',
      payload: {
        contentType: 'tutor_explanation',
        lessonSegmentId: currentSegment.id,
        messageId: 'message-1',
        reason: 'hallucination',
        sessionId: startedSession.session.id,
      },
      url: FEEDBACK_PATHS.submit,
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

function parseJson<T>(body: string): T {
  return JSON.parse(body) as T;
}

async function readSessionState(
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
