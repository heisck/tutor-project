import { randomUUID } from 'node:crypto';

import { createPrismaClient } from '@ai-tutor-pwa/db';
import {
  AUTH_PATHS,
  SESSION_PATHS,
  TUTOR_PATHS,
  type AuthSessionResponse,
  type SessionHandoffSnapshotInput,
  type StudySessionLifecycleResponse,
  type StudySessionStateResponse,
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
const testEmailPrefix = `session-state-test-${randomUUID()}`;

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
    rateLimitKeyPrefix: `rate-limit:session-state-test:${randomUUID()}`,
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

describe('session state route', () => {
  it(
    'returns an owner-only session state projection that stays consistent across lifecycle transitions',
    async () => {
      const account = await signUpAndAuthenticate('owner');
      const document = await createOwnedSessionDocument(
        account.userId,
        'owner-state.pdf',
      );
      const startedSession = await startStudySession(account.cookie, document.id);

      const startedState = await readSessionState(
        account.cookie,
        startedSession.session.id,
      );

      expect(startedState.session.status).toBe('active');
      expect(startedState.learningProfile).toMatchObject(
        createMiniCalibrationInput(),
      );
      expect(startedState.continuity).toMatchObject({
        hasInterruptedState: false,
        isResumable: false,
        resumeSegmentTitle: 'Cells',
      });
      expect(startedState.summary.coverageSummary).toEqual({
        assessed: 0,
        inProgress: 0,
        notTaught: 2,
        taught: 0,
      });
      expect(startedState.summary.unresolvedAtuIds).toHaveLength(2);
      expect(startedState.teachingPlan.segments).toHaveLength(2);
      expect(startedState.handoffSnapshot).toBeNull();

      const resumedSegment = startedState.teachingPlan.segments[1]!;
      const handoff = createHandoffInput(resumedSegment);

      const pauseResponse = await app.inject({
        headers: {
          cookie: account.cookie,
          origin: 'http://localhost:3000',
        },
        method: 'POST',
        payload: {
          handoff,
        },
        url: SESSION_PATHS.pause(startedSession.session.id),
      });

      expect(pauseResponse.statusCode).toBe(200);

      const pausedState = await readSessionState(
        account.cookie,
        startedSession.session.id,
      );

      expect(pausedState.session.status).toBe('paused');
      expect(pausedState.handoffSnapshot).toMatchObject(handoff);
      expect(pausedState.continuity).toMatchObject({
        hasInterruptedState: true,
        isResumable: true,
        resumeNotes: handoff.resumeNotes,
        resumeSegmentId: resumedSegment.id,
        resumeSegmentTitle: resumedSegment.conceptTitle,
        resumeStep: 3,
      });

      const resumeResponse = await app.inject({
        headers: {
          cookie: account.cookie,
          origin: 'http://localhost:3000',
        },
        method: 'POST',
        url: SESSION_PATHS.resume(startedSession.session.id),
      });

      expect(resumeResponse.statusCode).toBe(200);

      const resumedState = await readSessionState(
        account.cookie,
        startedSession.session.id,
      );

      expect(resumedState.session.status).toBe('active');
      expect(resumedState.session.currentSegmentId).toBe(resumedSegment.id);
      expect(resumedState.session.currentSectionId).toBe(resumedSegment.sectionId);
      expect(resumedState.session.currentStep).toBe(3);
      expect(resumedState.handoffSnapshot).toMatchObject(handoff);
      expect(resumedState.continuity).toMatchObject({
        hasInterruptedState: true,
        isResumable: false,
        resumeSegmentId: resumedSegment.id,
        resumeSegmentTitle: resumedSegment.conceptTitle,
        resumeStep: 3,
      });
      expect(resumedState.teachingPlan.currentSegmentId).toBe(resumedSegment.id);
      expect(resumedState.teachingPlan.segments).toEqual(
        startedState.teachingPlan.segments,
      );
    },
    15_000,
  );

  it('rejects cross-user session state reads without leaking metadata', async () => {
    const owner = await signUpAndAuthenticate('state-owner');
    const intruder = await signUpAndAuthenticate('state-intruder');
    const document = await createOwnedSessionDocument(
      owner.userId,
      'state-owner.pdf',
    );
    const startedSession = await startStudySession(owner.cookie, document.id);

    const response = await app.inject({
      headers: {
        cookie: intruder.cookie,
      },
      method: 'GET',
      url: SESSION_PATHS.state(startedSession.session.id),
    });

    expect(response.statusCode).toBe(404);
    expect(parseJson<{ message: string }>(response.body)).toEqual({
      message: 'Study session not found',
    });
  });

  it('persists mastery-backed summary data after learner evaluation', async () => {
    const account = await signUpAndAuthenticate('evaluation-owner');
    const document = await createOwnedSessionDocument(
      account.userId,
      'evaluation-owner.pdf',
    );
    const startedSession = await startStudySession(account.cookie, document.id);
    const startedState = await readSessionState(
      account.cookie,
      startedSession.session.id,
    );
    const currentSegment = startedState.teachingPlan.segments[0]!;

    const evaluationResponse = await app.inject({
      headers: {
        cookie: account.cookie,
        origin: 'http://localhost:3000',
      },
      method: 'POST',
      payload: {
        content:
          'Cells organize life because they package the structures needed to grow and reproduce.',
        segmentId: currentSegment.id,
        sessionId: startedSession.session.id,
      },
      url: TUTOR_PATHS.evaluate,
    });

    expect(evaluationResponse.statusCode).toBe(200);

    const evaluatedState = await readSessionState(
      account.cookie,
      startedSession.session.id,
    );

    expect(evaluatedState.handoffSnapshot?.masterySnapshot).toEqual([
      {
        conceptId: currentSegment.conceptId,
        confusionScore: 0.1,
        evidenceCount: 1,
        status: 'checked',
      },
    ]);
    expect(evaluatedState.continuity.masterySnapshot).toEqual(
      evaluatedState.handoffSnapshot?.masterySnapshot,
    );
    expect(evaluatedState.summary.coverageSummary).toEqual({
      assessed: 0,
      inProgress: 1,
      notTaught: 1,
      taught: 0,
    });
    expect(evaluatedState.summary.unresolvedAtuIds).toEqual(
      expect.arrayContaining(currentSegment.atuIds),
    );
  });
});

function createHandoffInput(
  segment: StudySessionStateResponse['teachingPlan']['segments'][number],
): SessionHandoffSnapshotInput {
  return {
    currentSectionId: segment.sectionId,
    currentSegmentId: segment.id,
    currentStep: 3,
    explanationHistory: [
      {
        conceptId: segment.conceptId,
        explanationType: 'analogy',
        outcome: 'successful',
        usedAt: new Date().toISOString(),
      },
    ],
    masterySnapshot: [
      {
        conceptId: segment.conceptId,
        confusionScore: 0.25,
        evidenceCount: 1,
        status: 'partial',
      },
    ],
    resumeNotes: 'Resume from the concept that needs reinforcement',
    unresolvedAtuIds: [segment.atuIds[0]!],
  };
}

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

function createMiniCalibrationInput() {
  return {
    academicLevel: 'undergraduate',
    explanationStartPreference: 'example_first',
    sessionGoal: 'deep_understanding',
  } as const;
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
